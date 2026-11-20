import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  BusinessTemplate,
  CoaSource,
  AccountNature,
  ReportType,
  NormalBalance,
} from '@platform/shared-types';
import {
  loadStandardCoaCatalogue,
  CoaCatalogue,
  SeedGroup,
  SeedLedger,
} from '@platform/accounting-core';
import { LedgerGroupOrmEntity } from '../../infrastructure/persistence/entities/ledger-group.orm-entity';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { CompanyOrmEntity } from '../../infrastructure/persistence/entities/company.orm-entity';
import Decimal from 'decimal.js';

export interface SeedResult {
  version: string;
  template: BusinessTemplate;
  groupsCreated: number;
  ledgersCreated: number;
  totalGroups: number;
  totalLedgers: number;
  skipped: boolean;
}

@Injectable()
export class ChartOfAccountsSeeder {
  private readonly logger = new Logger(ChartOfAccountsSeeder.name);

  /**
   * Seeds the standard Chart of Accounts for a company idempotently.
   * Runs in the caller's transaction via the provided EntityManager.
   */
  async seedForCompany(
    manager: EntityManager,
    companyId: string,
    tenantId: string,
    template: BusinessTemplate = BusinessTemplate.TRADER,
    accountingMode: string = 'CLOUD_NATIVE',
  ): Promise<SeedResult> {
    if (accountingMode === 'TALLY_CONNECTED') {
      this.logger.log(
        `Skipping standard CoA seeding for Tally-connected company ${companyId}. Tally masters will be imported.`,
      );
      return {
        version: 'NONE',
        template,
        groupsCreated: 0,
        ledgersCreated: 0,
        totalGroups: 0,
        totalLedgers: 0,
        skipped: true,
      };
    }

    const catalogue: CoaCatalogue = loadStandardCoaCatalogue();
    const company = await manager.findOne(CompanyOrmEntity, { where: { id: companyId } });
    const defaultCurrency = company?.defaultCurrency || 'INR';

    // 1. Filter Catalogue by Selected Business Template
    const eligibleGroups = catalogue.groups.filter((g) => g.templates.includes(template));
    const eligibleLedgers = catalogue.ledgers.filter((l) => l.templates.includes(template));

    let groupsCreated = 0;
    let ledgersCreated = 0;

    // Map of systemKey -> LedgerGroupOrmEntity
    const groupKeyMap = new Map<string, LedgerGroupOrmEntity>();

    // Load existing groups for company
    const existingGroups = await manager.find(LedgerGroupOrmEntity, {
      where: { companyId, tenantId },
    });
    for (const eg of existingGroups) {
      if (eg.systemKey) {
        groupKeyMap.set(eg.systemKey, eg);
      }
    }

    // 2. Phase A: Seed Primary Groups (parentGroupKey == null)
    const primaryGroups = eligibleGroups.filter((g) => !g.parentGroupKey);
    for (const g of primaryGroups) {
      if (!groupKeyMap.has(g.systemKey)) {
        // Check by code as well to prevent unique constraint conflict
        let group = existingGroups.find((eg) => eg.code === g.code);
        if (!group) {
          group = manager.create(LedgerGroupOrmEntity, {
            tenantId,
            companyId,
            systemKey: g.systemKey,
            code: g.code,
            name: g.name,
            nature: g.nature,
            report: g.report,
            normalBalance: g.normalBalance,
            affectsGrossProfit: g.affectsGrossProfit,
            isSystem: true,
            isLocked: g.isLocked,
            isActive: true,
            source: CoaSource.SEED,
            seedVersion: catalogue.version,
            tallyGroupName: g.tallyGroupName,
            scheduleIiiMapping: g.scheduleIiiMapping,
          });
          group = await manager.save(LedgerGroupOrmEntity, group);
          groupsCreated++;
        } else if (!group.systemKey) {
          // Link existing group with systemKey
          group.systemKey = g.systemKey;
          group.isSystem = true;
          group.isLocked = g.isLocked;
          group = await manager.save(LedgerGroupOrmEntity, group);
        }
        groupKeyMap.set(g.systemKey, group);
      }
    }

    // 3. Phase B: Seed Sub-Groups (parentGroupKey != null)
    const subGroups = eligibleGroups.filter((g) => !!g.parentGroupKey);
    for (const g of subGroups) {
      if (!groupKeyMap.has(g.systemKey)) {
        const parentGroup = groupKeyMap.get(g.parentGroupKey!);
        if (!parentGroup) {
          this.logger.warn(`Parent group "${g.parentGroupKey}" not found for sub-group "${g.systemKey}"`);
          continue;
        }

        let group = existingGroups.find((eg) => eg.code === g.code);
        if (!group) {
          group = manager.create(LedgerGroupOrmEntity, {
            tenantId,
            companyId,
            parentGroupId: parentGroup.id,
            systemKey: g.systemKey,
            code: g.code,
            name: g.name,
            nature: parentGroup.nature, // Enforce nature inheritance
            report: g.report,
            normalBalance: g.normalBalance,
            affectsGrossProfit: g.affectsGrossProfit,
            isSystem: true,
            isLocked: g.isLocked,
            isActive: true,
            source: CoaSource.SEED,
            seedVersion: catalogue.version,
            tallyGroupName: g.tallyGroupName,
            scheduleIiiMapping: g.scheduleIiiMapping,
          });
          group = await manager.save(LedgerGroupOrmEntity, group);
          groupsCreated++;
        } else if (!group.systemKey) {
          group.systemKey = g.systemKey;
          group.isSystem = true;
          group.isLocked = g.isLocked;
          group.parentGroupId = parentGroup.id;
          group = await manager.save(LedgerGroupOrmEntity, group);
        }
        groupKeyMap.set(g.systemKey, group);
      }
    }

    // 4. Phase C: Seed Common Statutory Ledgers
    const existingLedgers = await manager.find(LedgerOrmEntity, {
      where: { companyId, tenantId },
    });
    const ledgerKeyMap = new Map<string, LedgerOrmEntity>();
    for (const el of existingLedgers) {
      if (el.systemKey) {
        ledgerKeyMap.set(el.systemKey, el);
      }
    }

    for (const l of eligibleLedgers) {
      if (!ledgerKeyMap.has(l.systemKey)) {
        const group = groupKeyMap.get(l.groupKey);
        if (!group) {
          this.logger.warn(`Group "${l.groupKey}" not found for ledger "${l.systemKey}"`);
          continue;
        }

        let ledger = existingLedgers.find((el) => el.code === l.code);
        if (!ledger) {
          ledger = manager.create(LedgerOrmEntity, {
            tenantId,
            companyId,
            groupId: group.id,
            systemKey: l.systemKey,
            code: l.code,
            name: l.name,
            currency: defaultCurrency,
            openingBalance: new Decimal(0),
            currentBalance: new Decimal(0),
            isBankOrCash: l.isBankOrCash,
            isActive: true,
            isSystem: true,
            isLocked: l.isLocked,
            source: CoaSource.SEED,
            seedVersion: catalogue.version,
            scheduleIiiMapping: l.scheduleIiiMapping,
            tallyLedgerName: l.tallyLedgerName,
            gstTaxType: l.gstTaxType || null,
            gstRate: l.gstRate ?? null,
          });
          ledger = await manager.save(LedgerOrmEntity, ledger);
          ledgersCreated++;
        } else if (!ledger.systemKey) {
          ledger.systemKey = l.systemKey;
          ledger.isSystem = true;
          ledger.isLocked = l.isLocked;
          ledger = await manager.save(LedgerOrmEntity, ledger);
        }
        ledgerKeyMap.set(l.systemKey, ledger);
      }
    }

    // 5. Update Company Seed Version
    await manager.update(CompanyOrmEntity, companyId, {
      coaSeedVersion: catalogue.version,
      coaTemplate: template,
    });

    this.logger.log(
      `Chart of Accounts seeded for company ${companyId} [Template: ${template}, Version: ${catalogue.version}]: ` +
        `${groupsCreated} groups created, ${ledgersCreated} ledgers created.`,
    );

    return {
      version: catalogue.version,
      template,
      groupsCreated,
      ledgersCreated,
      totalGroups: groupKeyMap.size,
      totalLedgers: ledgerKeyMap.size,
      skipped: false,
    };
  }

