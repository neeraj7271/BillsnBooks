import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { BankAccountOrmEntity } from '../../infrastructure/persistence/entities/bank-account.orm-entity';
import { BankStatementOrmEntity } from '../../infrastructure/persistence/entities/bank-statement.orm-entity';
import { BankTransactionOrmEntity } from '../../infrastructure/persistence/entities/bank-transaction.orm-entity';
import { BankParserService } from './bank-parser.service';
import { SalesDiscoveryService } from './sales-discovery.service';

export interface CreateBankAccountDto {
  companyId: string;
  branchId?: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType?: string;
  ledgerId?: string;
  openingBalance?: number;
}

@Injectable()
export class BankingService {
  constructor(
    private readonly uow: UnitOfWorkService,
    private readonly parser: BankParserService,
    private readonly discoveryService: SalesDiscoveryService,
  ) {}

  async listAccounts(tenantId: string, companyId?: string): Promise<any[]> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const qb = qr.manager
        .getRepository(BankAccountOrmEntity)
        .createQueryBuilder('acc')
        .leftJoinAndSelect('acc.company', 'company')
        .leftJoinAndSelect('acc.branch', 'branch')
        .leftJoinAndSelect('acc.ledger', 'ledger')
        .where('acc.tenant_id = :tenantId', { tenantId });

      if (companyId) {
        qb.andWhere('acc.company_id = :companyId', { companyId });
      }

      const accounts: BankAccountOrmEntity[] = await qb.getMany();
      return accounts.map((a: BankAccountOrmEntity) => {
        const rawNum = a.accountNumberEncrypted || 'XXXX';
        const masked = rawNum.length > 4 ? `•••• ${rawNum.slice(-4)}` : rawNum;
        return {
          id: a.id,
          bankName: a.bankName,
          accountNumberMasked: masked,
          ifscCode: a.ifscCode,
          accountType: a.accountType,
          openingBalance: Number(a.openingBalance),
          currentBalance: Number(a.currentBalance),
          currency: a.currency,
          company: { id: a.company?.id, name: a.company?.legalName },
          branch: a.branch ? { id: a.branch.id, name: a.branch.branchName } : null,
          ledger: a.ledger ? { id: a.ledger.id, name: a.ledger.name, code: a.ledger.code } : null,
        };
      });
    });
  }

  async createAccount(tenantId: string, dto: CreateBankAccountDto): Promise<BankAccountOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const acc = qr.manager.create(BankAccountOrmEntity, {
        tenantId,
        companyId: dto.companyId,
        branchId: dto.branchId || null,
        bankName: dto.bankName,
        accountNumberEncrypted: dto.accountNumber,
        ifscCode: dto.ifscCode.toUpperCase(),
        accountType: dto.accountType || 'CURRENT',
        ledgerId: dto.ledgerId || null,
        openingBalance: dto.openingBalance || 0,
        currentBalance: dto.openingBalance || 0,
        currency: 'INR',
      });

      return await qr.manager.save(BankAccountOrmEntity, acc);
    });
  }

  async uploadStatement(
    tenantId: string,
    bankAccountId: string,
    fileBuffer: Buffer,
    fileName: string,
  ): Promise<{
    statementId: string;
    totalTransactions: number;
    openingBalance: number;
    closingBalance: number;
    isContinuityValid: boolean;
    unbilledCreditsDiscovered: number;
  }> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const bankAccount = await qr.manager.findOne(BankAccountOrmEntity, {
        where: { id: bankAccountId, tenantId },
      });

      if (!bankAccount) {
        throw new NotFoundException(`Bank account ${bankAccountId} not found.`);
      }

      const parseResult = await this.parser.parseStatement(fileBuffer, fileName, Number(bankAccount.currentBalance));

      // Check SHA-256 deduplication
      const existing = await qr.manager.findOne(BankStatementOrmEntity, {
        where: { tenantId, bankAccountId, fileHashSha256: parseResult.fileHashSha256 },
      });
      if (existing) {
        throw new ConflictException(
          `This exact bank statement file has already been ingested (Statement ID: ${existing.id}).`,
        );
      }

      // Create Statement record
      const stmt = qr.manager.create(BankStatementOrmEntity, {
        tenantId,
        bankAccountId,
        fileName: parseResult.fileName,
        fileHashSha256: parseResult.fileHashSha256,
        periodStart: parseResult.periodStart,
        periodEnd: parseResult.periodEnd,
        openingBalance: parseResult.openingBalance,
        closingBalance: parseResult.closingBalance,
        totalTransactions: parseResult.totalTransactions,
        status: parseResult.isContinuityValid ? 'VERIFIED' : 'WARNING_CONTINUITY_GAP',
      });

      const savedStmt = await qr.manager.save(BankStatementOrmEntity, stmt);

      // Create Transactions records
      const txnsToSave = parseResult.transactions.map((t) =>
        qr.manager.create(BankTransactionOrmEntity, {
          tenantId,
          statementId: savedStmt.id,
          bankAccountId,
          transactionDate: t.transactionDate,
          valueDate: t.valueDate,
          narration: t.narration,
          debitAmount: t.debitAmount,
          creditAmount: t.creditAmount,
          balanceAfter: t.balanceAfter,
          referenceNumber: t.referenceNumber,
          paymentMode: t.paymentMode,
          extractedPartyName: t.extractedPartyName,
          matchStatus: 'UNMATCHED',
        }),
      );

      await qr.manager.save(BankTransactionOrmEntity, txnsToSave);

      // Update bank account current balance
      bankAccount.currentBalance = parseResult.closingBalance;
      await qr.manager.save(BankAccountOrmEntity, bankAccount);

      // Trigger unbilled credits discovery automatically
      const discovery = await this.discoveryService.scanAndGenerateTickets(tenantId, bankAccountId);

      return {
        statementId: savedStmt.id,
        totalTransactions: parseResult.totalTransactions,
        openingBalance: parseResult.openingBalance,
        closingBalance: parseResult.closingBalance,
        isContinuityValid: parseResult.isContinuityValid,
        unbilledCreditsDiscovered: discovery.createdCount,
      };
    });
  }

  async listTransactions(
    tenantId: string,
    bankAccountId: string,
    matchStatus?: string,
  ): Promise<any[]> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const qb = qr.manager
        .getRepository(BankTransactionOrmEntity)
        .createQueryBuilder('txn')
        .where('txn.tenant_id = :tenantId', { tenantId })
        .andWhere('txn.bank_account_id = :bankAccountId', { bankAccountId })
        .orderBy('txn.transaction_date', 'DESC')
        .addOrderBy('txn.created_at', 'DESC');

      if (matchStatus && matchStatus !== 'ALL') {
        qb.andWhere('txn.match_status = :matchStatus', { matchStatus });
      }

      const txns: BankTransactionOrmEntity[] = await qb.getMany();
      return txns.map((t: BankTransactionOrmEntity) => ({
        id: t.id,
        statementId: t.statementId,
        transactionDate: t.transactionDate,
        valueDate: t.valueDate,
        narration: t.narration,
        debitAmount: Number(t.debitAmount),
        creditAmount: Number(t.creditAmount),
        balanceAfter: Number(t.balanceAfter),
        referenceNumber: t.referenceNumber,
        paymentMode: t.paymentMode,
        extractedPartyName: t.extractedPartyName,
        matchStatus: t.matchStatus,
      }));
    });
  }
}
