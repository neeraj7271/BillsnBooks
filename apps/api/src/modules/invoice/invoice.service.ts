
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { VoucherService } from '../voucher/voucher.service';
import { NumberingService } from '../numbering/numbering.service';
import { InvoiceOrmEntity } from '../../infrastructure/persistence/entities/invoice.orm-entity';
import { InvoiceItemOrmEntity } from '../../infrastructure/persistence/entities/invoice-item.orm-entity';
import { PartyOrmEntity } from '../../infrastructure/persistence/entities/party.orm-entity';
import { ItemOrmEntity } from '../../infrastructure/persistence/entities/item.orm-entity';
import { BranchOrmEntity } from '../../infrastructure/persistence/entities/branch.orm-entity';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { ApprovalRequestOrmEntity } from '../../infrastructure/persistence/entities/approval-request.orm-entity';
import { NotificationOrmEntity } from '../../infrastructure/persistence/entities/notification.orm-entity';
import {
  InvoiceDto,
  CreateInvoiceDto,
  InvoiceStatus,
  DocumentType,
  TaxClassification,
  ApprovalStatus,
  ApprovalRequestType,
  NotificationType,
  SupplyType,
  VoucherType,
  EntryType,
  PartyType,
  PartyRegistrationType,
} from '@platform/shared-types';
import {
  resolvePlaceOfSupply,
  calculateLineGst,
  isValidStateCode,
} from '@platform/gst-rules';
import { Decimal } from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

@Injectable()
export class InvoiceService {
  constructor(
    private readonly uow: UnitOfWorkService,
    private readonly voucherService: VoucherService,
    @Optional() private readonly numberingService?: NumberingService,
  ) {}

  async listInvoices(
    tenantId: string,
    companyId: string,
    filters?: {
      status?: InvoiceStatus;
      partyId?: string;
      fromDate?: string;
      toDate?: string;
      limit?: number;
    },
  ): Promise<InvoiceDto[]> {
    return this.uow.executeInTransaction(async (qr) => {
      const qb = qr.manager
        .createQueryBuilder(InvoiceOrmEntity, 'invoice')
        .leftJoinAndSelect('invoice.party', 'party')
        .leftJoinAndSelect('invoice.items', 'items')
        .where('invoice.tenant_id = :tenantId', { tenantId })
        .andWhere('invoice.company_id = :companyId', { companyId });

      if (filters?.status) {
        qb.andWhere('invoice.status = :status', { status: filters.status });
      }
      if (filters?.partyId) {
        qb.andWhere('invoice.party_id = :partyId', { partyId: filters.partyId });
      }
      if (filters?.fromDate) {
        qb.andWhere('invoice.invoice_date >= :fromDate', { fromDate: filters.fromDate });
      }
      if (filters?.toDate) {
        qb.andWhere('invoice.invoice_date <= :toDate', { toDate: filters.toDate });
      }

      qb.orderBy('invoice.created_at', 'DESC');
      if (filters?.limit) {
        qb.take(filters.limit);
      }

      const entities = await qb.getMany();
      return entities.map((e) => this.toDto(e));
    });
  }

  async getInvoice(
    tenantId: string,
    companyId: string,
    invoiceId: string,
  ): Promise<InvoiceDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const entity = await qr.manager.findOne(InvoiceOrmEntity, {
        where: { id: invoiceId, tenantId, companyId },
        relations: ['party', 'items', 'voucher', 'voucher.entries'],
      });

      if (!entity) {
        throw new NotFoundException(`Invoice with ID '${invoiceId}' not found.`);
      }

