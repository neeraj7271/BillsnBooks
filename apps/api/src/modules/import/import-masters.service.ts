import { Injectable, BadRequestException } from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { PartyOrmEntity } from '../../infrastructure/persistence/entities/party.orm-entity';
import { ItemOrmEntity } from '../../infrastructure/persistence/entities/item.orm-entity';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import {
  PartyType,
  PartyRegistrationType,
  ItemType,
  GST_STATUTORY_UOM_LIST,
  GST_UQC_ALIASES,
  normalizeGstUqc,
} from '@platform/shared-types';
import { validateGstin, isValidStateCode } from '@platform/gst-rules';
import { Decimal } from 'decimal.js';

export interface MissingPartyItem {
  name: string;
  partyType: PartyType;
  gstin?: string;
  pan?: string;
  stateCode?: string;
  registrationType: PartyRegistrationType;
}

export interface MissingProductItem {
  name: string;
  itemType: ItemType;
  hsnSac?: string;
  uqc: string;
  taxRate: number;
  price?: number;
}

export interface MissingMastersScanResult {
  hasMissingMasters: boolean;
  missingParties: MissingPartyItem[];
  missingItems: MissingProductItem[];
  unmappedUnits: { rawUnit: string; suggestedUqc: string }[];
  existingPartiesCount: number;
  existingItemsCount: number;
}

export interface BulkResolveMastersDto {
  parties?: {
    name: string;
    partyType: PartyType;
    gstin?: string;
    pan?: string;
    stateCode: string;
    registrationType?: PartyRegistrationType;
  }[];
  items?: {
    name: string;
    itemType: ItemType;
    hsnSac?: string;
    uqc: string;
    taxRate: number;
    price?: number;
  }[];
}

@Injectable()
export class ImportMastersService {
  constructor(private readonly uow: UnitOfWorkService) {}