  /**
   * Generates the next hierarchical 4-digit code for a user-created group.
   * Range:
   *  1000-1999: Assets
   *  2000-2999: Liabilities & Equity
   *  3000-3999: Income
   *  4000-4999: Expense
   */
  async generateGroupCode(
    manager: EntityManager,
    companyId: string,
    nature: AccountNature,
    parentGroupId?: string | null,
  ): Promise<string> {
    let baseStart = 1000;
    if (nature === AccountNature.LIABILITY || nature === AccountNature.EQUITY) {
      baseStart = 2000;
    } else if (nature === AccountNature.INCOME) {
      baseStart = 3000;
    } else if (nature === AccountNature.EXPENSE) {
      baseStart = 4000;
    }

    if (parentGroupId) {
      const parent = await manager.findOne(LedgerGroupOrmEntity, {
        where: { id: parentGroupId, companyId },
      });
      if (parent && /^\d{4}$/.test(parent.code)) {
        const parentCodeNum = parseInt(parent.code, 10);
        // Find existing sibling groups under parent
        const siblings = await manager.find(LedgerGroupOrmEntity, {
          where: { parentGroupId, companyId },
        });
        const existingCodes = new Set(siblings.map((s) => s.code));

        for (let offset = 10; offset < 100; offset += 10) {
          const candidate = (parentCodeNum + offset).toString();
          if (!existingCodes.has(candidate)) {
            // Check global collision
            const exists = await manager.count(LedgerGroupOrmEntity, {
              where: { companyId, code: candidate },
            });
            if (exists === 0) return candidate;
          }
        }
      }
    }

    // Fallback: next available hundreds block
    for (let c = baseStart; c < baseStart + 1000; c += 50) {
      const candidate = c.toString();
      const exists = await manager.count(LedgerGroupOrmEntity, {
        where: { companyId, code: candidate },
      });
      if (exists === 0) return candidate;
    }

    return `${baseStart + Math.floor(Math.random() * 900 + 50)}`;
  }

  /**
   * Generates the next sequential 4-digit code for a user-created ledger within its parent group block.
   */
  async generateLedgerCode(
    manager: EntityManager,
    companyId: string,
    groupId: string,
  ): Promise<string> {
    const group = await manager.findOne(LedgerGroupOrmEntity, {
      where: { id: groupId, companyId },
    });
    if (!group || !/^\d{4}$/.test(group.code)) {
      // Fallback
      return `9${Math.floor(Math.random() * 900 + 100)}`;
    }

    const groupBase = parseInt(group.code, 10);
    // Find all existing ledgers in this group
    const ledgers = await manager.find(LedgerOrmEntity, {
      where: { groupId, companyId },
    });
    const existingCodes = new Set(ledgers.map((l) => l.code));

    // Try sequential 1..99 within this group block
    for (let i = 1; i < 99; i++) {
      const candidate = (groupBase + i).toString();
      if (!existingCodes.has(candidate)) {
        const exists = await manager.count(LedgerOrmEntity, {
          where: { companyId, code: candidate },
        });
        if (exists === 0) return candidate;
      }
    }

    // Extended fallback
    return `${groupBase + ledgers.length + 1}`;
  }
}
