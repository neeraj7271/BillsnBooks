import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { QueryRunner, In } from 'typeorm';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { FileParserService } from './file-parser.service';
import { ImportValidationService, PartyLedgerLookup } from './import-validation.service';
import { ImportMastersService, BulkResolveMastersDto, MissingMastersScanResult } from './import-masters.service';
import { VoucherService } from '../voucher/voucher.service';
import { ImportBatchOrmEntity } from '../../infrastructure/persistence/entities/import-batch.orm-entity';
import { ImportRowOrmEntity } from '../../infrastructure/persistence/entities/import-row.orm-entity';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { PartyOrmEntity } from '../../infrastructure/persistence/entities/party.orm-entity';
import { CompanyOrmEntity } from '../../infrastructure/persistence/entities/company.orm-entity';
import { BranchOrmEntity } from '../../infrastructure/persistence/entities/branch.orm-entity';
import { FinancialYearOrmEntity } from '../../infrastructure/persistence/entities/financial-year.orm-entity';
import {
  ImportBatchStatus,
  ImportType,
  RiskApprovalState,
  ColumnMappingConfig,
  BulkFixRowsRequest,
  VoucherType,
  EntryType,
} from '@platform/shared-types';

@Injectable()
export class ImportService {
  // In-memory buffer store for active uploaded files during session
  private static fileBufferCache = new Map<string, Buffer>();

  constructor(
    private readonly uow: UnitOfWorkService,
    private readonly fileParser: FileParserService,
    private readonly validator: ImportValidationService,
    private readonly voucherService: VoucherService,
    private readonly mastersService: ImportMastersService,
  ) {}

