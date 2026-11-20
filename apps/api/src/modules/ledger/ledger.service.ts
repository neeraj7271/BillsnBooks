import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { LedgerGroupOrmEntity } from '../../infrastructure/persistence/entities/ledger-group.orm-entity';
import { JournalEntryOrmEntity } from '../../infrastructure/persistence/entities/journal-entry.orm-entity';
import { ChartOfAccountsSeeder } from './coa-seeder.service';
import {
  AccountNature,
  ReportType,
  NormalBalance,
  BusinessTemplate,
  GstTaxType,
} from '@platform/shared-types';
import Decimal from 'decimal.js';

export interface CreateLedgerDto {
  groupId: string;
  code?: string;
  name: string;
  openingBalance?: number;
  isBankOrCash?: boolean;
  scheduleIiiMapping?: string;
  tallyLedgerName?: string;
  gstTaxType?: GstTaxType;
  gstRate?: number;
}

export interface UpdateLedgerDto {
  name?: string;
  groupId?: string;
  isBankOrCash?: boolean;
  isActive?: boolean;
  scheduleIiiMapping?: string;
  tallyLedgerName?: string;
  gstTaxType?: GstTaxType;
  gstRate?: number;
}

export interface CreateLedgerGroupDto {
  parentGroupId?: string | null;
  code?: string;
  name: string;
  nature?: AccountNature;
  report?: ReportType;
  normalBalance?: NormalBalance;
  affectsGrossProfit?: boolean;
  tallyGroupName?: string;
  scheduleIiiMapping?: string;
}

export interface UpdateLedgerGroupDto {
  name?: string;
  parentGroupId?: string | null;
  isActive?: boolean;
  tallyGroupName?: string;
  scheduleIiiMapping?: string;
}