      return this.toDto(entity);
    });
  }

  /**
   * Preview the next sequential invoice number that will be assigned on save
   */
  async previewNextNumber(
    companyId: string,
    opts: {
      documentType?: DocumentType | string;
      branchId?: string;
      invoiceDate?: string;
    },
  ): Promise<{ invoiceNumber: string; isAuto: boolean; seriesPattern?: string }> {
    const documentType = (opts.documentType as DocumentType) || DocumentType.TAX_INVOICE;

    if (this.numberingService) {
      try {
        const activeSeries = await this.numberingService.getActiveSeriesForDocType(
          companyId,
          documentType,
          opts.branchId,
        );
        if (activeSeries) {
          const branch = opts.branchId
            ? await this.uow.executeInTransaction(async (qr) =>
                qr.manager.findOne(BranchOrmEntity, { where: { id: opts.branchId } }),
              )
            : null;

          const preview = await this.numberingService.previewNextNumber(activeSeries.id, {
            date: opts.invoiceDate,
            branchCode: branch?.stateCode,
          });
          return {
            invoiceNumber: preview.previewNumber,
            isAuto: !activeSeries.isManual,
            seriesPattern: preview.pattern,
          };
        }
      } catch {
        // Fall back to sequential count
      }
    }

    const prefix =
      documentType === DocumentType.PROFORMA_INVOICE
        ? 'PI'
        : documentType === DocumentType.DELIVERY_CHALLAN
          ? 'DC'
          : 'INV';

    const invoiceCount = await this.uow.executeInTransaction(async (qr) =>
      qr.manager.count(InvoiceOrmEntity, {
        where: { companyId, documentType },
      }),
    );

    const fallbackNumber = `${prefix}-${String(invoiceCount + 1).padStart(5, '0')}`;
    return {
      invoiceNumber: fallbackNumber,
      isAuto: true,
      seriesPattern: `${prefix}-{SEQ:5}`,
    };
  }

  async createInvoice(
    tenantId: string,
    companyId: string,
    userId: string,
    dto: CreateInvoiceDto,
  ): Promise<InvoiceDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('An invoice must contain at least one line item.');
    }

    return this.uow.executeInTransaction(async (qr) => {
      // 1. Verify party
      const party = await qr.manager.findOne(PartyOrmEntity, {
        where: { id: dto.partyId, tenantId, companyId },
      });
      if (!party) {
        throw new NotFoundException(`Customer party with ID '${dto.partyId}' not found.`);
      }

      // 2. Verify branch
      const branch = await qr.manager.findOne(BranchOrmEntity, {
        where: { id: dto.branchId, tenantId, companyId },
      });
      if (!branch) {
        throw new NotFoundException(`Branch with ID '${dto.branchId}' not found.`);
      }

      // 3. Resolve Place of Supply (POS)
      const supplierStateCode = branch.stateCode || '27';
      const posStateCode = dto.placeOfSupplyStateCode || party.billingStateCode || supplierStateCode;
      
      const posResult = resolvePlaceOfSupply({
        supplierStateCode,
        recipientStateCode: party.billingStateCode || posStateCode,
        placeOfSupplyStateCode: posStateCode,
      });

      // 4. Determine Document Type and Tax Classification
      const documentType = dto.documentType || DocumentType.TAX_INVOICE;
      const isRcm = dto.isRcm || false;
      const taxClassification = dto.taxClassification || TaxClassification.TAXABLE;
      const isZeroRatedOrExempt = [
        TaxClassification.NIL_RATED,
        TaxClassification.EXEMPT,
        TaxClassification.NON_GST,
      ].includes(taxClassification);

      // 5. Calculate line items with strict GST rules
      let subtotal = new Decimal(0);
      let totalCgst = new Decimal(0);
      let totalSgst = new Decimal(0);
      let totalIgst = new Decimal(0);
      let totalCess = new Decimal(0);

      const computedLineEntities: InvoiceItemOrmEntity[] = [];

      for (const itemInput of dto.items) {
        const qty = new Decimal(itemInput.quantity || 1);
        const unitPrice = new Decimal(itemInput.unitPrice || 0);
        const discountPct = new Decimal(itemInput.discountPercent || 0);

        const gross = qty.times(unitPrice);
        const discountAmount = gross.times(discountPct).dividedBy(100).toDecimalPlaces(4);
        const taxableAmount = gross.minus(discountAmount).toDecimalPlaces(4);

        const gstRate = isZeroRatedOrExempt
          ? new Decimal(0)
          : new Decimal(itemInput.gstRatePercent !== undefined ? itemInput.gstRatePercent : 18);
        const cessRate = isZeroRatedOrExempt
          ? new Decimal(0)
          : new Decimal(itemInput.cessRatePercent || 0);

        const taxBreakup = calculateLineGst({
          taxableValue: taxableAmount.toString(),
          gstRatePercent: gstRate.toString(),
          cessRatePercent: cessRate.toString(),
          posResult,
        });

        const lineCgst = new Decimal(taxBreakup.cgstAmount || 0);
        const lineSgst = new Decimal(taxBreakup.sgstAmount || 0);
        const lineIgst = new Decimal(taxBreakup.igstAmount || 0);
        const lineCess = new Decimal(taxBreakup.cessAmount || 0);
        const lineTotal = new Decimal(taxBreakup.totalValue || 0);

        subtotal = subtotal.plus(taxableAmount);
        totalCgst = totalCgst.plus(lineCgst);
        totalSgst = totalSgst.plus(lineSgst);
        totalIgst = totalIgst.plus(lineIgst);
        totalCess = totalCess.plus(lineCess);

        const lineItem = qr.manager.create(InvoiceItemOrmEntity, {
          tenantId,
          itemId: itemInput.itemId,
          description: itemInput.description || 'Taxable Supply',
          hsnSacCode: itemInput.hsnSacCode || '998311',
          quantity: qty,
          uom: itemInput.uom || 'NOS',
          unitPrice,
          discountPercent: discountPct,
          discountAmount,
          taxableAmount,
          gstRatePercent: gstRate,
          cgstAmount: lineCgst,
          sgstAmount: lineSgst,
          igstAmount: lineIgst,
          cessAmount: lineCess,
          totalAmount: lineTotal,
        });

        computedLineEntities.push(lineItem);
      }

      const totalBeforeRounding = subtotal
        .plus(totalCgst)
        .plus(totalSgst)
        .plus(totalIgst)
        .plus(totalCess);

      // Round to 2 decimal places
      const finalTotal = totalBeforeRounding.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      const roundOff = finalTotal.minus(totalBeforeRounding);

      // 6. Generate Sequential Number per Document Type or Use Custom Number
      const invoiceId = crypto.randomUUID();
      let invoiceNumber = (dto.customInvoiceNumber || dto.invoiceNumber)?.trim();

      if (invoiceNumber) {
        // Check for duplicate invoice number in this company
        const existing = await qr.manager.findOne(InvoiceOrmEntity, {
          where: { companyId, invoiceNumber },
        });
        if (existing) {
          throw new ConflictException(`Invoice number '${invoiceNumber}' already exists for this company.`);
        }
      } else {
        const prefix =
          documentType === DocumentType.PROFORMA_INVOICE
            ? 'PI'
            : documentType === DocumentType.DELIVERY_CHALLAN
              ? 'DC'
              : 'INV';
        const invoiceCount = await qr.manager.count(InvoiceOrmEntity, {
          where: { companyId, documentType },
        });
        invoiceNumber = `${prefix}-${String(invoiceCount + 1).padStart(5, '0')}`;

        if (this.numberingService) {
          try {
            const activeSeries = await this.numberingService.getActiveSeriesForDocType(
              companyId,
              documentType,
              dto.branchId,
            );
            if (activeSeries) {
              const alloc = await this.numberingService.allocateNextNumber(
                activeSeries.id,
                invoiceId,
                userId,
                {
                  date: dto.invoiceDate,
                  branchCode: branch.stateCode,
                },
                qr.manager,
              );
              invoiceNumber = alloc.allocatedNumber;
            }
          } catch {
            // Robust fallback
          }
        }
      }

      // 7. Status determination: Draft, Pending Approval, or Issued
      const isHighValue = finalTotal.greaterThanOrEqualTo(50000);
      const requiresApproval =
        documentType === DocumentType.TAX_INVOICE && (dto.requireApproval || isHighValue);

      let status = InvoiceStatus.ISSUED;
      let approvalStatus = ApprovalStatus.APPROVED;

      if (dto.isDraft) {
        status = InvoiceStatus.DRAFT;
        approvalStatus = ApprovalStatus.PENDING;
      } else if (requiresApproval) {
        status = InvoiceStatus.PENDING_APPROVAL;
        approvalStatus = ApprovalStatus.PENDING;
      }

      // 8. Capture Immutable Party Master Snapshot
      const partyRegType =
        (party.registrationType as PartyRegistrationType) ||
        (party.gstin ? PartyRegistrationType.REGULAR : PartyRegistrationType.UNREGISTERED);
      const isUnregistered =
        partyRegType === PartyRegistrationType.UNREGISTERED ||
        partyRegType === PartyRegistrationType.OVERSEAS;
      const partyGstinSnapshot = isUnregistered ? null : (party.gstin || null);

      const billingSnapshot = {
        addressLine1: party.billingAddressLine1 || '',
        addressLine2: party.billingAddressLine2 || '',
        city: party.billingCity || '',
        state: party.billingState || '',
        stateCode: party.billingStateCode || '27',
        pincode: party.billingPincode || '',
      };

      const shippingSnapshot = {
        addressLine1: party.shippingAddressLine1 || party.billingAddressLine1 || '',
        city: party.shippingCity || party.billingCity || '',
        stateCode: party.shippingStateCode || party.billingStateCode || '27',
        pincode: party.shippingPincode || party.billingPincode || '',
      };

      // 9. Save Invoice with Immutable Snapshots
      const invoice = qr.manager.create(InvoiceOrmEntity, {
        id: invoiceId,
        tenantId,
        companyId,
        branchId: dto.branchId,
        financialYearId: dto.financialYearId,
        partyId: dto.partyId,
        partyNameSnapshot: party.name,
        partyTradeNameSnapshot: party.tradeName || null,
        partyRegistrationTypeSnapshot: partyRegType,
        partyGstinSnapshot: partyGstinSnapshot || undefined,
        partyPanSnapshot: party.pan || null,
        billingAddressSnapshot: billingSnapshot,
        shippingAddressSnapshot: shippingSnapshot,
        taxRuleVersionSnapshot: 'GST-2024.11-IN',
        invoiceNumber,
        invoiceDate: dto.invoiceDate,
        dueDate: dto.dueDate || dto.invoiceDate,
        status,
        documentType,
        isRcm,
        taxClassification,
        promiseToPayDate: dto.promiseToPayDate,
        promiseToPayNotes: dto.promiseToPayNotes,
        supplyType: posResult.supplyType,
        placeOfSupplyStateCode: posStateCode,
        subtotalAmount: subtotal,
        cgstAmount: totalCgst,
        sgstAmount: totalSgst,
        igstAmount: totalIgst,
        cessAmount: totalCess,
        roundOffAmount: roundOff,
        totalAmount: finalTotal,
        notes: dto.notes,
        termsAndConditions: dto.termsAndConditions,
        idempotencyKey: dto.idempotencyKey,
        approvalStatus,
        items: computedLineEntities,
      } as any);

      invoice.party = party;
      const savedInvoice = await qr.manager.save(invoice);

      // 9. If Pending Approval, create ApprovalRequest
      if (status === InvoiceStatus.PENDING_APPROVAL) {
        const approvalReq = qr.manager.create(ApprovalRequestOrmEntity, {
          tenantId,
          companyId,
          entityType: 'INVOICE',
          entityId: savedInvoice.id,
          requestType: ApprovalRequestType.HIGH_VALUE_INVOICE,
          requestedBy: userId,
          status: ApprovalStatus.PENDING,
          comments: `Invoice #${invoiceNumber} for ₹${finalTotal.toFixed(2)} requires partner approval.`,
          metadata: {
            invoiceNumber,
            totalAmount: finalTotal.toFixed(2),
            partyName: party.name,
          },
        });
        await qr.manager.save(approvalReq);

        // Create notification
        const notification = qr.manager.create(NotificationOrmEntity, {
          tenantId,
          userId,
          title: 'Invoice Submitted for Approval',
          message: `Invoice #${invoiceNumber} to ${party.name} for ₹${finalTotal.toFixed(2)} has been submitted for approval.`,
          type: NotificationType.APPROVAL_REQUIRED,
          entityType: 'INVOICE',
          entityId: savedInvoice.id,
        });
        await qr.manager.save(notification);

        return this.toDto(savedInvoice);
      }

      // 9a. If Draft, save and return without GL entries or approval request
      if (status === InvoiceStatus.DRAFT) {
        const notification = qr.manager.create(NotificationOrmEntity, {
          tenantId,
          userId,
          title: 'Invoice Draft Saved',
          message: `Draft invoice #${invoiceNumber} for ₹${finalTotal.toFixed(2)} saved. Not posted to general ledger.`,
          type: NotificationType.INVOICE_ISSUED,
          entityType: 'INVOICE',
          entityId: savedInvoice.id,
        });
        await qr.manager.save(notification);

        return this.toDto(savedInvoice);
      }

      // 10. For Proforma or Delivery Challan, do NOT post to General Ledger
      if (documentType !== DocumentType.TAX_INVOICE) {
        const notification = qr.manager.create(NotificationOrmEntity, {
          tenantId,
          userId,
          title: `${documentType === DocumentType.PROFORMA_INVOICE ? 'Proforma Invoice' : 'Delivery Challan'} Created`,
          message: `${invoiceNumber} to ${party.name} for ₹${finalTotal.toFixed(2)} created. Ready for conversion.`,
          type: NotificationType.INVOICE_ISSUED,
          entityType: 'INVOICE',
          entityId: savedInvoice.id,
        });
        await qr.manager.save(notification);

        return this.toDto(savedInvoice);
      }

      // 11. If directly Issued Tax Invoice, Post Canonical Double-Entry Voucher
      const voucher = await this.postSalesVoucherForInvoice(
        qr,
        tenantId,
        companyId,
        userId,
        savedInvoice,
        party,
      );

      savedInvoice.voucherId = voucher.id;
      await qr.manager.save(savedInvoice);

      // Notification
      const notification = qr.manager.create(NotificationOrmEntity, {
        tenantId,
        userId,
        title: 'Invoice Issued & Posted',
        message: `Invoice #${invoiceNumber} to ${party.name} for ₹${finalTotal.toFixed(2)} posted to books (Voucher ${voucher.voucherNumber}).`,
        type: NotificationType.INVOICE_ISSUED,
        entityType: 'INVOICE',
        entityId: savedInvoice.id,
      });
      await qr.manager.save(notification);

      return this.toDto(savedInvoice);
    });
  }

  async updateInvoice(
    tenantId: string,
    companyId: string,
    userId: string,
    invoiceId: string,
    dto: CreateInvoiceDto,
  ): Promise<InvoiceDto> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('An invoice must contain at least one line item.');
    }

    return this.uow.executeInTransaction(async (qr) => {
      const invoice = await qr.manager.findOne(InvoiceOrmEntity, {
        where: { id: invoiceId, tenantId, companyId },
        relations: ['items'],
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice with ID '${invoiceId}' not found.`);
      }

      if (
        invoice.status === InvoiceStatus.ISSUED ||
        invoice.status === InvoiceStatus.CANCELLED
      ) {
        throw new BadRequestException(
          `Invoices in '${invoice.status}' status cannot be edited directly under statutory accounting rules. Issue a Credit Note under Section 34 or cancel the invoice.`,
        );
      }

      // 1. Verify party
      const party = await qr.manager.findOne(PartyOrmEntity, {
        where: { id: dto.partyId, tenantId, companyId },
      });
      if (!party) {
        throw new NotFoundException(`Customer party with ID '${dto.partyId}' not found.`);
      }

      // 2. Verify branch
      const branch = await qr.manager.findOne(BranchOrmEntity, {
        where: { id: dto.branchId, tenantId, companyId },
      });
      if (!branch) {
        throw new NotFoundException(`Branch with ID '${dto.branchId}' not found.`);
      }

      // 3. Resolve Place of Supply
      const supplierStateCode = branch.stateCode || '27';
      const posStateCode = dto.placeOfSupplyStateCode || party.billingStateCode || supplierStateCode;
      const posResult = resolvePlaceOfSupply({
        supplierStateCode,
        recipientStateCode: party.billingStateCode || posStateCode,
        placeOfSupplyStateCode: posStateCode,
      });

      const documentType = dto.documentType || invoice.documentType || DocumentType.TAX_INVOICE;
      const isRcm = dto.isRcm !== undefined ? dto.isRcm : invoice.isRcm;
      const taxClassification = dto.taxClassification || invoice.taxClassification || TaxClassification.TAXABLE;
      const isZeroRatedOrExempt = [
        TaxClassification.NIL_RATED,
        TaxClassification.EXEMPT,
        TaxClassification.NON_GST,
      ].includes(taxClassification);

      // 4. Delete old line items
      await qr.manager.delete(InvoiceItemOrmEntity, { invoiceId: invoice.id });

      // 5. Calculate new line items with strict GST rules
      let subtotal = new Decimal(0);
      let totalCgst = new Decimal(0);
      let totalSgst = new Decimal(0);
      let totalIgst = new Decimal(0);
      let totalCess = new Decimal(0);

      const computedLineEntities: InvoiceItemOrmEntity[] = [];

      for (const itemInput of dto.items) {
        const qty = new Decimal(itemInput.quantity || 1);
        const unitPrice = new Decimal(itemInput.unitPrice || 0);
        const discountPct = new Decimal(itemInput.discountPercent || 0);

        const gross = qty.times(unitPrice);
        const discountAmount = gross.times(discountPct).dividedBy(100).toDecimalPlaces(4);
        const taxableAmount = gross.minus(discountAmount).toDecimalPlaces(4);

        const gstRate = isZeroRatedOrExempt
          ? new Decimal(0)
          : new Decimal(itemInput.gstRatePercent !== undefined ? itemInput.gstRatePercent : 18);
        const cessRate = isZeroRatedOrExempt
          ? new Decimal(0)
          : new Decimal(itemInput.cessRatePercent || 0);

        const taxBreakup = calculateLineGst({
          taxableValue: taxableAmount.toString(),
          gstRatePercent: gstRate.toString(),
          cessRatePercent: cessRate.toString(),
          posResult,
        });

        const lineCgst = new Decimal(taxBreakup.cgstAmount || 0);
        const lineSgst = new Decimal(taxBreakup.sgstAmount || 0);
        const lineIgst = new Decimal(taxBreakup.igstAmount || 0);
        const lineCess = new Decimal(taxBreakup.cessAmount || 0);
        const lineTotal = new Decimal(taxBreakup.totalValue || 0);

        subtotal = subtotal.plus(taxableAmount);
        totalCgst = totalCgst.plus(lineCgst);
        totalSgst = totalSgst.plus(lineSgst);
        totalIgst = totalIgst.plus(lineIgst);
        totalCess = totalCess.plus(lineCess);

        const lineItem = qr.manager.create(InvoiceItemOrmEntity, {
          tenantId,
          itemId: itemInput.itemId,
          description: itemInput.description || 'Taxable Supply',
          hsnSacCode: itemInput.hsnSacCode || '998311',
          quantity: qty,
          uom: itemInput.uom || 'NOS',
          unitPrice,
          discountPercent: discountPct,
          discountAmount,
          taxableAmount,
          gstRatePercent: gstRate,
          cgstAmount: lineCgst,
          sgstAmount: lineSgst,
          igstAmount: lineIgst,
          cessAmount: lineCess,
          totalAmount: lineTotal,
          invoiceId: invoice.id,
        });

        computedLineEntities.push(lineItem);
      }

      await qr.manager.save(InvoiceItemOrmEntity, computedLineEntities);

      const totalTax = totalCgst.plus(totalSgst).plus(totalIgst).plus(totalCess);
      const totalBeforeRounding = subtotal.plus(totalTax);
      const finalTotal = totalBeforeRounding.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      const roundOff = finalTotal.minus(totalBeforeRounding);

      // 6. Update Snapshots & Header
      const partyRegType =
        (party.registrationType as PartyRegistrationType) ||
        (party.gstin ? PartyRegistrationType.REGULAR : PartyRegistrationType.UNREGISTERED);
      const isUnregistered =
        partyRegType === PartyRegistrationType.UNREGISTERED ||
        partyRegType === PartyRegistrationType.OVERSEAS;
      const partyGstinSnapshot = isUnregistered ? null : (party.gstin || null);

      invoice.branchId = dto.branchId;
      invoice.financialYearId = dto.financialYearId;
      invoice.partyId = dto.partyId;
      invoice.partyNameSnapshot = party.name;
      invoice.partyTradeNameSnapshot = party.tradeName || undefined;
      invoice.partyRegistrationTypeSnapshot = partyRegType;
      invoice.partyGstinSnapshot = partyGstinSnapshot || undefined;
      invoice.partyPanSnapshot = party.pan || undefined;
      invoice.invoiceDate = dto.invoiceDate;
      invoice.dueDate = dto.dueDate || dto.invoiceDate;
      invoice.documentType = documentType;
      invoice.isRcm = isRcm;
      invoice.taxClassification = taxClassification;
      invoice.supplyType = posResult.supplyType;
      invoice.placeOfSupplyStateCode = posStateCode;
      invoice.subtotalAmount = subtotal;
      invoice.cgstAmount = totalCgst;
      invoice.sgstAmount = totalSgst;
      invoice.igstAmount = totalIgst;
      invoice.cessAmount = totalCess;
      invoice.roundOffAmount = roundOff;
      invoice.totalAmount = finalTotal;
      invoice.notes = dto.notes;
      invoice.termsAndConditions = dto.termsAndConditions;

      // Transition handling for Draft / Pending Invoices
      if (invoice.status === InvoiceStatus.DRAFT) {
        if (!dto.isDraft) {
          const isHighValue = finalTotal.greaterThanOrEqualTo(50000);
          if (dto.requireApproval || isHighValue) {
            invoice.status = InvoiceStatus.PENDING_APPROVAL;
          } else {
            invoice.status = InvoiceStatus.ISSUED;
            const voucher = await this.postSalesVoucherForInvoice(
              qr,
              tenantId,
              companyId,
              userId,
              invoice,
              party,
            );
            invoice.voucherId = voucher.id;
          }
        }
      } else {
        // Maker-Checker Threshold Check
        const makerCheckerThreshold = new Decimal(50000);
        if (finalTotal.greaterThanOrEqualTo(makerCheckerThreshold)) {
          invoice.status = InvoiceStatus.PENDING_APPROVAL;
        }
      }

      const updated = await qr.manager.save(invoice);
      updated.items = computedLineEntities;
      return this.toDto(updated);
    });
  }

  async approveInvoice(
    tenantId: string,
    companyId: string,
    approverId: string,
    invoiceId: string,
    comments?: string,
  ): Promise<InvoiceDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const invoice = await qr.manager.findOne(InvoiceOrmEntity, {
        where: { id: invoiceId, tenantId, companyId },
        relations: ['party', 'items'],
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice '${invoiceId}' not found.`);
      }

      if (invoice.approvalStatus === ApprovalStatus.APPROVED && invoice.status === InvoiceStatus.ISSUED) {
        return this.toDto(invoice);
      }

      invoice.approvalStatus = ApprovalStatus.APPROVED;
      invoice.approvedBy = approverId;
      invoice.approvedAt = new Date();
      invoice.status = InvoiceStatus.ISSUED;

      // Update approval request
      const approvalReq = await qr.manager.findOne(ApprovalRequestOrmEntity, {
        where: { entityId: invoiceId, tenantId, status: ApprovalStatus.PENDING },
      });
      if (approvalReq) {
        approvalReq.status = ApprovalStatus.APPROVED;
        approvalReq.approverId = approverId;
        approvalReq.actionTimestamp = new Date();
        approvalReq.comments = comments || 'Approved';
        await qr.manager.save(approvalReq);
      }

      // Post Canonical Double-Entry Voucher
      const voucher = await this.postSalesVoucherForInvoice(
        qr,
        tenantId,
        companyId,
        approverId,
        invoice,
        invoice.party,
      );

      invoice.voucherId = voucher.id;
      const updatedInvoice = await qr.manager.save(invoice);

      // Notification
      const notification = qr.manager.create(NotificationOrmEntity, {
        tenantId,
        userId: approvalReq?.requestedBy || approverId,
        title: 'Invoice Approved & Posted',
        message: `Invoice #${invoice.invoiceNumber} has been approved and posted to canonical books.`,
        type: NotificationType.APPROVAL_RESOLVED,
        entityType: 'INVOICE',
        entityId: invoice.id,
      });
      await qr.manager.save(notification);

      return this.toDto(updatedInvoice);
    });
  }

  async rejectInvoice(
    tenantId: string,
    companyId: string,
    approverId: string,
    invoiceId: string,
    reason: string,
  ): Promise<InvoiceDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const invoice = await qr.manager.findOne(InvoiceOrmEntity, {
        where: { id: invoiceId, tenantId, companyId },
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice '${invoiceId}' not found.`);
      }

      invoice.approvalStatus = ApprovalStatus.REJECTED;
      invoice.rejectionReason = reason;
      invoice.status = InvoiceStatus.CANCELLED;

      const approvalReq = await qr.manager.findOne(ApprovalRequestOrmEntity, {
        where: { entityId: invoiceId, tenantId, status: ApprovalStatus.PENDING },
      });
      if (approvalReq) {
        approvalReq.status = ApprovalStatus.REJECTED;
        approvalReq.approverId = approverId;
        approvalReq.actionTimestamp = new Date();
        approvalReq.comments = reason;
        await qr.manager.save(approvalReq);
      }

      const updated = await qr.manager.save(invoice);
      return this.toDto(updated);
    });
  }

  async convertToTaxInvoice(
    tenantId: string,
    companyId: string,
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const invoice = await qr.manager.findOne(InvoiceOrmEntity, {
        where: { id: invoiceId, tenantId, companyId },
        relations: ['party', 'items'],
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice '${invoiceId}' not found.`);
      }

      if (invoice.documentType === DocumentType.TAX_INVOICE) {
        throw new BadRequestException('Document is already a Tax Invoice.');
      }

      // Generate next sequential Tax Invoice number
      const invoiceCount = await qr.manager.count(InvoiceOrmEntity, {
        where: { companyId, documentType: DocumentType.TAX_INVOICE },
      });
      const newInvoiceNumber = `INV-${String(invoiceCount + 1).padStart(5, '0')}`;

      invoice.documentType = DocumentType.TAX_INVOICE;
      invoice.invoiceNumber = newInvoiceNumber;
      invoice.status = InvoiceStatus.ISSUED;

      // Post double-entry voucher
      const voucher = await this.postSalesVoucherForInvoice(
        qr,
        tenantId,
        companyId,
        userId,
        invoice,
        invoice.party,
      );

      invoice.voucherId = voucher.id;
      const updated = await qr.manager.save(invoice);

      return this.toDto(updated);
    });
  }

  async setPromiseToPay(
    tenantId: string,
    companyId: string,
    invoiceId: string,
    dto: { promiseToPayDate?: string; promiseToPayNotes?: string },
  ): Promise<InvoiceDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const invoice = await qr.manager.findOne(InvoiceOrmEntity, {
        where: { id: invoiceId, tenantId, companyId },
        relations: ['party', 'items'],
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice '${invoiceId}' not found.`);
      }

      invoice.promiseToPayDate = dto.promiseToPayDate;
      invoice.promiseToPayNotes = dto.promiseToPayNotes;

      const updated = await qr.manager.save(invoice);
      return this.toDto(updated);
    });
  }

  async cancelInvoice(
    tenantId: string,
    companyId: string,
    invoiceId: string,
    userId: string,
    reason: string,
  ): Promise<InvoiceDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const invoice = await qr.manager.findOne(InvoiceOrmEntity, {
        where: { id: invoiceId, tenantId, companyId },
        relations: ['party', 'items'],
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice '${invoiceId}' not found.`);
      }

      if (invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException('Invoice is already cancelled.');
      }

      invoice.status = InvoiceStatus.CANCELLED;
      const updated = await qr.manager.save(invoice);

      if (this.numberingService) {
        try {
          await this.numberingService.cancelNumber(invoice.id, reason, userId, qr.manager);
        } catch {
          // If no allocation was registered, preserve clean cancellation
        }
      }

      return this.toDto(updated);
    });
  }

  private async postSalesVoucherForInvoice(
    qr: any,
    tenantId: string,
    companyId: string,
    userId: string,
    invoice: InvoiceOrmEntity,
    party: PartyOrmEntity,
  ) {
    // 1. Resolve Customer Ledger (Debtor)
    let customerLedgerId = party.ledgerId;
    if (!customerLedgerId) {
      const defaultDebtor = await qr.manager
        .createQueryBuilder(LedgerOrmEntity, 'ledger')
        .innerJoin('ledger.group', 'grp')
        .where('ledger.tenant_id = :tenantId', { tenantId })
        .andWhere('ledger.company_id = :companyId', { companyId })
        .andWhere('grp.name ILIKE :grp', { grp: '%Debtor%' })
        .getOne();

      if (!defaultDebtor) {
        throw new BadRequestException('No Sundry Debtors ledger configured for invoicing.');
      }
      customerLedgerId = defaultDebtor.id;
    }

    // 2. Resolve Sales Ledger
    const salesLedger = await qr.manager
      .createQueryBuilder(LedgerOrmEntity, 'ledger')
      .where('ledger.tenant_id = :tenantId', { tenantId })
      .andWhere('ledger.company_id = :companyId', { companyId })
      .andWhere('ledger.name ILIKE :name', { name: '%Sales%' })
      .getOne();

    if (!salesLedger) {
      throw new BadRequestException('No Sales ledger account found for company.');
    }

    // 3. Resolve Tax Ledgers (CGST, SGST, IGST)
    const ledgers = await qr.manager
      .createQueryBuilder(LedgerOrmEntity, 'ledger')
      .where('ledger.tenant_id = :tenantId', { tenantId })
      .andWhere('ledger.company_id = :companyId', { companyId })
      .getMany();

    const cgstLedger = ledgers.find((l: LedgerOrmEntity) => l.name.toUpperCase().includes('CGST'));
    const sgstLedger = ledgers.find((l: LedgerOrmEntity) => l.name.toUpperCase().includes('SGST'));
    const igstLedger = ledgers.find((l: LedgerOrmEntity) => l.name.toUpperCase().includes('IGST'));

    if (!customerLedgerId) {
      throw new BadRequestException('No Sundry Debtors ledger configured for invoicing.');
    }

    const totalAmountDec = new Decimal(invoice.totalAmount || 0);
    const subtotalAmountDec = new Decimal(invoice.subtotalAmount || 0);
    const cgstAmountDec = new Decimal(invoice.cgstAmount || 0);
    const sgstAmountDec = new Decimal(invoice.sgstAmount || 0);
    const igstAmountDec = new Decimal(invoice.igstAmount || 0);
    const cessAmountDec = new Decimal(invoice.cessAmount || 0);

    const entries: { ledgerId: string; entryType: EntryType; amount: string }[] = [];

    // Debit: Customer (Total Amount)
    entries.push({
      ledgerId: customerLedgerId,
      entryType: EntryType.DEBIT,
      amount: totalAmountDec.toFixed(4),
    });

    // Credit: Sales Account (Subtotal Taxable Amount)
    entries.push({
      ledgerId: salesLedger.id,
      entryType: EntryType.CREDIT,
      amount: subtotalAmountDec.toFixed(4),
    });

    // Credit: CGST (if intra-state)
    if (cgstAmountDec.greaterThan(0) && cgstLedger) {
      entries.push({
        ledgerId: cgstLedger.id,
        entryType: EntryType.CREDIT,
        amount: cgstAmountDec.toFixed(4),
      });
    }

    // Credit: SGST (if intra-state)
    if (sgstAmountDec.greaterThan(0) && sgstLedger) {
      entries.push({
        ledgerId: sgstLedger.id,
        entryType: EntryType.CREDIT,
        amount: sgstAmountDec.toFixed(4),
      });
    }

    // Credit: IGST (if inter-state)
    if (igstAmountDec.greaterThan(0) && igstLedger) {
      entries.push({
        ledgerId: igstLedger.id,
        entryType: EntryType.CREDIT,
        amount: igstAmountDec.toFixed(4),
      });
    }

    // Invariant check: Sum(Debits) === Sum(Credits)
    let debits = new Decimal(0);
    let credits = new Decimal(0);
    for (const entry of entries) {
      if (entry.entryType === EntryType.DEBIT) {
        debits = debits.plus(new Decimal(entry.amount));
      } else {
        credits = credits.plus(new Decimal(entry.amount));
      }
    }

    const variance = debits.minus(credits);
    if (!variance.isZero()) {
      // Adjust into sales credit line so double-entry invariant is perfectly satisfied (variance = 0.0000)
      const salesIdx = entries.findIndex((e) => e.ledgerId === salesLedger.id);
      if (salesIdx >= 0) {
        const adjustedSales = new Decimal(entries[salesIdx]!.amount).plus(variance);
        entries[salesIdx]!.amount = adjustedSales.toFixed(4);
      }
    }

    return await this.voucherService.createAndPostVoucher(
      tenantId,
      companyId,
      userId,
      {
        branchId: invoice.branchId,
        financialYearId: invoice.financialYearId,
        voucherType: VoucherType.SALES,
        voucherDate: invoice.invoiceDate,
        narration: `Tax Invoice #${invoice.invoiceNumber} to ${party.name}`,
        entries,
      },
      `invoice-voucher-${invoice.id}`,
    );
  }

  private toDto(inv: InvoiceOrmEntity): InvoiceDto {
    const isUnreg =
      inv.partyRegistrationTypeSnapshot === 'UNREGISTERED' ||
      inv.partyRegistrationTypeSnapshot === 'OVERSEAS' ||
      inv.party?.registrationType === PartyRegistrationType.UNREGISTERED;

    const resolvedGstin = isUnreg
      ? undefined
      : inv.partyGstinSnapshot || inv.party?.gstin || undefined;

    return {
      id: inv.id,
      tenantId: inv.tenantId,
      companyId: inv.companyId,
      branchId: inv.branchId,
      financialYearId: inv.financialYearId,
      partyId: inv.partyId,
      partyNameSnapshot: inv.partyNameSnapshot || inv.party?.name,
      partyTradeNameSnapshot: inv.partyTradeNameSnapshot || inv.party?.tradeName,
      partyRegistrationTypeSnapshot:
        (inv.partyRegistrationTypeSnapshot as PartyRegistrationType) ||
        inv.party?.registrationType ||
        (inv.party?.gstin ? PartyRegistrationType.REGULAR : PartyRegistrationType.UNREGISTERED),
      partyGstinSnapshot: isUnreg ? undefined : (inv.partyGstinSnapshot || inv.party?.gstin || undefined),
      partyPanSnapshot: inv.partyPanSnapshot || inv.party?.pan,
      billingAddressSnapshot: inv.billingAddressSnapshot,
      shippingAddressSnapshot: inv.shippingAddressSnapshot,
      taxRuleVersionSnapshot: inv.taxRuleVersionSnapshot,
      taxRateSourcesSnapshot: inv.taxRateSourcesSnapshot,
      party: inv.party || inv.partyNameSnapshot
        ? {
            id: inv.party?.id || inv.partyId,
            name: inv.partyNameSnapshot || inv.party?.name || '',
            tradeName: inv.partyTradeNameSnapshot || inv.party?.tradeName,
            partyType: inv.party?.partyType || PartyType.CUSTOMER,
            registrationType:
              (inv.partyRegistrationTypeSnapshot as PartyRegistrationType) ||
              inv.party?.registrationType ||
              PartyRegistrationType.UNREGISTERED,
            currency: inv.party?.currency || 'INR',
            gstin: resolvedGstin,
            pan: inv.partyPanSnapshot || inv.party?.pan,
            email: inv.party?.email,
            phone: inv.party?.phone,
            billingAddressLine1:
              (inv.billingAddressSnapshot as any)?.addressLine1 || inv.party?.billingAddressLine1,
            billingCity:
              (inv.billingAddressSnapshot as any)?.city || inv.party?.billingCity,
            billingState:
              (inv.billingAddressSnapshot as any)?.state || inv.party?.billingState,
            billingStateCode:
              (inv.billingAddressSnapshot as any)?.stateCode || inv.party?.billingStateCode,
            billingPincode:
              (inv.billingAddressSnapshot as any)?.pincode || inv.party?.billingPincode,
          }
        : undefined,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      status: inv.status,
      documentType: inv.documentType || DocumentType.TAX_INVOICE,
      isRcm: inv.isRcm || false,
      taxClassification: inv.taxClassification || TaxClassification.TAXABLE,
      promiseToPayDate: inv.promiseToPayDate,
      promiseToPayNotes: inv.promiseToPayNotes,
      supplyType: inv.supplyType,
      placeOfSupplyStateCode: inv.placeOfSupplyStateCode,
      subtotalAmount: inv.subtotalAmount ? new Decimal(inv.subtotalAmount).toFixed(2) : '0.00',
      cgstAmount: inv.cgstAmount ? new Decimal(inv.cgstAmount).toFixed(2) : '0.00',
      sgstAmount: inv.sgstAmount ? new Decimal(inv.sgstAmount).toFixed(2) : '0.00',
      igstAmount: inv.igstAmount ? new Decimal(inv.igstAmount).toFixed(2) : '0.00',
      cessAmount: inv.cessAmount ? new Decimal(inv.cessAmount).toFixed(2) : '0.00',
      roundOffAmount: inv.roundOffAmount ? new Decimal(inv.roundOffAmount).toFixed(2) : '0.00',
      totalAmount: inv.totalAmount ? new Decimal(inv.totalAmount).toFixed(2) : '0.00',
      notes: inv.notes,
      termsAndConditions: inv.termsAndConditions,
      voucherId: inv.voucherId,
      approvalStatus: inv.approvalStatus,
      approvedBy: inv.approvedBy,
      approvedAt: inv.approvedAt?.toISOString(),
      rejectionReason: inv.rejectionReason,
      items: inv.items
        ? inv.items.map((it) => ({
            id: it.id,
            itemId: it.itemId,
            description: it.description,
            hsnSacCode: it.hsnSacCode,
            quantity: it.quantity ? it.quantity.toFixed(2) : '1.00',
            uom: it.uom,
            unitPrice: it.unitPrice ? it.unitPrice.toFixed(2) : '0.00',
            discountPercent: it.discountPercent ? it.discountPercent.toFixed(2) : '0.00',
            discountAmount: it.discountAmount ? it.discountAmount.toFixed(2) : '0.00',
            taxableAmount: it.taxableAmount ? it.taxableAmount.toFixed(2) : '0.00',
            gstRatePercent: it.gstRatePercent ? it.gstRatePercent.toFixed(2) : '0.00',
            cgstAmount: it.cgstAmount ? it.cgstAmount.toFixed(2) : '0.00',
            sgstAmount: it.sgstAmount ? it.sgstAmount.toFixed(2) : '0.00',
            igstAmount: it.igstAmount ? it.igstAmount.toFixed(2) : '0.00',
            cessAmount: it.cessAmount ? it.cessAmount.toFixed(2) : '0.00',
            totalAmount: it.totalAmount ? it.totalAmount.toFixed(2) : '0.00',
          }))
        : [],
      createdAt: inv.createdAt?.toISOString(),
      updatedAt: inv.updatedAt?.toISOString(),
    };
  }
}
