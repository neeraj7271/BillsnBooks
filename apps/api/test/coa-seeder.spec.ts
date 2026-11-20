import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ChartOfAccountsSeeder } from '../src/modules/ledger/coa-seeder.service';
import { LedgerService } from '../src/modules/ledger/ledger.service';
import { UnitOfWorkService } from '../src/infrastructure/persistence/unit-of-work/unit-of-work.service';
import { LedgerGroupOrmEntity } from '../src/infrastructure/persistence/entities/ledger-group.orm-entity';
import { LedgerOrmEntity } from '../src/infrastructure/persistence/entities/ledger.orm-entity';
import { CompanyOrmEntity } from '../src/infrastructure/persistence/entities/company.orm-entity';
import { JournalEntryOrmEntity } from '../src/infrastructure/persistence/entities/journal-entry.orm-entity';
import { AccountNature, BusinessTemplate, ReportType, NormalBalance } from '@platform/shared-types';

describe('Chart of Accounts Seeder & Ledger Protection Rules', () => {
  let seeder: ChartOfAccountsSeeder;
  let ledgerService: LedgerService;

  // In-memory mock storage
  let groupsTable: LedgerGroupOrmEntity[] = [];
  let ledgersTable: LedgerOrmEntity[] = [];
  let journalEntriesTable: JournalEntryOrmEntity[] = [];
  let companiesTable: CompanyOrmEntity[] = [];

  const mockEntityManager: any = {
    findOne: jest.fn(async (entityClass: any, opts: any) => {
      if (entityClass === CompanyOrmEntity) {
        return companiesTable.find((c) => c.id === opts.where?.id) || null;
      }
      if (entityClass === LedgerGroupOrmEntity) {
        return (
          groupsTable.find(
            (g) =>
              (!opts.where?.id || g.id === opts.where.id) &&
              (!opts.where?.companyId || g.companyId === opts.where.companyId) &&
              (!opts.where?.code || g.code === opts.where.code),
          ) || null
        );
      }
      if (entityClass === LedgerOrmEntity) {
        return (
          ledgersTable.find(
            (l) =>
              (!opts.where?.id || l.id === opts.where.id) &&
              (!opts.where?.companyId || l.companyId === opts.where.companyId) &&
              (!opts.where?.code || l.code === opts.where.code),
          ) || null
        );
      }
      return null;
    }),
    find: jest.fn(async (entityClass: any, opts?: any) => {
      if (entityClass === LedgerGroupOrmEntity) {
        let list = [...groupsTable];
        if (opts?.where?.companyId) list = list.filter((g) => g.companyId === opts.where.companyId);
        if (opts?.where?.parentGroupId) list = list.filter((g) => g.parentGroupId === opts.where.parentGroupId);
        return list;
      }
      if (entityClass === LedgerOrmEntity) {
        let list = [...ledgersTable];
        if (opts?.where?.companyId) list = list.filter((l) => l.companyId === opts.where.companyId);
        if (opts?.where?.groupId) list = list.filter((l) => l.groupId === opts.where.groupId);
        return list;
      }
      return [];
    }),
    count: jest.fn(async (entityClass: any, opts: any) => {
      if (entityClass === LedgerGroupOrmEntity) {
        return groupsTable.filter(
          (g) =>
            (!opts.where?.companyId || g.companyId === opts.where.companyId) &&
            (!opts.where?.code || g.code === opts.where.code) &&
            (!opts.where?.parentGroupId || g.parentGroupId === opts.where.parentGroupId),
        ).length;
      }
      if (entityClass === LedgerOrmEntity) {
        return ledgersTable.filter(
          (l) =>
            (!opts.where?.companyId || l.companyId === opts.where.companyId) &&
            (!opts.where?.code || l.code === opts.where.code) &&
            (!opts.where?.groupId || l.groupId === opts.where.groupId),
        ).length;
      }
      if (entityClass === JournalEntryOrmEntity) {
        return journalEntriesTable.filter((j) => j.ledgerId === opts.where?.ledgerId).length;
      }
      return 0;
    }),
    create: jest.fn((entityClass: any, dto: any) => ({
      id: 'mock-' + Math.random().toString(36).substring(7),
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    save: jest.fn(async (entityClass: any, entityOrEntities: any) => {
      const items = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
      const savedItems = items.map((item) => {
        const targetTable = entityClass === LedgerGroupOrmEntity ? groupsTable : ledgersTable;
        const idx = targetTable.findIndex((x) => x.id === item.id);
        if (idx >= 0) {
          targetTable[idx] = { ...targetTable[idx], ...item };
          return targetTable[idx];
        }
        targetTable.push(item);
        return item;
      });
      return Array.isArray(entityOrEntities) ? savedItems : savedItems[0];
    }),
    update: jest.fn(async (entityClass: any, id: string, partial: any) => {
      if (entityClass === CompanyOrmEntity) {
        const comp = companiesTable.find((c) => c.id === id);
        if (comp) Object.assign(comp, partial);
      }
    }),
    remove: jest.fn(async (entityClass: any, entity: any) => {
      if (entityClass === LedgerGroupOrmEntity) {
        groupsTable = groupsTable.filter((g) => g.id !== entity.id);
      }
      if (entityClass === LedgerOrmEntity) {
        ledgersTable = ledgersTable.filter((l) => l.id !== entity.id);
      }
    }),
  };

  const mockUow: any = {
    executeInTransaction: jest.fn(async (cb: (qr: any) => Promise<any>) => {
      return cb({ manager: mockEntityManager });
    }),
  };

  beforeEach(async () => {
    groupsTable = [];
    ledgersTable = [];
    journalEntriesTable = [];
    companiesTable = [
      {
        id: 'comp-101',
        tenantId: 'tenant-001',
        legalName: 'Test Corp LLP',
        defaultCurrency: 'INR',
        isActive: true,
      } as any,
    ];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChartOfAccountsSeeder,
        LedgerService,
        { provide: UnitOfWorkService, useValue: mockUow },
      ],
    }).compile();

    seeder = module.get<ChartOfAccountsSeeder>(ChartOfAccountsSeeder);
    ledgerService = module.get<LedgerService>(LedgerService);
  });

  describe('ChartOfAccountsSeeder Idempotency', () => {
    it('seeds the full standard chart for a new company on first run', async () => {
      const result = await seeder.seedForCompany(
        mockEntityManager,
        'comp-101',
        'tenant-001',
        BusinessTemplate.TRADER,
      );

      expect(result.skipped).toBe(false);
      expect(result.groupsCreated).toBeGreaterThanOrEqual(28);
      expect(result.ledgersCreated).toBeGreaterThanOrEqual(30);
      expect(groupsTable.length).toBe(result.groupsCreated);
      expect(ledgersTable.length).toBe(result.ledgersCreated);
    });

    it('creates 0 new groups and 0 new ledgers on second idempotent run', async () => {
      await seeder.seedForCompany(
        mockEntityManager,
        'comp-101',
        'tenant-001',
        BusinessTemplate.TRADER,
      );

      const secondRun = await seeder.seedForCompany(
        mockEntityManager,
        'comp-101',
        'tenant-001',
        BusinessTemplate.TRADER,
      );

      expect(secondRun.groupsCreated).toBe(0);
      expect(secondRun.ledgersCreated).toBe(0);
      expect(secondRun.skipped).toBe(false);
    });

    it('skips standard seeding for Tally-connected companies', async () => {
      const result = await seeder.seedForCompany(
        mockEntityManager,
        'comp-101',
        'tenant-001',
        BusinessTemplate.TRADER,
        'TALLY_CONNECTED',
      );

      expect(result.skipped).toBe(true);
      expect(result.groupsCreated).toBe(0);
      expect(groupsTable.length).toBe(0);
    });
  });

  describe('Protection Rules & Locked Entities', () => {
    beforeEach(async () => {
      await seeder.seedForCompany(
        mockEntityManager,
        'comp-101',
        'tenant-001',
        BusinessTemplate.TRADER,
      );
    });

    it('blocks deletion of locked system groups (e.g. Current Assets)', async () => {
      const currentAssets = groupsTable.find((g) => g.systemKey === 'GRP_CURRENT_ASSETS')!;
      expect(currentAssets.isLocked).toBe(true);

      await expect(
        ledgerService.deleteGroup('tenant-001', 'comp-101', currentAssets.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks deletion of locked system ledgers (e.g. Cash)', async () => {
      const cash = ledgersTable.find((l) => l.systemKey === 'LED_CASH')!;
      expect(cash.isLocked).toBe(true);

      await expect(
        ledgerService.deleteLedger('tenant-001', 'comp-101', cash.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks moving a locked ledger to a different group', async () => {
      const cash = ledgersTable.find((l) => l.systemKey === 'LED_CASH')!;
      const targetGroup = groupsTable.find((g) => g.systemKey === 'GRP_DUTIES_AND_TAXES')!;

      await expect(
        ledgerService.updateLedger('tenant-001', 'comp-101', cash.id, {
          groupId: targetGroup.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks deletion of an unlocked ledger if journal postings exist', async () => {
      // Create user ledger
      const group = groupsTable.find((g) => g.systemKey === 'GRP_INDIRECT_EXPENSES')!;
      const userLedger = await ledgerService.createLedger('tenant-001', 'comp-101', {
        name: 'Diwali Gifts',
        groupId: group.id,
      });

      // Add mock journal entry posting
      journalEntriesTable.push({
        id: 'je-1',
        ledgerId: userLedger.id,
      } as any);

      await expect(
        ledgerService.deleteLedger('tenant-001', 'comp-101', userLedger.id),
      ).rejects.toThrow('journal entry postings');
    });

    it('allows deleting an unlocked user ledger when there are no postings', async () => {
      const group = groupsTable.find((g) => g.systemKey === 'GRP_INDIRECT_EXPENSES')!;
      const userLedger = await ledgerService.createLedger('tenant-001', 'comp-101', {
        name: 'Temporary Expense',
        groupId: group.id,
      });

      const res = await ledgerService.deleteLedger('tenant-001', 'comp-101', userLedger.id);
      expect(res.success).toBe(true);
      expect(ledgersTable.find((l) => l.id === userLedger.id)).toBeUndefined();
    });
  });

  describe('Hierarchical Code Generation & Nature Inheritance', () => {
    beforeEach(async () => {
      await seeder.seedForCompany(
        mockEntityManager,
        'comp-101',
        'tenant-001',
        BusinessTemplate.TRADER,
      );
    });

    it('auto-generates 4-digit code within parent group range for new user ledger', async () => {
      const bankGroup = groupsTable.find((g) => g.systemKey === 'GRP_BANK_ACCOUNTS')!;
      expect(bankGroup.code).toBe('1110');

      const newLedger = await ledgerService.createLedger('tenant-001', 'comp-101', {
        name: 'HDFC Current Account',
        groupId: bankGroup.id,
      });

      expect(newLedger.code).toMatch(/^111\d$/);
    });

    it('inherits parent nature and report placement when creating child group', async () => {
      const currentLiabilities = groupsTable.find((g) => g.systemKey === 'GRP_CURRENT_LIABILITIES')!;
      expect(currentLiabilities.nature).toBe(AccountNature.LIABILITY);

      const subGroup = await ledgerService.createGroup('tenant-001', 'comp-101', {
        name: 'Vendor Retainers',
        parentGroupId: currentLiabilities.id,
        // Even if user mistakenly passed ASSET:
        nature: AccountNature.ASSET,
      });

      expect(subGroup.nature).toBe(AccountNature.LIABILITY);
      expect(subGroup.report).toBe(ReportType.BALANCE_SHEET);
      expect(subGroup.code).toMatch(/^21\d{2}$/);
    });
  });

  describe('Business Template Specificity', () => {
    it('seeds manufacturing ledgers for MANUFACTURER template', async () => {
      const res = await seeder.seedForCompany(
        mockEntityManager,
        'comp-101',
        'tenant-001',
        BusinessTemplate.MANUFACTURER,
      );

      const power = ledgersTable.find((l) => l.systemKey === 'LED_FACTORY_POWER');
      expect(power).toBeDefined();

      const machinery = ledgersTable.find((l) => l.systemKey === 'LED_PLANT_MACHINERY');
      expect(machinery).toBeDefined();
    });

    it('seeds audit and professional fees for SERVICE / CA template', async () => {
      const res = await seeder.seedForCompany(
        mockEntityManager,
        'comp-101',
        'tenant-001',
        BusinessTemplate.SERVICE,
      );

      const auditIncome = ledgersTable.find((l) => l.systemKey === 'LED_AUDIT_FEES_INCOME');
      expect(auditIncome).toBeDefined();

      const profFees = ledgersTable.find((l) => l.systemKey === 'LED_PROFESSIONAL_FEES_INCOME');
      expect(profFees).toBeDefined();
    });
  });
});

