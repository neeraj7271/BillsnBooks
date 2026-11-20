import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { ItemOrmEntity } from '../../infrastructure/persistence/entities/item.orm-entity';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { InvoiceItemOrmEntity } from '../../infrastructure/persistence/entities/invoice-item.orm-entity';
import { SettingValueOrmEntity } from '../../infrastructure/persistence/entities/setting-value.orm-entity';
import { ItemDto, ItemType, SettingScope, GST_STATUTORY_UOM_LIST } from '@platform/shared-types';
import { Decimal } from 'decimal.js';

@Injectable()
export class ItemService {
  constructor(private readonly uow: UnitOfWorkService) {}

  async listItems(
    tenantId: string,
    companyId: string,
  ): Promise<ItemDto[]> {
    return this.uow.executeInTransaction(async (qr) => {
      const entities = await qr.manager.find(ItemOrmEntity, {
        where: { tenantId, companyId, isActive: true },
        order: { name: 'ASC' },
      });

      return entities.map((i) => this.toDto(i));
    });
  }

  async getItem(
    tenantId: string,
    companyId: string,
    itemId: string,
  ): Promise<ItemDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const item = await qr.manager.findOne(ItemOrmEntity, {
        where: { id: itemId, tenantId, companyId },
      });

      if (!item) {
        throw new NotFoundException(`Item with ID '${itemId}' not found.`);
      }