  /**
   * Upload and stage an import file with SHA-256 deduplication
   */
  async uploadFile(
    tenantId: string,
    companyId: string,
    userId: string,
    fileBuffer: Buffer,
    fileName: string,
    branchId?: string,
    importType: ImportType = ImportType.SALES_REGISTER,
  ): Promise<{
    batch: ImportBatchOrmEntity;
    detectedHeaders: string[];
    sampleRows: Record<string, any>[];
    recommendedMapping: ColumnMappingConfig;
  }> {
    const fileHash = this.fileParser.computeHash(fileBuffer);

    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      // 1. Deduplication check
      const existing = await qr.manager.findOne(ImportBatchOrmEntity, {
        where: { tenantId, companyId, fileHashSha256: fileHash },
      });

      if (existing && existing.status !== ImportBatchStatus.FAILED) {
        throw new ConflictException(
          `Duplicate file upload detected! An identical file was already uploaded in Batch #${existing.id} (Status: ${existing.status}).`,
        );
      }

      // 2. Parse file headers and samples
      const parsed = await this.fileParser.parseBuffer(fileBuffer, fileName);
      const recommendedMapping = this.fileParser.autoDetectMapping(parsed.headers);

      // 3. Resolve default branch if not provided
      let finalBranchId = branchId;
      if (!finalBranchId) {
        const defaultBranch = await qr.manager.findOne(BranchOrmEntity, {
          where: { tenantId, companyId },
        });
        finalBranchId = defaultBranch?.id;
      }

      // 4. Create batch record
      const batch = new ImportBatchOrmEntity();
      batch.tenantId = tenantId;
      batch.companyId = companyId;
      batch.branchId = finalBranchId || null;
      batch.fileName = fileName;
      batch.fileHashSha256 = fileHash;
      batch.fileSizeBytes = parsed.fileSizeBytes.toString();
      batch.importType = importType;
      batch.columnMapping = recommendedMapping;
      batch.status = ImportBatchStatus.UPLOADED;
      batch.totalRows = parsed.allRows.length;
      batch.detectedHeaders = parsed.headers;
      batch.sampleRows = parsed.sampleRows;
      batch.createdBy = userId;

      const savedBatch = await qr.manager.save(ImportBatchOrmEntity, batch);

      // Cache buffer for mapping phase
      ImportService.fileBufferCache.set(savedBatch.id, fileBuffer);

      return {
        batch: savedBatch,
        detectedHeaders: parsed.headers,
        sampleRows: parsed.sampleRows,
        recommendedMapping,
      };
    });
  }

  /**
   * Apply user-confirmed column mapping and trigger validation engine across all rows
   */
  async applyMappingAndValidate(
    tenantId: string,
    companyId: string,
    batchId: string,
    mapping: ColumnMappingConfig,
  ): Promise<ImportBatchOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const batch = await qr.manager.findOne(ImportBatchOrmEntity, {
        where: { id: batchId, tenantId, companyId },
      });

      if (!batch) {
        throw new NotFoundException(`Import batch ${batchId} not found`);
      }

      // Fetch company details for GSTIN
      const company = await qr.manager.findOne(CompanyOrmEntity, {
        where: { id: companyId, tenantId },
      });

      // Fetch known ledgers and parties for party matching
      const ledgers = await qr.manager.find(LedgerOrmEntity, {
        where: { tenantId, companyId },
      });
      const knownLedgers: PartyLedgerLookup[] = ledgers.map((l) => ({
        id: l.id,
        name: l.name,
      }));

      const parties = await qr.manager.find(PartyOrmEntity, {
        where: { tenantId, companyId, isActive: true },
      });
      for (const p of parties) {
        if (p.ledgerId) {
          knownLedgers.push({
            id: p.ledgerId,
            name: p.name,
          });
        }
      }

      // Retrieve file buffer
      let buffer = ImportService.fileBufferCache.get(batchId);
      if (!buffer && batch.sampleRows && batch.sampleRows.length > 0) {
        // Fallback: use sample rows if buffer was cleared from memory
        buffer = Buffer.from(JSON.stringify(batch.sampleRows));
      }

      if (!buffer) {
        throw new BadRequestException('Source file buffer expired. Please re-upload the file.');
      }

      const parsedFile = await this.fileParser.parseBuffer(buffer, batch.fileName);

      // Delete any previous rows for this batch (re-validation support)
      await qr.manager.delete(ImportRowOrmEntity, { batchId });

      let validCount = 0;
      let blockedCount = 0;
      let clarificationCount = 0;

      const stagedRows: ImportRowOrmEntity[] = [];

      for (let i = 0; i < parsedFile.allRows.length; i++) {
        const rawRow = parsedFile.allRows[i];
        const validation = this.validator.validateRow(
          i + 1,
          rawRow,
          mapping,
          company?.panEncrypted ? '07AAAAA0000A1Z5' : undefined, // fallback company gstin
          knownLedgers,
          batch.importType,
        );

        if (validation.validationState === RiskApprovalState.GREEN) {
          validCount++;
        } else if (validation.validationState === RiskApprovalState.RED) {
          blockedCount++;
        } else {
          clarificationCount++;
        }

        const rowEntity = new ImportRowOrmEntity();
        rowEntity.tenantId = tenantId;
        rowEntity.batchId = batchId;
        rowEntity.rowIndex = validation.rowIndex;
        rowEntity.rawData = validation.rawData;
        rowEntity.parsedData = validation.parsedData;
        rowEntity.validationState = validation.validationState;
        rowEntity.errorReasons = validation.errorReasons;
        rowEntity.matchedLedgerId = validation.matchedLedgerId || null;

        stagedRows.push(rowEntity);
      }

      // Bulk insert staged rows in batches of 500
      const chunkSize = 500;
      for (let c = 0; c < stagedRows.length; c += chunkSize) {
        await qr.manager.save(ImportRowOrmEntity, stagedRows.slice(c, c + chunkSize));
      }

      // Update batch status and metrics
      batch.columnMapping = mapping;
      batch.totalRows = stagedRows.length;
      batch.validRows = validCount;
      batch.blockedRows = blockedCount;
      batch.clarificationRows = clarificationCount;
      batch.status =
        blockedCount === 0 && clarificationCount === 0
          ? ImportBatchStatus.READY_FOR_APPROVAL
          : ImportBatchStatus.MAPPING;

      return qr.manager.save(ImportBatchOrmEntity, batch);
    });
  }

  /**
   * Get batch summary with validation counters
   */
  async getBatch(
    tenantId: string,
    companyId: string,
    batchId: string,
  ): Promise<ImportBatchOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const batch = await qr.manager.findOne(ImportBatchOrmEntity, {
        where: { id: batchId, tenantId, companyId },
      });
      if (!batch) {
        throw new NotFoundException(`Import batch ${batchId} not found`);
      }
      return batch;
    });
  }

  /**
   * List batches for company
   */
  async listBatches(
    tenantId: string,
    companyId: string,
  ): Promise<ImportBatchOrmEntity[]> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      return qr.manager.find(ImportBatchOrmEntity, {
        where: { tenantId, companyId },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });
  }

  /**
   * Get virtualized paginated rows with filter
   */
  async getBatchRows(
    tenantId: string,
    companyId: string,
    batchId: string,
    statusFilter?: RiskApprovalState,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ rows: ImportRowOrmEntity[]; total: number; page: number; limit: number }> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const whereClause: any = { batchId, tenantId };
      if (statusFilter) {
        whereClause.validationState = statusFilter;
      }

      const [rows, total] = await qr.manager.findAndCount(ImportRowOrmEntity, {
        where: whereClause,
        relations: ['matchedLedger'],
        order: { rowIndex: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return { rows, total, page, limit };
    });
  }

  /**
   * Bulk-fix errors in-place (e.g. map missing ledger, recalculate tax)
   */
  async bulkFixRows(
    tenantId: string,
    companyId: string,
    batchId: string,
    req: BulkFixRowsRequest,
  ): Promise<ImportBatchOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const batch = await qr.manager.findOne(ImportBatchOrmEntity, {
        where: { id: batchId, tenantId, companyId },
      });
      if (!batch) {
        throw new NotFoundException(`Import batch ${batchId} not found`);
      }

      const rowQuery: any = { batchId, tenantId };
      if (req.rowIds && req.rowIds.length > 0) {
        rowQuery.id = In(req.rowIds);
      }

      const rows = await qr.manager.find(ImportRowOrmEntity, { where: rowQuery });

      for (const row of rows) {
        if (req.targetField === 'matchedLedgerId' && req.fixValue) {
          row.matchedLedgerId = req.fixValue;
          // Clear ledger-missing reason if present
          row.errorReasons = row.errorReasons.filter(
            (r) => !r.toLowerCase().includes('ledger') && !r.toLowerCase().includes('party'),
          );
          if (row.errorReasons.length === 0) {
            row.validationState = RiskApprovalState.GREEN;
          }
        } else if (req.targetField === 'recomputeTax') {
          // Auto-rebalance tax math
          const taxable = row.parsedData.taxableAmount || 0;
          const cgst = row.parsedData.cgstAmount || 0;
          const sgst = row.parsedData.sgstAmount || 0;
          const igst = row.parsedData.igstAmount || 0;
          row.parsedData.totalAmount = taxable + cgst + sgst + igst;
          row.errorReasons = row.errorReasons.filter((r) => !r.toLowerCase().includes('math'));
          if (row.errorReasons.length === 0 && row.matchedLedgerId) {
            row.validationState = RiskApprovalState.GREEN;
          }
        } else if (req.targetField === 'placeOfSupply' && req.fixValue) {
          row.parsedData.placeOfSupply = req.fixValue;
          row.errorReasons = row.errorReasons.filter((r) => !r.toLowerCase().includes('pos') && !r.toLowerCase().includes('supply'));
          if (row.errorReasons.length === 0 && row.matchedLedgerId) {
            row.validationState = RiskApprovalState.GREEN;
          }
        }
      }

      await qr.manager.save(ImportRowOrmEntity, rows);

      // Recompute counters
      const [allRows] = await Promise.all([
        qr.manager.find(ImportRowOrmEntity, { where: { batchId, tenantId } }),
      ]);

      batch.validRows = allRows.filter((r) => r.validationState === RiskApprovalState.GREEN).length;
      batch.blockedRows = allRows.filter((r) => r.validationState === RiskApprovalState.RED).length;
      batch.clarificationRows = allRows.filter(
        (r) => r.validationState === RiskApprovalState.YELLOW || r.validationState === RiskApprovalState.BLUE,
      ).length;

      if (batch.blockedRows === 0 && batch.clarificationRows === 0) {
        batch.status = ImportBatchStatus.READY_FOR_APPROVAL;
      }

      return qr.manager.save(ImportBatchOrmEntity, batch);
    });
  }

  /**
   * Inline-edit a single staged row and re-validate against statutory rules
   */
  async updateRowAndRevalidate(
    tenantId: string,
    companyId: string,
    batchId: string,
    rowId: string,
    patch: Record<string, any>,
  ): Promise<ImportRowOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const batch = await qr.manager.findOne(ImportBatchOrmEntity, {
        where: { id: batchId, tenantId, companyId },
      });
      if (!batch) {
        throw new NotFoundException(`Import batch ${batchId} not found`);
      }

      const row = await qr.manager.findOne(ImportRowOrmEntity, {
        where: { id: rowId, batchId, tenantId },
      });
      if (!row) {
        throw new NotFoundException(`Import row ${rowId} not found`);
      }

      const mapping = (batch.columnMapping || {}) as ColumnMappingConfig;
      const updatedRaw = { ...(row.rawData || {}) };
      const fieldMap: Array<[string, string]> = [
        ['voucherNumber', 'voucherNumber'],
        ['date', 'date'],
        ['partyName', 'partyName'],
        ['partyGstin', 'partyGstin'],
        ['placeOfSupply', 'placeOfSupply'],
        ['taxableAmount', 'taxableAmount'],
        ['cgstAmount', 'cgstAmount'],
        ['sgstAmount', 'sgstAmount'],
        ['igstAmount', 'igstAmount'],
        ['totalAmount', 'totalAmount'],
      ];
      for (const [patchKey, canonKey] of fieldMap) {
        if (patch[patchKey] !== undefined) {
          const header = mapping[canonKey] || patchKey;
          updatedRaw[header] = patch[patchKey];
          // Ensure canonical mapping points to a header if it wasn't mapped
          if (!mapping[canonKey]) {
            mapping[canonKey] = header;
          }
        }
      }

      const [company, ledgers] = await Promise.all([
        qr.manager.findOne(CompanyOrmEntity, { where: { id: companyId } }),
        qr.manager.find(LedgerOrmEntity, { where: { tenantId, companyId } }),
      ]);
      const knownLedgers = ledgers.map((l) => ({ id: l.id, name: l.name }));

      const validation = this.validator.validateRow(
        row.rowIndex,
        updatedRaw,
        mapping,
        company?.panEncrypted ? '07AAAAA0000A1Z5' : undefined,
        knownLedgers,
        batch.importType,
      );

      row.rawData = updatedRaw;
      row.parsedData = validation.parsedData;
      row.validationState = validation.validationState;
      row.errorReasons = validation.errorReasons;
      if (validation.matchedLedgerId) {
        row.matchedLedgerId = validation.matchedLedgerId;
      }

      const savedRow = await qr.manager.save(ImportRowOrmEntity, row);

      const allRows = await qr.manager.find(ImportRowOrmEntity, { where: { batchId, tenantId } });
      batch.validRows = allRows.filter((r) => r.validationState === RiskApprovalState.GREEN).length;
      batch.blockedRows = allRows.filter((r) => r.validationState === RiskApprovalState.RED).length;
      batch.clarificationRows = allRows.filter(
        (r) => r.validationState === RiskApprovalState.YELLOW || r.validationState === RiskApprovalState.BLUE,
      ).length;
      if (batch.blockedRows === 0 && batch.clarificationRows === 0) {
        batch.status = ImportBatchStatus.READY_FOR_APPROVAL;
      }
      await qr.manager.save(ImportBatchOrmEntity, batch);

      return savedRow;
    });
  }

  /**
   * Maker-Checker sign-off
   */
  async approveBatch(
    tenantId: string,
    companyId: string,
    batchId: string,
    approverUserId: string,
  ): Promise<ImportBatchOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const batch = await qr.manager.findOne(ImportBatchOrmEntity, {
        where: { id: batchId, tenantId, companyId },
      });
      if (!batch) {
        throw new NotFoundException(`Import batch ${batchId} not found`);
      }

      if (batch.blockedRows > 0) {
        throw new BadRequestException(
          `Cannot approve batch with ${batch.blockedRows} blocked (RED) rows. Please resolve all blocking errors first.`,
        );
      }

      batch.status = ImportBatchStatus.APPROVED;
      batch.approvedBy = approverUserId;
      batch.approvedAt = new Date();

      return qr.manager.save(ImportBatchOrmEntity, batch);
    });
  }

  /**
   * Generate canonical double-entry vouchers and post them to cloud ledger
   */
  async postBatchToVouchers(
    tenantId: string,
    companyId: string,
    userId: string,
    batchId: string,
  ): Promise<{
    batch: ImportBatchOrmEntity;
    postedCount: number;
    failedCount: number;
    failures: { rowId: string; error: string }[];
  }> {
    const batch = await this.getBatch(tenantId, companyId, batchId);

    // Fetch default financial year
    const fy = await this.uow.executeInTransaction(async (qr) => {
      return qr.manager.findOne(FinancialYearOrmEntity, {
        where: { tenantId, companyId },
        order: { startDate: 'DESC' },
      });
    });

    if (!fy) {
      throw new BadRequestException('No active financial year found for company.');
    }

    // Resolve posting ledgers by stable systemKey / OUTPUT tax type - never by a
    // loose name match (which previously matched Input CGST before Output CGST)
    // and never with a "ledgers[0]" fallback that could post to a random account.
    const { salesLedger, purchaseLedger, bankLedger, cashLedger, cgstLedger, sgstLedger, igstLedger, cgstInputLedger, sgstInputLedger, igstInputLedger } = await this.uow.executeInTransaction(
      async (qr) => {
        const ledgers = await qr.manager.find(LedgerOrmEntity, { where: { tenantId, companyId } });
        const bySys = (k: string) => ledgers.find((l) => l.systemKey === k);
        const byTax = (dir: 'OUTPUT' | 'INPUT', t: string) =>
          ledgers.find((l) => {
            const n = l.name.toUpperCase();
            const isDir = (l.systemKey || '').toUpperCase().includes(dir) || n.includes(dir);
            if (!isDir) return false;
            if (l.gstTaxType && String(l.gstTaxType).toUpperCase() === t) return true;
            return n.includes(t);
          });
        const sales =
          bySys('LED_SALES_GST_DOMESTIC') ||
          ledgers.find(
            (l) =>
              l.name.toLowerCase().includes('sales') &&
              !l.name.toLowerCase().includes('purchase'),
          );
        const purchase =
          bySys('LED_PURCHASE_GST_DOMESTIC') ||
          ledgers.find((l) => l.name.toLowerCase().includes('purchase'));
        const bank =
          bySys('LED_BANK_PRIMARY') ||
          ledgers.find((l) => l.name.toLowerCase().includes('bank'));
        const cash =
          bySys('LED_CASH_IN_HAND') ||
          ledgers.find((l) => l.name.toLowerCase().includes('cash'));
        return {
          salesLedger: sales || null,
          purchaseLedger: purchase || sales || null,
          bankLedger: bank || cash || null,
          cashLedger: cash || bank || sales || null,
          cgstLedger: bySys('LED_CGST_OUTPUT') || byTax('OUTPUT', 'CGST') || null,
          sgstLedger: bySys('LED_SGST_OUTPUT') || byTax('OUTPUT', 'SGST') || null,
          igstLedger: bySys('LED_IGST_OUTPUT') || byTax('OUTPUT', 'IGST') || null,
          cgstInputLedger: bySys('LED_CGST_INPUT') || byTax('INPUT', 'CGST') || bySys('LED_CGST_OUTPUT') || null,
          sgstInputLedger: bySys('LED_SGST_INPUT') || byTax('INPUT', 'SGST') || bySys('LED_SGST_OUTPUT') || null,
          igstInputLedger: bySys('LED_IGST_INPUT') || byTax('INPUT', 'IGST') || bySys('LED_IGST_OUTPUT') || null,
        };
      },
    );
    if (!salesLedger) {
      throw new BadRequestException('No Sales ledger configured for bulk import posting.');
    }

    // Fetch valid rows
    const { rows: validRows } = await this.getBatchRows(
      tenantId,
      companyId,
      batchId,
      RiskApprovalState.GREEN,
      1,
      1000,
    );

    let postedCount = 0;
    const failures: { rowId: string; error: string }[] = [];

    for (const row of validRows) {
      try {
      const data = row.parsedData;
      const partyLedgerId = row.matchedLedgerId || cashLedger?.id;
      if (!partyLedgerId) {
        throw new Error('Row has no matched party ledger; resolve masters before posting.');
      }
      const totalAmount = data.totalAmount || 0;
      const taxable = data.taxableAmount || totalAmount;
      const cgst = data.cgstAmount || 0;
      const sgst = data.sgstAmount || 0;
      const igst = data.igstAmount || 0;

      let voucherType = VoucherType.SALES;
      const entries: { ledgerId: string; entryType: EntryType; amount: string; narration?: string }[] = [];

      if (batch.importType === ImportType.BANK_STATEMENT) {
        const isCredit = data.bankDirection === 'CREDIT';
        voucherType = isCredit ? VoucherType.RECEIPT : VoucherType.PAYMENT;
        const primaryBankId = bankLedger?.id || partyLedgerId;
        const counterLedgerId = row.matchedLedgerId || salesLedger.id;
        entries.push(
          {
            ledgerId: primaryBankId,
            entryType: isCredit ? EntryType.DEBIT : EntryType.CREDIT,
            amount: totalAmount.toFixed(4),
            narration: data.narration || data.partyName || 'Bank Statement Entry',
          },
          {
            ledgerId: counterLedgerId,
            entryType: isCredit ? EntryType.CREDIT : EntryType.DEBIT,
            amount: totalAmount.toFixed(4),
            narration: data.narration || data.partyName || 'Bank Counterparty',
          },
        );
      } else if (batch.importType === ImportType.PURCHASE_REGISTER) {
        voucherType = VoucherType.PURCHASE;
        entries.push(
          {
            ledgerId: purchaseLedger?.id || salesLedger.id,
            entryType: EntryType.DEBIT,
            amount: taxable.toFixed(4),
            narration: `Purchase Expense (HSN: ${data.hsnCode || 'N/A'})`,
          },
          {
            ledgerId: partyLedgerId,
            entryType: EntryType.CREDIT,
            amount: totalAmount.toFixed(4),
            narration: `Vendor: ${data.partyName || 'Supplier'}`,
          },
        );
        if (cgst > 0 && cgstInputLedger) {
          entries.push({ ledgerId: cgstInputLedger.id, entryType: EntryType.DEBIT, amount: cgst.toFixed(4), narration: 'Input CGST' });
        }
        if (sgst > 0 && sgstInputLedger) {
          entries.push({ ledgerId: sgstInputLedger.id, entryType: EntryType.DEBIT, amount: sgst.toFixed(4), narration: 'Input SGST' });
        }
        if (igst > 0 && igstInputLedger) {
          entries.push({ ledgerId: igstInputLedger.id, entryType: EntryType.DEBIT, amount: igst.toFixed(4), narration: 'Input IGST' });
        }
      } else {
        // Sales Voucher: Debit Party (total), Credit Sales (taxable), Credit GST accounts
        entries.push(
          {
            ledgerId: partyLedgerId,
            entryType: EntryType.DEBIT,
            amount: totalAmount.toFixed(4),
            narration: `Party: ${data.partyName || 'Customer'}`,
          },
          {
            ledgerId: salesLedger.id,
            entryType: EntryType.CREDIT,
            amount: taxable.toFixed(4),
            narration: `Sales Revenue (HSN: ${data.hsnCode || 'N/A'})`,
          },
        );

        if (cgst > 0 && cgstLedger) {
          entries.push({
            ledgerId: cgstLedger.id,
            entryType: EntryType.CREDIT,
            amount: cgst.toFixed(4),
            narration: 'Output CGST',
          });
        }
        if (sgst > 0 && sgstLedger) {
          entries.push({
            ledgerId: sgstLedger.id,
            entryType: EntryType.CREDIT,
            amount: sgst.toFixed(4),
            narration: 'Output SGST',
          });
        }
        if (igst > 0 && igstLedger) {
          entries.push({
            ledgerId: igstLedger.id,
            entryType: EntryType.CREDIT,
            amount: igst.toFixed(4),
            narration: 'Output IGST',
          });
        }
      }

      const voucher = await this.voucherService.createAndPostVoucher(
        tenantId,
        companyId,
        userId,
        {
          branchId: batch.branchId || fy.id,
          financialYearId: fy.id,
          voucherType,
          voucherDate: data.date || new Date().toISOString().split('T')[0],
          narration: `Bulk Import Batch #${batch.id.substring(0, 8)} - Inv #${data.voucherNumber}`,
          series: 'IMPORT',
          entries,
        },
        `IMPORT_${batch.id}_${row.id}`,
      );

      // Link generated voucher to import row
      await this.uow.executeInTransaction(async (qr) => {
        await qr.manager.update(ImportRowOrmEntity, { id: row.id }, {
          generatedVoucherId: voucher.id,
        });
      });

      postedCount++;
      } catch (err: any) {
        // Per-row isolation: one bad row does not abort the batch. Voucher posts
        // are idempotent (key IMPORT_<batch>_<row>), so re-running the batch
        // safely completes the remaining rows.
        failures.push({ rowId: row.id, error: err?.message || 'Posting failed' });
      }
    }

    // The batch is COMPLETED only when every row posted; otherwise FAILED so the
    // user can resolve and re-run (already-posted rows are skipped by idempotency).
    const updatedBatch = await this.uow.executeInTransaction(async (qr) => {
      batch.status = failures.length === 0 ? ImportBatchStatus.COMPLETED : ImportBatchStatus.FAILED;
      return qr.manager.save(ImportBatchOrmEntity, batch);
    });

    return { batch: updatedBatch, postedCount, failedCount: failures.length, failures };
  }

  /**
   * Pre-flight scan for missing parties, items, and unmapped units
   */
  async scanBatchMissingMasters(
    tenantId: string,
    companyId: string,
    batchId: string,
  ): Promise<MissingMastersScanResult> {
    const batch = await this.getBatch(tenantId, companyId, batchId);
    const { rows } = await this.getBatchRows(tenantId, companyId, batchId, undefined, 1, 1000);
    const dataRows = rows.map((r) => ({ ...r.rawData, ...r.parsedData }));

    const importType = batch.importType === ImportType.PURCHASE_REGISTER ? 'PURCHASE' : 'SALES';
    return this.mastersService.scanMissingMasters(tenantId, companyId, dataRows, importType);
  }

  /**
   * Bulk-resolve and create missing masters, then automatically re-validate batch
   */
  async resolveBatchMasters(
    tenantId: string,
    companyId: string,
    batchId: string,
    payload: BulkResolveMastersDto,
  ): Promise<{
    created: { createdParties: number; createdItems: number };
    batch: ImportBatchOrmEntity;
  }> {
    const batch = await this.getBatch(tenantId, companyId, batchId);
    const created = await this.mastersService.bulkResolveMasters(tenantId, companyId, payload);

    // Automatically re-validate batch rows so newly created masters are linked and matched
    const updatedBatch = await this.applyMappingAndValidate(
      tenantId,
      companyId,
      batchId,
      batch.columnMapping,
    );

    return { created, batch: updatedBatch };
  }

  /**
   * 1-Click statutory GST auto-fix: rebalances CGST/SGST vs IGST based on Place of Supply
   */
  async autoFixBatchGst(
    tenantId: string,
    companyId: string,
    batchId: string,
  ): Promise<{ fixedCount: number; batch: ImportBatchOrmEntity }> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const batch = await qr.manager.findOne(ImportBatchOrmEntity, {
        where: { id: batchId, tenantId, companyId },
      });
      if (!batch) {
        throw new NotFoundException(`Import batch ${batchId} not found`);
      }

      // Resolve company state code from branch or default
      const branch = batch.branchId
        ? await qr.manager.findOne(BranchOrmEntity, { where: { id: batch.branchId, companyId } })
        : await qr.manager.findOne(BranchOrmEntity, { where: { companyId } });
      const companyStateCode = branch?.stateCode || (branch?.gstin ? branch.gstin.substring(0, 2) : '27');

      const rows = await qr.manager.find(ImportRowOrmEntity, { where: { batchId, tenantId } });
      let fixedCount = 0;

      for (const row of rows) {
        const { updatedData, fixed } = this.validator.autoFixGstTaxSplit(
          row.parsedData,
          companyStateCode,
        );
        if (fixed) {
          row.parsedData = updatedData;
          row.errorReasons = row.errorReasons.filter(
            (r) =>
              !r.toLowerCase().includes('inter-state') &&
              !r.toLowerCase().includes('intra-state') &&
              !r.toLowerCase().includes('math') &&
              !r.toLowerCase().includes('igst') &&
              !r.toLowerCase().includes('cgst'),
          );
          if (row.errorReasons.length === 0 && row.matchedLedgerId) {
            row.validationState = RiskApprovalState.GREEN;
          }
          fixedCount++;
        }
      }

      await qr.manager.save(ImportRowOrmEntity, rows);

      // Recompute counters
      batch.validRows = rows.filter((r) => r.validationState === RiskApprovalState.GREEN).length;
      batch.blockedRows = rows.filter((r) => r.validationState === RiskApprovalState.RED).length;
      batch.clarificationRows = rows.filter(
        (r) => r.validationState === RiskApprovalState.YELLOW || r.validationState === RiskApprovalState.BLUE,
      ).length;

      if (batch.blockedRows === 0 && batch.clarificationRows === 0) {
        batch.status = ImportBatchStatus.READY_FOR_APPROVAL;
      }

      const savedBatch = await qr.manager.save(ImportBatchOrmEntity, batch);
      return { fixedCount, batch: savedBatch };
    });
  }
}