  /**
   * Scans parsed rows for parties, items, and units not currently in the database
   */
  public async scanMissingMasters(
    tenantId: string,
    companyId: string,
    rows: Record<string, any>[],
    importType: 'SALES' | 'PURCHASE' = 'SALES',
  ): Promise<MissingMastersScanResult> {
    return this.uow.executeInTransaction(async (qr) => {
      // 1. Collect unique names and metadata from rows
      const partyMap = new Map<string, { gstin?: string; pos?: string }>();
      const itemMap = new Map<string, { hsn?: string; uqc?: string; taxRate?: number; price?: number }>();
      const rawUnits = new Set<string>();

      for (const row of rows) {
        const partyName = String(row.partyName || row['Customer Name'] || row['Vendor Name'] || '').trim();
        const gstin = String(row.partyGstin || row.gstin || row['Customer GSTIN'] || row['Vendor GSTIN'] || '').trim().toUpperCase();
        const pos = String(row.placeOfSupply || row['Place of Supply'] || '').trim();

        if (partyName) {
          if (!partyMap.has(partyName.toLowerCase())) {
            partyMap.set(partyName.toLowerCase(), { gstin: gstin || undefined, pos: pos || undefined });
          }
        }

        const itemName = String(row.itemName || row['Item Name'] || '').trim();
        const hsn = String(row.hsnCode || row['HSN / SAC Code'] || row.hsn || '').trim();
        const uqc = String(row.uqc || row['Unit (UQC)'] || row.uom || '').trim().toUpperCase();
        const taxRate = parseFloat(row.taxRate || row['Tax Rate %'] || '18') || 18;
        const rate = parseFloat(row.rate || row.price || row['Unit Price / Rate'] || '0') || 0;

        if (itemName) {
          if (!itemMap.has(itemName.toLowerCase())) {
            itemMap.set(itemName.toLowerCase(), {
              hsn: hsn || undefined,
              uqc: uqc || 'NOS',
              taxRate,
              price: rate,
            });
          }
        }

        if (uqc) {
          rawUnits.add(uqc);
        }
      }

      // 2. Query Existing Parties
      const existingParties = await qr.manager.find(PartyOrmEntity, {
        where: { tenantId, companyId, isActive: true },
        select: ['id', 'name', 'gstin'],
      });
      const existingPartyNames = new Set(existingParties.map((p) => p.name.trim().toLowerCase()));
      const existingPartyGstins = new Set(existingParties.filter((p) => p.gstin).map((p) => p.gstin!.toUpperCase()));

      // 3. Query Existing Items
      const existingItems = await qr.manager.find(ItemOrmEntity, {
        where: { tenantId, companyId, isActive: true },
        select: ['id', 'name', 'itemCode'],
      });
      const existingItemNames = new Set(existingItems.map((i) => i.name.trim().toLowerCase()));

      // 4. Identify Missing Parties
      const missingParties: MissingPartyItem[] = [];
      const defaultPartyType = importType === 'PURCHASE' ? PartyType.VENDOR : PartyType.CUSTOMER;

      for (const [lowerName, meta] of partyMap.entries()) {
        const isNameFound = existingPartyNames.has(lowerName);

        if (!isNameFound) {
          const originalName = rows.find((r) => {
            const n = String(r.partyName || r['Customer Name'] || r['Vendor Name'] || '').trim();
            return n.toLowerCase() === lowerName;
          });
          const displayName = originalName
            ? String(originalName.partyName || originalName['Customer Name'] || originalName['Vendor Name']).trim()
            : lowerName;

          let stateCode = '27';
          let pan: string | undefined;
          let registrationType = PartyRegistrationType.UNREGISTERED;

          if (meta.gstin && meta.gstin.length >= 2) {
            const rawState = meta.gstin.substring(0, 2);
            if (isValidStateCode(rawState)) {
              stateCode = rawState;
            }
            const gstinResult = validateGstin(meta.gstin);
            if (gstinResult.isValid) {
              stateCode = gstinResult.stateCode || rawState;
              pan = gstinResult.pan;
              registrationType = PartyRegistrationType.REGULAR;
            } else {
              registrationType = PartyRegistrationType.REGULAR;
              pan = meta.gstin.length >= 12 ? meta.gstin.substring(2, 12) : undefined;
            }
          } else if (meta.pos && isValidStateCode(meta.pos)) {
            stateCode = meta.pos;
          }

          missingParties.push({
            name: displayName,
            partyType: defaultPartyType,
            gstin: meta.gstin,
            pan,
            stateCode,
            registrationType,
          });
        }
      }

      // 5. Identify Missing Items
      const missingItems: MissingProductItem[] = [];
      for (const [lowerName, meta] of itemMap.entries()) {
        if (!existingItemNames.has(lowerName)) {
          const originalName = rows.find((r) => {
            const n = String(r.itemName || r['Item Name'] || '').trim();
            return n.toLowerCase() === lowerName;
          });
          const displayName = originalName
            ? String(originalName.itemName || originalName['Item Name']).trim()
            : lowerName;

          const isService = meta.hsn ? meta.hsn.startsWith('99') : false;
          missingItems.push({
            name: displayName,
            itemType: isService ? ItemType.SERVICES : ItemType.GOODS,
            hsnSac: meta.hsn,
            uqc: normalizeGstUqc(meta.uqc) || 'NOS',
            taxRate: meta.taxRate || 18,
            price: meta.price,
          });
        }
      }

      // 6. Check Unmapped Units
      const standardCodes = new Set(GST_STATUTORY_UOM_LIST.map((u) => u.code));
      const unmappedUnits: { rawUnit: string; suggestedUqc: string }[] = [];

      for (const raw of rawUnits) {
        if (!standardCodes.has(raw)) {
          const normalized = normalizeGstUqc(raw);
          unmappedUnits.push({
            rawUnit: raw,
            suggestedUqc: normalized,
          });
        }
      }

      return {
        hasMissingMasters: missingParties.length > 0 || missingItems.length > 0,
        missingParties,
        missingItems,
        unmappedUnits,
        existingPartiesCount: existingParties.length,
        existingItemsCount: existingItems.length,
      };
    });
  }