export interface LedgerTreeNode {
  id: string;
  code: string;
  name: string;
  systemKey?: string | null;
  isSystem: boolean;
  isLocked: boolean;
  isActive: boolean;
  nature: AccountNature;
  report: ReportType;
  normalBalance: NormalBalance;
  affectsGrossProfit: boolean;
  tallyGroupName?: string | null;
  scheduleIiiMapping?: string | null;
  subGroups: LedgerTreeNode[];
  ledgers: {
    id: string;
    code: string;
    name: string;
    systemKey?: string | null;
    isSystem: boolean;
    isLocked: boolean;
    isActive: boolean;
    isBankOrCash: boolean;
    currency: string;
    openingBalance: number;
    currentBalance: number;
    gstTaxType?: GstTaxType | null;
    gstRate?: number | null;
    tallyLedgerName?: string | null;
    scheduleIiiMapping?: string | null;
  }[];
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    private readonly uow: UnitOfWorkService,
    private readonly seeder: ChartOfAccountsSeeder,
  ) {}

  async listLedgers(
    tenantId: string,
    companyId: string,
    groupId?: string,
  ): Promise<any[]> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const qb = qr.manager
        .getRepository(LedgerOrmEntity)
        .createQueryBuilder('ledger')
        .leftJoinAndSelect('ledger.group', 'group')
        .where('ledger.tenant_id = :tenantId', { tenantId })
        .andWhere('ledger.company_id = :companyId', { companyId })
        .orderBy('ledger.code', 'ASC');

      if (groupId) {
        qb.andWhere('ledger.group_id = :groupId', { groupId });
      }

      const ledgers: LedgerOrmEntity[] = await qb.getMany();
      return ledgers.map((l: LedgerOrmEntity) => ({
        id: l.id,
        code: l.code,
        name: l.name,
        currency: l.currency,
        openingBalance: Number(l.openingBalance),
        currentBalance: Number(l.currentBalance),
        isBankOrCash: l.isBankOrCash,
        isActive: l.isActive,
        isSystem: l.isSystem,
        isLocked: l.isLocked,
        systemKey: l.systemKey,
        source: l.source,
        gstTaxType: l.gstTaxType,
        gstRate: l.gstRate ? Number(l.gstRate) : null,
        tallyLedgerName: l.tallyLedgerName,
        scheduleIiiMapping: l.scheduleIiiMapping,
        group: l.group
          ? {
              id: l.group.id,
              code: l.group.code,
              name: l.group.name,
              nature: l.group.nature,
              report: l.group.report,
            }
          : null,
      }));
    });
  }

  async getLedgerTree(tenantId: string, companyId: string): Promise<LedgerTreeNode[]> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const groups = await qr.manager.find(LedgerGroupOrmEntity, {
        where: { tenantId, companyId },
        order: { code: 'ASC' },
      });

      const ledgers = await qr.manager.find(LedgerOrmEntity, {
        where: { tenantId, companyId },
        order: { code: 'ASC' },
      });

      // Group ledgers by groupId
      const ledgerMap = new Map<string, typeof ledgers>();
      for (const l of ledgers) {
        const list = ledgerMap.get(l.groupId) || [];
        list.push(l);
        ledgerMap.set(l.groupId, list);
      }

      // Build tree nodes map
      const nodeMap = new Map<string, LedgerTreeNode>();
      for (const g of groups) {
        const groupLedgers = (ledgerMap.get(g.id) || []).map((l) => ({
          id: l.id,
          code: l.code,
          name: l.name,
          systemKey: l.systemKey,
          isSystem: l.isSystem,
          isLocked: l.isLocked,
          isActive: l.isActive,
          isBankOrCash: l.isBankOrCash,
          currency: l.currency,
          openingBalance: Number(l.openingBalance),
          currentBalance: Number(l.currentBalance),
          gstTaxType: l.gstTaxType,
          gstRate: l.gstRate ? Number(l.gstRate) : null,
          tallyLedgerName: l.tallyLedgerName,
          scheduleIiiMapping: l.scheduleIiiMapping,
        }));

        nodeMap.set(g.id, {
          id: g.id,
          code: g.code,
          name: g.name,
          systemKey: g.systemKey,
          isSystem: g.isSystem,
          isLocked: g.isLocked,
          isActive: g.isActive,
          nature: g.nature,
          report: g.report,
          normalBalance: g.normalBalance,
          affectsGrossProfit: g.affectsGrossProfit,
          tallyGroupName: g.tallyGroupName,
          scheduleIiiMapping: g.scheduleIiiMapping,
          subGroups: [],
          ledgers: groupLedgers,
        });
      }

      // Assemble hierarchy
      const rootNodes: LedgerTreeNode[] = [];
      for (const g of groups) {
        const node = nodeMap.get(g.id)!;
        if (g.parentGroupId && nodeMap.has(g.parentGroupId)) {
          nodeMap.get(g.parentGroupId)!.subGroups.push(node);
        } else {
          rootNodes.push(node);
        }
      }

      return rootNodes;
    });
  }

  async createLedger(
    tenantId: string,
    companyId: string,
    dto: CreateLedgerDto,
  ): Promise<LedgerOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const group = await qr.manager.findOne(LedgerGroupOrmEntity, {
        where: { id: dto.groupId, companyId, tenantId },
      });
      if (!group) {
        throw new BadRequestException(`Invalid ledger group ${dto.groupId}.`);
      }

      let code = dto.code ? dto.code.trim().toUpperCase() : '';
      if (!code) {
        code = await this.seeder.generateLedgerCode(qr.manager, companyId, dto.groupId);
      }

      const existing = await qr.manager.findOne(LedgerOrmEntity, {
        where: { companyId, code, tenantId },
      });
      if (existing) {
        throw new BadRequestException(`Ledger with code ${code} already exists.`);
      }

      const opening = new Decimal(dto.openingBalance || 0);

      const ledger = qr.manager.create(LedgerOrmEntity, {
        tenantId,
        companyId,
        groupId: dto.groupId,
        code,
        name: dto.name.trim(),
        openingBalance: opening,
        currentBalance: opening,
        isBankOrCash: !!dto.isBankOrCash,
        isActive: true,
        isSystem: false,
        isLocked: false,
        scheduleIiiMapping: dto.scheduleIiiMapping || null,
        tallyLedgerName: dto.tallyLedgerName || dto.name.trim(),
        gstTaxType: dto.gstTaxType || null,
        gstRate: dto.gstRate ?? null,
      });

      return await qr.manager.save(LedgerOrmEntity, ledger);
    });
  }

  async updateLedger(
    tenantId: string,
    companyId: string,
    ledgerId: string,
    dto: UpdateLedgerDto,
  ): Promise<LedgerOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const ledger = await qr.manager.findOne(LedgerOrmEntity, {
        where: { id: ledgerId, companyId, tenantId },
      });
      if (!ledger) {
        throw new NotFoundException(`Ledger ${ledgerId} not found.`);
      }

      if (dto.groupId && dto.groupId !== ledger.groupId) {
        if (ledger.isLocked) {
          throw new BadRequestException('Cannot move locked system ledger to a different group.');
        }
        const newGroup = await qr.manager.findOne(LedgerGroupOrmEntity, {
          where: { id: dto.groupId, companyId, tenantId },
        });
        if (!newGroup) {
          throw new BadRequestException(`Target group ${dto.groupId} not found.`);
        }
        ledger.groupId = dto.groupId;
      }

      if (dto.name !== undefined) ledger.name = dto.name.trim();
      if (dto.isBankOrCash !== undefined) ledger.isBankOrCash = dto.isBankOrCash;
      if (dto.isActive !== undefined) ledger.isActive = dto.isActive;
      if (dto.scheduleIiiMapping !== undefined) ledger.scheduleIiiMapping = dto.scheduleIiiMapping;
      if (dto.tallyLedgerName !== undefined) ledger.tallyLedgerName = dto.tallyLedgerName;
      if (dto.gstTaxType !== undefined) ledger.gstTaxType = dto.gstTaxType;
      if (dto.gstRate !== undefined) ledger.gstRate = dto.gstRate;

      return await qr.manager.save(LedgerOrmEntity, ledger);
    });
  }

  async deleteLedger(
    tenantId: string,
    companyId: string,
    ledgerId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const ledger = await qr.manager.findOne(LedgerOrmEntity, {
        where: { id: ledgerId, companyId, tenantId },
      });
      if (!ledger) {
        throw new NotFoundException(`Ledger ${ledgerId} not found.`);
      }

      if (ledger.isLocked) {
        throw new BadRequestException(
          `Cannot delete locked system ledger "${ledger.name}" (${ledger.systemKey || ledger.code}). It is required by the platform.`,
        );
      }

      const postingsCount = await qr.manager.count(JournalEntryOrmEntity, {
        where: { ledgerId },
      });

      if (postingsCount > 0) {
        throw new BadRequestException(
          `Cannot delete ledger "${ledger.name}" because it contains ${postingsCount} journal entry postings. Deactivate it instead.`,
        );
      }

      await qr.manager.remove(LedgerOrmEntity, ledger);
      return { success: true, message: `Ledger "${ledger.name}" deleted successfully.` };
    });
  }

  async listGroups(tenantId: string, companyId: string): Promise<LedgerGroupOrmEntity[]> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      return qr.manager.find(LedgerGroupOrmEntity, {
        where: { tenantId, companyId },
        relations: ['parentGroup'],
        order: { code: 'ASC' },
      });
    });
  }

  async createGroup(
    tenantId: string,
    companyId: string,
    dto: CreateLedgerGroupDto,
  ): Promise<LedgerGroupOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      let parentGroup: LedgerGroupOrmEntity | null = null;
      if (dto.parentGroupId) {
        parentGroup = await qr.manager.findOne(LedgerGroupOrmEntity, {
          where: { id: dto.parentGroupId, companyId, tenantId },
        });
        if (!parentGroup) {
          throw new BadRequestException(`Parent group ${dto.parentGroupId} not found.`);
        }
      }

      // Enforce nature & report inheritance from parent group
      const nature = parentGroup ? parentGroup.nature : (dto.nature || AccountNature.ASSET);
      const report = parentGroup ? parentGroup.report : (dto.report || ReportType.BALANCE_SHEET);
      const normalBalance = parentGroup
        ? parentGroup.normalBalance
        : (dto.normalBalance || NormalBalance.DEBIT);
      const affectsGrossProfit = parentGroup
        ? parentGroup.affectsGrossProfit
        : !!dto.affectsGrossProfit;

      let code = dto.code ? dto.code.trim().toUpperCase() : '';
      if (!code) {
        code = await this.seeder.generateGroupCode(
          qr.manager,
          companyId,
          nature,
          dto.parentGroupId,
        );
      }

      const existing = await qr.manager.findOne(LedgerGroupOrmEntity, {
        where: { companyId, code, tenantId },
      });
      if (existing) {
        throw new BadRequestException(`Group with code ${code} already exists.`);
      }

      const group = qr.manager.create(LedgerGroupOrmEntity, {
        tenantId,
        companyId,
        parentGroupId: dto.parentGroupId || null,
        code,
        name: dto.name.trim(),
        nature,
        report,
        normalBalance,
        affectsGrossProfit,
        isSystem: false,
        isLocked: false,
        isActive: true,
        tallyGroupName: dto.tallyGroupName || dto.name.trim(),
        scheduleIiiMapping: dto.scheduleIiiMapping || null,
      });

      return await qr.manager.save(LedgerGroupOrmEntity, group);
    });
  }

  async updateGroup(
    tenantId: string,
    companyId: string,
    groupId: string,
    dto: UpdateLedgerGroupDto,
  ): Promise<LedgerGroupOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const group = await qr.manager.findOne(LedgerGroupOrmEntity, {
        where: { id: groupId, companyId, tenantId },
      });
      if (!group) {
        throw new NotFoundException(`Group ${groupId} not found.`);
      }

      if (dto.parentGroupId !== undefined && dto.parentGroupId !== group.parentGroupId) {
        if (group.isLocked) {
          throw new BadRequestException('Cannot re-parent locked system ledger group.');
        }
        if (dto.parentGroupId) {
          const parent = await qr.manager.findOne(LedgerGroupOrmEntity, {
            where: { id: dto.parentGroupId, companyId, tenantId },
          });
          if (!parent) {
            throw new BadRequestException(`Parent group ${dto.parentGroupId} not found.`);
          }
          if (parent.nature !== group.nature) {
            throw new BadRequestException(
              `Child group nature (${group.nature}) cannot differ from new parent nature (${parent.nature}).`,
            );
          }
        }
        group.parentGroupId = dto.parentGroupId;
      }

      if (dto.name !== undefined) group.name = dto.name.trim();
      if (dto.isActive !== undefined) group.isActive = dto.isActive;
      if (dto.tallyGroupName !== undefined) group.tallyGroupName = dto.tallyGroupName;
      if (dto.scheduleIiiMapping !== undefined) group.scheduleIiiMapping = dto.scheduleIiiMapping;

      return await qr.manager.save(LedgerGroupOrmEntity, group);
    });
  }

  async deleteGroup(
    tenantId: string,
    companyId: string,
    groupId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const group = await qr.manager.findOne(LedgerGroupOrmEntity, {
        where: { id: groupId, companyId, tenantId },
      });
      if (!group) {
        throw new NotFoundException(`Group ${groupId} not found.`);
      }

      if (group.isLocked) {
        throw new BadRequestException(
          `Cannot delete locked system group "${group.name}" (${group.systemKey || group.code}).`,
        );
      }

      const childGroupsCount = await qr.manager.count(LedgerGroupOrmEntity, {
        where: { parentGroupId: groupId },
      });
      if (childGroupsCount > 0) {
        throw new BadRequestException(
          `Cannot delete group "${group.name}" because it contains ${childGroupsCount} sub-groups.`,
        );
      }

      const ledgersCount = await qr.manager.count(LedgerOrmEntity, {
        where: { groupId },
      });
      if (ledgersCount > 0) {
        throw new BadRequestException(
          `Cannot delete group "${group.name}" because it contains ${ledgersCount} ledgers.`,
        );
      }

      await qr.manager.remove(LedgerGroupOrmEntity, group);
      return { success: true, message: `Group "${group.name}" deleted successfully.` };
    });
  }

  async seedCompanyCoa(
    tenantId: string,
    companyId: string,
    template: BusinessTemplate = BusinessTemplate.TRADER,
  ) {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      return await this.seeder.seedForCompany(qr.manager, companyId, tenantId, template);
    });
  }
}
