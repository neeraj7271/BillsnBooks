import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { BankAccountOrmEntity } from '../../infrastructure/persistence/entities/bank-account.orm-entity';
import { BankTransactionOrmEntity } from '../../infrastructure/persistence/entities/bank-transaction.orm-entity';
import { BankReconciliationItemOrmEntity } from '../../infrastructure/persistence/entities/bank-reconciliation-item.orm-entity';
import { VoucherOrmEntity } from '../../infrastructure/persistence/entities/voucher.orm-entity';
import { JournalEntryOrmEntity } from '../../infrastructure/persistence/entities/journal-entry.orm-entity';

export interface BRSStatementSummary {
  bankAccountId: string;
  bankName: string;
  accountNumberMasked: string;
  currency: string;
  asOfDate: string;
  bankStatementBalance: number;
  bookLedgerBalance: number;
  unreconciledBankCredits: number;
  unreconciledBankDebits: number;
  unreconciledBookCredits: number;
  unreconciledBookDebits: number;
  netVariance: number;
  isBalanced: boolean;
  totalTransactionsCount: number;
  matchedTransactionsCount: number;
  unmatchedTransactionsCount: number;
}

export interface MatchCandidate {
  voucherId: string;
  voucherNumber: string;
  voucherDate: string;
  voucherType: string;
  amount: number;
  narration: string | null;
  confidenceScore: number;
  matchReasons: string[];
}

@Injectable()
export class ReconciliationService {
  constructor(private readonly uow: UnitOfWorkService) {}

  async calculateBRS(tenantId: string, bankAccountId: string): Promise<BRSStatementSummary> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const bankAccount = await qr.manager.findOne(BankAccountOrmEntity, {
        where: { id: bankAccountId, tenantId },
        relations: ['ledger'],
      });

      if (!bankAccount) {
        throw new NotFoundException(`Bank account ${bankAccountId} not found.`);
      }

      const txns = await qr.manager.find(BankTransactionOrmEntity, {
        where: { bankAccountId, tenantId },
        order: { transactionDate: 'ASC', createdAt: 'ASC' },
      });

      const latestTxn = txns[txns.length - 1];
      const bankStatementBalance = latestTxn ? Number(latestTxn.balanceAfter) : Number(bankAccount.currentBalance);

      let bookLedgerBalance = 0;
      if (bankAccount.ledger) {
        bookLedgerBalance = Number(bankAccount.ledger.currentBalance);
      }

      let unreconciledBankCredits = 0;
      let unreconciledBankDebits = 0;
      let matchedCount = 0;
      let unmatchedCount = 0;

      for (const t of txns) {
        if (t.matchStatus === 'MATCHED') {
          matchedCount++;
        } else {
          unmatchedCount++;
          unreconciledBankCredits += Number(t.creditAmount);
          unreconciledBankDebits += Number(t.debitAmount);
        }
      }

      let unreconciledBookDebits = 0;
      let unreconciledBookCredits = 0;

      if (bankAccount.ledgerId) {
        const reconciledItems = await qr.manager.find(BankReconciliationItemOrmEntity, {
          where: { tenantId },
          select: ['voucherId'],
        });
        const reconciledVoucherIds = new Set(reconciledItems.map((r: BankReconciliationItemOrmEntity) => r.voucherId));

        const journalEntries = await qr.manager.find(JournalEntryOrmEntity, {
          where: { ledgerId: bankAccount.ledgerId, tenantId },
          relations: ['voucher'],
        });

        for (const je of journalEntries) {
          if (!reconciledVoucherIds.has(je.voucherId)) {
            if (je.entryType === 'DEBIT') {
              unreconciledBookDebits += Number(je.amount);
            } else {
              unreconciledBookCredits += Number(je.amount);
            }
          }
        }
      }

      const netVariance = Math.round(Math.abs(bankStatementBalance - bookLedgerBalance) * 100) / 100;
      const isBalanced = netVariance === 0;

      const rawAccNum = bankAccount.accountNumberEncrypted || 'XXXX';
      const masked = rawAccNum.length > 4 ? `•••• ${rawAccNum.slice(-4)}` : rawAccNum;

