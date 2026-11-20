import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { SalesDiscoveryTicketOrmEntity } from '../../infrastructure/persistence/entities/sales-discovery-ticket.orm-entity';
import { BankTransactionOrmEntity } from '../../infrastructure/persistence/entities/bank-transaction.orm-entity';
import { VoucherOrmEntity } from '../../infrastructure/persistence/entities/voucher.orm-entity';
import { JournalEntryOrmEntity } from '../../infrastructure/persistence/entities/journal-entry.orm-entity';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { BankAccountOrmEntity } from '../../infrastructure/persistence/entities/bank-account.orm-entity';
import { ReconciliationService } from './reconciliation.service';
import { VoucherType, VoucherStatus, EntryType } from '@platform/shared-types';
import Decimal from 'decimal.js';

export interface ConvertTicketDto {
  targetType: 'ADVANCE_RECEIPT' | 'SALES_INVOICE';
  partyLedgerId: string;
  salesLedgerId?: string;
  narration?: string;
}

@Injectable()
export class SalesDiscoveryService {
  constructor(
    private readonly uow: UnitOfWorkService,
    private readonly reconService: ReconciliationService,
  ) {}

  async scanAndGenerateTickets(tenantId: string, bankAccountId?: string): Promise<{ createdCount: number }> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const qb = qr.manager
        .getRepository(BankTransactionOrmEntity)
        .createQueryBuilder('txn')
        .where('txn.tenant_id = :tenantId', { tenantId })
        .andWhere('txn.credit_amount > 0')
        .andWhere("txn.match_status = 'UNMATCHED'");

      if (bankAccountId) {
        qb.andWhere('txn.bank_account_id = :bankAccountId', { bankAccountId });
      }

      const unbilledCredits: BankTransactionOrmEntity[] = await qb.getMany();

      const existingTickets = await qr.manager.find(SalesDiscoveryTicketOrmEntity, {
        where: { tenantId },
        select: ['transactionId'],
      });
      const existingTxnIds = new Set(existingTickets.map((t: SalesDiscoveryTicketOrmEntity) => t.transactionId));

      let createdCount = 0;
      for (const txn of unbilledCredits) {
        if (existingTxnIds.has(txn.id)) continue;

        let classification = 'UNBILLED_SALES';
        const nar = (txn.narration || '').toUpperCase();
        if (nar.includes('ADV') || nar.includes('ADVANCE')) {
          classification = 'ADVANCE_RECEIPT';
        } else if (nar.includes('DEP') || nar.includes('SECURITY')) {
          classification = 'CUSTOMER_DEPOSIT';
        } else if (nar.includes('INT') || nar.includes('REFUND') || nar.includes('CASHBACK')) {
          classification = 'OTHER_INCOME';
        }

        const ticket = qr.manager.create(SalesDiscoveryTicketOrmEntity, {
          tenantId,
          transactionId: txn.id,
          status: 'OPEN',
          classification,
          notes: `Unbilled inbound credit of ₹${Number(txn.creditAmount).toFixed(2)} detected from ${txn.extractedPartyName || txn.paymentMode}.`,
        });

        await qr.manager.save(SalesDiscoveryTicketOrmEntity, ticket);
        createdCount++;
      }