      return this.toDto(item);
    });
  }

  async createItem(
    tenantId: string,
    companyId: string,
    dto: ItemDto,
  ): Promise<ItemDto> {
    return this.uow.executeInTransaction(async (qr) => {
      // Check duplicate code
      const existing = await qr.manager.findOne(ItemOrmEntity, {
        where: { companyId, itemCode: dto.itemCode.trim().toUpperCase() },
      });
      if (existing) {
        throw new ConflictException(`Item with code '${dto.itemCode}' already exists.`);
      }

      let salesLedgerId = dto.salesLedgerId;
      if (!salesLedgerId) {
        const salesLedger = await qr.manager
          .createQueryBuilder(LedgerOrmEntity, 'ledger')
          .innerJoin('ledger.group', 'grp')
          .where('ledger.tenant_id = :tenantId', { tenantId })
          .andWhere('ledger.company_id = :companyId', { companyId })
          .andWhere('grp.name ILIKE :grp', { grp: '%Sales%' })
          .getOne();

        if (salesLedger) {
          salesLedgerId = salesLedger.id;
        }
      }

      const item = qr.manager.create(ItemOrmEntity, {
        tenantId,
        companyId,
        itemCode: dto.itemCode.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        hsnSacCode: dto.hsnSacCode.trim(),
        itemType: dto.itemType || ItemType.GOODS,
        uom: dto.uom ? dto.uom.toUpperCase() : 'NOS',
        unitPrice: new Decimal(dto.unitPrice || 0),
        gstRatePercent: new Decimal(dto.gstRatePercent || 18),
        cessRatePercent: new Decimal(dto.cessRatePercent || 0),
        salesLedgerId,
        purchaseLedgerId: dto.purchaseLedgerId,
        isActive: true,
      });

      const saved = await qr.manager.save(item);
      return this.toDto(saved);
    });
  }

  async updateItem(
    tenantId: string,
    companyId: string,
    itemId: string,
    dto: Partial<ItemDto>,
  ): Promise<ItemDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const item = await qr.manager.findOne(ItemOrmEntity, {
        where: { id: itemId, tenantId, companyId },
      });

      if (!item) {
        throw new NotFoundException(`Item with ID '${itemId}' not found.`);
      }

      if (dto.itemCode !== undefined) item.itemCode = dto.itemCode.trim().toUpperCase();
      if (dto.name !== undefined) item.name = dto.name.trim();
      if (dto.description !== undefined) item.description = dto.description.trim();
      if (dto.hsnSacCode !== undefined) item.hsnSacCode = dto.hsnSacCode.trim();
      if (dto.itemType !== undefined) item.itemType = dto.itemType;
      if (dto.uom !== undefined) item.uom = dto.uom.toUpperCase();
      if (dto.unitPrice !== undefined) item.unitPrice = new Decimal(dto.unitPrice);
      if (dto.gstRatePercent !== undefined) item.gstRatePercent = new Decimal(dto.gstRatePercent);
      if (dto.cessRatePercent !== undefined) item.cessRatePercent = new Decimal(dto.cessRatePercent);
      if (dto.salesLedgerId !== undefined) item.salesLedgerId = dto.salesLedgerId;
      if (dto.purchaseLedgerId !== undefined) item.purchaseLedgerId = dto.purchaseLedgerId;
      if (dto.isActive !== undefined) item.isActive = dto.isActive;

      const updated = await qr.manager.save(item);
      return this.toDto(updated);
    });
  }

  async deleteItem(
    tenantId: string,
    companyId: string,
    itemId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.uow.executeInTransaction(async (qr) => {
      const item = await qr.manager.findOne(ItemOrmEntity, {
        where: { id: itemId, tenantId, companyId },
      });

      if (!item) {
        throw new NotFoundException(`Item with ID '${itemId}' not found.`);
      }

      // Check if item has been billed in any invoice lines
      const invoiceItemCount = await qr.manager.count(InvoiceItemOrmEntity, {
        where: { itemId },
      });

      if (invoiceItemCount > 0) {
        throw new BadRequestException(
          `Cannot hard-delete item '${item.name}' (${item.itemCode}) because it is billed in ${invoiceItemCount} invoice line item(s). In double-entry accounting and GST compliance, billed catalog items must not be removed. You may deactivate this item instead.`,
        );
      }

      // Safe soft-delete / deactivation
      item.isActive = false;
      await qr.manager.save(item);

      return {
        success: true,
        message: `Item '${item.name}' (${item.itemCode}) has been successfully removed.`,
      };
    });
  }

  async listUnits(
    tenantId: string,
    companyId: string,
  ): Promise<{ standard: typeof GST_STATUTORY_UOM_LIST; custom: Array<{ code: string; name: string; description?: string; createdAt?: string }> }> {
    return this.uow.executeInTransaction(async (qr) => {
      const setting = await qr.manager.findOne(SettingValueOrmEntity, {
        where: {
          settingKey: 'company_custom_units',
          scope: SettingScope.COMPANY,
          scopeId: companyId,
        },
      });

      const custom = Array.isArray(setting?.value) ? setting.value : [];
      return {
        standard: GST_STATUTORY_UOM_LIST,
        custom,
      };
    });
  }

  async createCustomUnit(
    tenantId: string,
    companyId: string,
    dto: { code: string; name: string; description?: string },
  ): Promise<{ code: string; name: string; description?: string; createdAt: string }> {
    return this.uow.executeInTransaction(async (qr) => {
      const cleanCode = dto.code?.trim().toUpperCase();
      const cleanName = dto.name?.trim();

      if (!cleanCode || cleanCode.length < 2 || cleanCode.length > 12) {
        throw new BadRequestException('Unit Code must be 2 to 12 alphanumeric characters (e.g. TRIP, BATCH, SET).');
      }
      if (!cleanName) {
        throw new BadRequestException('Unit Name / Description is required.');
      }

      // Check statutory conflict
      const existsInStandard = GST_STATUTORY_UOM_LIST.some((u) => u.code === cleanCode);
      if (existsInStandard) {
        throw new BadRequestException(`Unit Code '${cleanCode}' is already a standard statutory GST unit.`);
      }

      let setting = await qr.manager.findOne(SettingValueOrmEntity, {
        where: {
          settingKey: 'company_custom_units',
          scope: SettingScope.COMPANY,
          scopeId: companyId,
        },
      });

      let list: Array<{ code: string; name: string; description?: string; createdAt?: string }> = [];
      if (setting && Array.isArray(setting.value)) {
        list = [...setting.value];
      }

      const duplicate = list.some((u) => u.code === cleanCode);
      if (duplicate) {
        throw new ConflictException(`Unit Code '${cleanCode}' already exists for this company.`);
      }

      const newUnit = {
        code: cleanCode,
        name: cleanName,
        description: dto.description?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      list.push(newUnit);

      if (!setting) {
        setting = qr.manager.create(SettingValueOrmEntity, {
          settingKey: 'company_custom_units',
          scope: SettingScope.COMPANY,
          scopeId: companyId,
          value: list,
        });
      } else {
        setting.value = list;
      }

      await qr.manager.save(setting);
      return newUnit;
    });
  }

  async updateCustomUnit(
    tenantId: string,
    companyId: string,
    code: string,
    dto: { name?: string; description?: string },
  ): Promise<{ code: string; name: string; description?: string }> {
    return this.uow.executeInTransaction(async (qr) => {
      const cleanCode = code?.trim().toUpperCase();
      const cleanName = dto.name?.trim();

      if (!cleanName) {
        throw new BadRequestException('Unit Name / Description is required.');
      }

      const setting = await qr.manager.findOne(SettingValueOrmEntity, {
        where: {
          settingKey: 'company_custom_units',
          scope: SettingScope.COMPANY,
          scopeId: companyId,
        },
      });

      if (!setting || !Array.isArray(setting.value)) {
        throw new NotFoundException(`Custom unit '${cleanCode}' not found.`);
      }

      const unitIndex = setting.value.findIndex((u: any) => u.code === cleanCode);
      if (unitIndex === -1) {
        throw new NotFoundException(`Custom unit '${cleanCode}' not found.`);
      }

      setting.value[unitIndex] = {
        ...setting.value[unitIndex],
        name: cleanName,
        description: dto.description !== undefined ? dto.description.trim() : setting.value[unitIndex].description,
        updatedAt: new Date().toISOString(),
      };

      await qr.manager.save(setting);
      return setting.value[unitIndex];
    });
  }

  async deleteCustomUnit(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.uow.executeInTransaction(async (qr) => {
      const cleanCode = code?.trim().toUpperCase();

      // Check if any active item is using this UOM
      const usedCount = await qr.manager.count(ItemOrmEntity, {
        where: { companyId, uom: cleanCode, isActive: true },
      });

      if (usedCount > 0) {
        throw new BadRequestException(
          `Cannot delete unit '${cleanCode}' because ${usedCount} active item(s) in this company are currently using it.`,
        );
      }

      const setting = await qr.manager.findOne(SettingValueOrmEntity, {
        where: {
          settingKey: 'company_custom_units',
          scope: SettingScope.COMPANY,
          scopeId: companyId,
        },
      });

      if (!setting || !Array.isArray(setting.value)) {
        throw new NotFoundException(`Custom unit '${cleanCode}' not found.`);
      }

      const filtered = setting.value.filter((u: any) => u.code !== cleanCode);
      if (filtered.length === setting.value.length) {
        throw new NotFoundException(`Custom unit '${cleanCode}' not found.`);
      }

      setting.value = filtered;
      await qr.manager.save(setting);

      return {
        success: true,
        message: `Custom unit '${cleanCode}' removed successfully.`,
      };
    });
  }

  private toDto(i: ItemOrmEntity): ItemDto {
    return {
      id: i.id,
      tenantId: i.tenantId,
      companyId: i.companyId,
      itemCode: i.itemCode,
      name: i.name,
      description: i.description,
      hsnSacCode: i.hsnSacCode,
      itemType: i.itemType,
      uom: i.uom,
      unitPrice: i.unitPrice ? i.unitPrice.toFixed(2) : '0.00',
      gstRatePercent: i.gstRatePercent ? i.gstRatePercent.toFixed(2) : '18.00',
      cessRatePercent: i.cessRatePercent ? i.cessRatePercent.toFixed(2) : '0.00',
      salesLedgerId: i.salesLedgerId,
      purchaseLedgerId: i.purchaseLedgerId,
      isActive: i.isActive,
      createdAt: i.createdAt?.toISOString(),
      updatedAt: i.updatedAt?.toISOString(),
    };
  }
}