      return {
        bankAccountId: bankAccount.id,
        bankName: bankAccount.bankName,
        accountNumberMasked: masked,
        currency: bankAccount.currency,
        asOfDate: new Date().toISOString().split('T')[0],
        bankStatementBalance: Math.round(bankStatementBalance * 100) / 100,
        bookLedgerBalance: Math.round(bookLedgerBalance * 100) / 100,
        unreconciledBankCredits: Math.round(unreconciledBankCredits * 100) / 100,
        unreconciledBankDebits: Math.round(unreconciledBankDebits * 100) / 100,
        unreconciledBookCredits: Math.round(unreconciledBookCredits * 100) / 100,
        unreconciledBookDebits: Math.round(unreconciledBookDebits * 100) / 100,
        netVariance,
        isBalanced,
        totalTransactionsCount: txns.length,
        matchedTransactionsCount: matchedCount,
        unmatchedTransactionsCount: unmatchedCount,
      };
    });
  }

  async getMatchSuggestions(
    tenantId: string,
    transactionId: string,
  ): Promise<MatchCandidate[]> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const txn = await qr.manager.findOne(BankTransactionOrmEntity, {
        where: { id: transactionId, tenantId },
        relations: ['bankAccount'],
      });

      if (!txn) {
        throw new NotFoundException(`Transaction ${transactionId} not found.`);
      }

      const companyId = txn.bankAccount.companyId;
      const txnAmount = Number(txn.creditAmount) > 0 ? Number(txn.creditAmount) : Number(txn.debitAmount);

      const matchedItems = await qr.manager.find(BankReconciliationItemOrmEntity, {
        where: { tenantId },
        select: ['voucherId'],
      });
      const matchedVoucherIds = new Set(matchedItems.map((m: BankReconciliationItemOrmEntity) => m.voucherId));

      const vouchers = await qr.manager.find(VoucherOrmEntity, {
        where: { companyId, tenantId },
        relations: ['entries', 'entries.ledger'],
        order: { voucherDate: 'DESC' },
        take: 50,
      });

      const suggestions: MatchCandidate[] = [];
      const txnDateMs = new Date(txn.transactionDate).getTime();

      for (const v of vouchers) {
        if (matchedVoucherIds.has(v.id)) continue;

        const vAmount = Number(v.totalAmount);
        const vDateMs = new Date(v.voucherDate).getTime();
        const dayDiff = Math.abs(txnDateMs - vDateMs) / (1000 * 60 * 60 * 24);

        let score = 0;
        const reasons: string[] = [];

        const amountDiff = Math.abs(txnAmount - vAmount);
        if (amountDiff < 0.01) {
          score += 50;
          reasons.push('Exact amount match');
        } else if (amountDiff / txnAmount < 0.05) {
          score += 20;
          reasons.push('Approximate amount match (within 5%)');
        }

        if (
          txn.referenceNumber &&
          ((v.narration && v.narration.includes(txn.referenceNumber)) ||
            v.voucherNumber.includes(txn.referenceNumber))
        ) {
          score += 40;
          reasons.push(`Reference/UTR match (${txn.referenceNumber})`);
        }

        if (txn.extractedPartyName) {
          const partyNormalized = txn.extractedPartyName.toLowerCase();
          const hasPartyLedger = v.entries.some((e: JournalEntryOrmEntity) =>
            e.ledger?.name.toLowerCase().includes(partyNormalized),
          );
          const inNarration = v.narration && v.narration.toLowerCase().includes(partyNormalized);

          if (hasPartyLedger || inNarration) {
            score += 30;
            reasons.push(`Party name match (${txn.extractedPartyName})`);
          }
        }

        if (dayDiff <= 3) {
          score += 15;
          reasons.push('Within 3 days');
        } else if (dayDiff <= 10) {
          score += 10;
          reasons.push('Within 10 days');
        }

        if (score >= 40) {
          suggestions.push({
            voucherId: v.id,
            voucherNumber: v.voucherNumber,
            voucherDate: v.voucherDate,
            voucherType: v.voucherType,
            amount: vAmount,
            narration: v.narration ?? null,
            confidenceScore: Math.min(score, 100),
            matchReasons: reasons,
          });
        }
      }

      return suggestions.sort((a, b) => b.confidenceScore - a.confidenceScore);
    });
  }

  async matchTransaction(
    tenantId: string,
    transactionId: string,
    voucherId: string,
    userId?: string,
  ): Promise<BankReconciliationItemOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const txn = await qr.manager.findOne(BankTransactionOrmEntity, { where: { id: transactionId, tenantId } });
      if (!txn) {
        throw new NotFoundException(`Transaction ${transactionId} not found.`);
      }

      const voucher = await qr.manager.findOne(VoucherOrmEntity, { where: { id: voucherId, tenantId } });
      if (!voucher) {
        throw new NotFoundException(`Voucher ${voucherId} not found.`);
      }

      const existing = await qr.manager.findOne(BankReconciliationItemOrmEntity, { where: { transactionId, tenantId } });
      if (existing) {
        throw new BadRequestException('Transaction is already reconciled.');
      }

      const allocatedAmount = Number(txn.creditAmount) > 0 ? Number(txn.creditAmount) : Number(txn.debitAmount);

      const reconItem = qr.manager.create(BankReconciliationItemOrmEntity, {
        tenantId,
        transactionId,
        voucherId,
        matchType: 'EXACT_1_TO_1',
        allocatedAmount,
        matchedBy: userId || null,
        matchedAt: new Date(),
      });

      const saved = await qr.manager.save(BankReconciliationItemOrmEntity, reconItem);

      txn.matchStatus = 'MATCHED';
      await qr.manager.save(BankTransactionOrmEntity, txn);

      return saved;
    });
  }

  async unmatchTransaction(tenantId: string, transactionId: string): Promise<void> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const txn = await qr.manager.findOne(BankTransactionOrmEntity, { where: { id: transactionId, tenantId } });
      if (!txn) {
        throw new NotFoundException(`Transaction ${transactionId} not found.`);
      }

      await qr.manager.delete(BankReconciliationItemOrmEntity, { transactionId, tenantId });

      txn.matchStatus = 'UNMATCHED';
      await qr.manager.save(BankTransactionOrmEntity, txn);
    });
  }
}