      return { createdCount };
    });
  }

  async getTickets(tenantId: string, status?: string): Promise<any[]> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const qb = qr.manager
        .getRepository(SalesDiscoveryTicketOrmEntity)
        .createQueryBuilder('ticket')
        .leftJoinAndSelect('ticket.transaction', 'txn')
        .leftJoinAndSelect('txn.bankAccount', 'bankAccount')
        .leftJoinAndSelect('ticket.generatedVoucher', 'voucher')
        .where('ticket.tenant_id = :tenantId', { tenantId })
        .orderBy('ticket.created_at', 'DESC');

      if (status) {
        qb.andWhere('ticket.status = :status', { status });
      }

      const tickets: SalesDiscoveryTicketOrmEntity[] = await qb.getMany();
      return tickets.map((t: SalesDiscoveryTicketOrmEntity) => ({
        id: t.id,
        transactionId: t.transactionId,
        status: t.status,
        classification: t.classification,
        notes: t.notes,
        createdAt: t.createdAt,
        transaction: {
          date: t.transaction?.transactionDate,
          narration: t.transaction?.narration,
          amount: Number(t.transaction?.creditAmount || 0),
          paymentMode: t.transaction?.paymentMode,
          referenceNumber: t.transaction?.referenceNumber,
          extractedPartyName: t.transaction?.extractedPartyName,
          bankName: t.transaction?.bankAccount?.bankName,
        },
        generatedVoucher: t.generatedVoucher
          ? {
              id: t.generatedVoucher.id,
              voucherNumber: t.generatedVoucher.voucherNumber,
              totalAmount: Number(t.generatedVoucher.totalAmount),
            }
          : null,
      }));
    });
  }

  async convertTicketToVoucher(
    tenantId: string,
    ticketId: string,
    dto: ConvertTicketDto,
    userId?: string,
  ): Promise<{ voucherId: string; voucherNumber: string }> {
    const savedVoucherId = await this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const ticket = await qr.manager.findOne(SalesDiscoveryTicketOrmEntity, {
        where: { id: ticketId, tenantId },
        relations: ['transaction', 'transaction.bankAccount'],
      });

      if (!ticket) {
        throw new NotFoundException(`Sales discovery ticket ${ticketId} not found.`);
      }

      if (ticket.status === 'RESOLVED') {
        throw new BadRequestException('This ticket has already been converted to a voucher.');
      }

      const txn = ticket.transaction;
      if (!txn) {
        throw new BadRequestException('Associated bank transaction was not found.');
      }

      const bankAccount = txn.bankAccount;
      if (!bankAccount.ledgerId) {
        throw new BadRequestException('The bank account is not mapped to a general ledger account.');
      }

      const companyId = bankAccount.companyId;
      const amount = new Decimal(txn.creditAmount);

      const partyLedger = await qr.manager.findOne(LedgerOrmEntity, {
        where: { id: dto.partyLedgerId, companyId, tenantId },
      });
      if (!partyLedger) {
        throw new BadRequestException('Invalid party ledger selected.');
      }

      const voucherNum = `ADV-REC/${Date.now().toString().slice(-6)}`;
      const voucherDate = new Date(txn.transactionDate).toISOString().split('T')[0];

      const voucher = qr.manager.create(VoucherOrmEntity, {
        tenantId,
        companyId,
        voucherType: dto.targetType === 'SALES_INVOICE' ? VoucherType.SALES : VoucherType.RECEIPT,
        voucherNumber: voucherNum,
        voucherDate,
        status: VoucherStatus.POSTED,
        totalAmount: amount,
        narration: dto.narration || `Auto-booked from Bank Transaction: ${txn.narration}`,
        createdBy: userId || null,
      });

      const rawFY = await qr.query(
        `SELECT id FROM financial_years WHERE company_id = $1 AND is_closed = false LIMIT 1`,
        [companyId],
      );
      if (rawFY.length > 0) {
        voucher.financialYearId = rawFY[0].id;
      }
      if (bankAccount.branchId) {
        voucher.branchId = bankAccount.branchId;
      } else {
        const rawBranch = await qr.query(
          `SELECT id FROM branches WHERE company_id = $1 LIMIT 1`,
          [companyId],
        );
        if (rawBranch.length > 0) {
          voucher.branchId = rawBranch[0].id;
        }
      }

      const savedVoucher = await qr.manager.save(VoucherOrmEntity, voucher);

      const debitEntry = qr.manager.create(JournalEntryOrmEntity, {
        tenantId,
        voucherId: savedVoucher.id,
        ledgerId: bankAccount.ledgerId,
        entryType: EntryType.DEBIT,
        amount,
      });

      const creditEntry = qr.manager.create(JournalEntryOrmEntity, {
        tenantId,
        voucherId: savedVoucher.id,
        ledgerId: partyLedger.id,
        entryType: EntryType.CREDIT,
        amount,
      });

      await qr.manager.save(JournalEntryOrmEntity, [debitEntry, creditEntry]);

      await qr.query(
        `UPDATE ledgers SET current_balance = current_balance + $1 WHERE id = $2`,
        [amount.toNumber(), bankAccount.ledgerId],
      );
      await qr.query(
        `UPDATE ledgers SET current_balance = current_balance - $1 WHERE id = $2`,
        [amount.toNumber(), partyLedger.id],
      );

      ticket.status = 'RESOLVED';
      ticket.generatedVoucherId = savedVoucher.id;
      await qr.manager.save(SalesDiscoveryTicketOrmEntity, ticket);

      return { voucherId: savedVoucher.id, voucherNumber: savedVoucher.voucherNumber, txnId: txn.id };
    });

    // Match transaction with this created voucher
    await this.reconService.matchTransaction(tenantId, savedVoucherId.txnId, savedVoucherId.voucherId, userId);

    return {
      voucherId: savedVoucherId.voucherId,
      voucherNumber: savedVoucherId.voucherNumber,
    };
  }
}