  /**
   * Bulk creates missing masters with pre-filled smart defaults inside a single transaction
   */
  public async bulkResolveMasters(
    tenantId: string,
    companyId: string,
    payload: BulkResolveMastersDto,
  ): Promise<{
    createdParties: number;
    createdItems: number;
  }> {
    return this.uow.executeInTransaction(async (qr) => {
      let createdParties = 0;
      let createdItems = 0;

      // 1. Resolve & create missing parties
      if (payload.parties && payload.parties.length > 0) {
        // Resolve default ledger group for parties
        const debtorLedger = await qr.manager
          .createQueryBuilder(LedgerOrmEntity, 'ledger')
          .innerJoin('ledger.group', 'grp')
          .where('ledger.tenant_id = :tenantId', { tenantId })
          .andWhere('ledger.company_id = :companyId', { companyId })
          .andWhere('grp.name ILIKE :grp', { grp: '%Debtor%' })
          .getOne();

        const creditorLedger = await qr.manager
          .createQueryBuilder(LedgerOrmEntity, 'ledger')
          .innerJoin('ledger.group', 'grp')
          .where('ledger.tenant_id = :tenantId', { tenantId })
          .andWhere('ledger.company_id = :companyId', { companyId })
          .andWhere('grp.name ILIKE :grp', { grp: '%Creditor%' })
          .getOne();

        for (const p of payload.parties) {
          const prefix = p.partyType === PartyType.VENDOR ? 'VEND' : 'CUST';
          const count = await qr.manager.count(PartyOrmEntity, { where: { companyId } });
          const partyCode = `${prefix}-${String(count + 1 + createdParties).padStart(4, '0')}`;

          const regType = p.registrationType || (p.gstin ? PartyRegistrationType.REGULAR : PartyRegistrationType.UNREGISTERED);
          const defaultLedgerId = p.partyType === PartyType.VENDOR ? creditorLedger?.id : debtorLedger?.id;

          const party = qr.manager.create(PartyOrmEntity, {
            tenantId,
            companyId,
            partyCode,
            name: p.name.trim(),
            partyType: p.partyType || PartyType.CUSTOMER,
            registrationType: regType,
            currency: 'INR',
            gstin: p.gstin?.trim() || undefined,
            pan: p.pan?.trim() || undefined,
            billingStateCode: p.stateCode || '27',
            ledgerId: defaultLedgerId,
            creditLimit: 0,
            paymentTermsDays: 30,
            isActive: true,
          });

          await qr.manager.save(PartyOrmEntity, party);
          createdParties++;
        }
      }

      // 2. Resolve & create missing items
      if (payload.items && payload.items.length > 0) {
        // Resolve default sales ledger
        const salesLedger = await qr.manager
          .createQueryBuilder(LedgerOrmEntity, 'ledger')
          .innerJoin('ledger.group', 'grp')
          .where('ledger.tenant_id = :tenantId', { tenantId })
          .andWhere('ledger.company_id = :companyId', { companyId })
          .andWhere('grp.name ILIKE :grp', { grp: '%Sales%' })
          .getOne();

        for (const item of payload.items) {
          const count = await qr.manager.count(ItemOrmEntity, { where: { companyId } });
          const itemCode = `ITEM-${String(count + 1 + createdItems).padStart(4, '0')}`;

          const itemEntity = qr.manager.create(ItemOrmEntity, {
            tenantId,
            companyId,
            itemCode,
            name: item.name.trim(),
            type: item.itemType || ItemType.GOODS,
            hsnSacCode: item.hsnSac?.trim() || '998311',
            uom: item.uqc || 'NOS',
            unitPrice: new Decimal(item.price || 0),
            gstRatePercent: new Decimal(item.taxRate || 18),
            cessRatePercent: new Decimal(0),
            salesLedgerId: salesLedger?.id,
            isActive: true,
          });

          await qr.manager.save(ItemOrmEntity, itemEntity);
          createdItems++;
        }
      }

      return { createdParties, createdItems };
    });
  }
}
