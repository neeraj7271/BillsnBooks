import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SettingsService } from '../src/modules/settings/settings.service';
import { SettingsRegistry } from '../src/modules/settings/settings.registry';
import { SettingValueOrmEntity } from '../src/infrastructure/persistence/entities/setting-value.orm-entity';
import { SettingHistoryOrmEntity } from '../src/infrastructure/persistence/entities/setting-history.orm-entity';
import { DocumentSnapshotOrmEntity } from '../src/infrastructure/persistence/entities/document-snapshot.orm-entity';
import { SettingScope, SettingCategory } from '@platform/shared-types';

describe('SettingsService & SettingsRegistry', () => {
  let service: SettingsService;
  let mockValues: SettingValueOrmEntity[] = [];
  let mockHistory: SettingHistoryOrmEntity[] = [];
  let mockSnapshots: DocumentSnapshotOrmEntity[] = [];

  const mockValueRepo = {
    find: jest.fn(async (opts?: any) => {
      let filtered = [...mockValues];
      if (opts?.where?.settingKey) {
        filtered = filtered.filter((v) => v.settingKey === opts.where.settingKey);
      }
      if (opts?.where?.scope) {
        filtered = filtered.filter((v) => v.scope === opts.where.scope);
      }
      if (opts?.where?.scopeId !== undefined) {
        filtered = filtered.filter((v) => v.scopeId === opts.where.scopeId);
      }
      return filtered;
    }),
    findOne: jest.fn(async (opts: any) => {
      return (
        mockValues.find(
          (v) =>
            v.settingKey === opts.where.settingKey &&
            v.scope === opts.where.scope &&
            (opts.where.scopeId === undefined || v.scopeId === opts.where.scopeId),
        ) || null
      );
    }),
    create: jest.fn((dto) => ({
      id: 'val-' + Math.random().toString(36).substring(7),
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    save: jest.fn(async (entity) => {
      const idx = mockValues.findIndex(
        (v) => v.settingKey === entity.settingKey && v.scope === entity.scope && v.scopeId === entity.scopeId,
      );
      if (idx >= 0) {
        mockValues[idx] = { ...mockValues[idx], ...entity, updatedAt: new Date() };
        return mockValues[idx];
      }
      mockValues.push(entity);
      return entity;
    }),
    remove: jest.fn(async (entity) => {
      mockValues = mockValues.filter((v) => v.id !== entity.id);
    }),
  };

  const mockHistoryRepo = {
    create: jest.fn((dto) => ({
      id: 'hist-' + Math.random().toString(36).substring(7),
      ...dto,
      createdAt: new Date(),
    })),
    save: jest.fn(async (entity) => {
      mockHistory.push(entity);
      return entity;
    }),
    find: jest.fn(async (opts?: any) => {
      return mockHistory.filter((h) => !opts?.where?.settingKey || h.settingKey === opts.where.settingKey);
    }),
  };

  const mockSnapshotRepo = {
    create: jest.fn((dto) => ({
      id: 'snap-' + Math.random().toString(36).substring(7),
      ...dto,
      createdAt: new Date(),
    })),
    save: jest.fn(async (entity) => {
      mockSnapshots.push(entity);
      return entity;
    }),
    findOne: jest.fn(async (opts: any) => {
      return (
        mockSnapshots.find(
          (s) => s.documentType === opts.where.documentType && s.documentId === opts.where.documentId,
        ) || null
      );
    }),
  };

  beforeEach(async () => {
    mockValues = [];
    mockHistory = [];
    mockSnapshots = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(SettingValueOrmEntity),
          useValue: mockValueRepo,
        },
        {
          provide: getRepositoryToken(SettingHistoryOrmEntity),
          useValue: mockHistoryRepo,
        },
        {
          provide: getRepositoryToken(DocumentSnapshotOrmEntity),
          useValue: mockSnapshotRepo,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  describe('SettingsRegistry Validation', () => {
    it('should validate valid financial settings', () => {
      const validCurrency = SettingsRegistry.validate('financial.base_currency', 'INR');
      expect(validCurrency.success).toBe(true);

      const validLockDate = SettingsRegistry.validate('financial.fy_lock_date', '2026-03-31');
      expect(validLockDate.success).toBe(true);

      const validDecimals = SettingsRegistry.validate('financial.decimal_places', 2);
      expect(validDecimals.success).toBe(true);
    });

    it('should reject invalid values with descriptive errors', () => {
      const invalidCurrency = SettingsRegistry.validate('financial.base_currency', 'TOOLONG');
      expect(invalidCurrency.success).toBe(false);

      const invalidDate = SettingsRegistry.validate('financial.fy_lock_date', '31-03-2026');
      expect(invalidDate.success).toBe(false);

      const invalidDecimals = SettingsRegistry.validate('financial.decimal_places', 10);
      expect(invalidDecimals.success).toBe(false);

      const invalidColor = SettingsRegistry.validate('branding.primary_color', 'blue');
      expect(invalidColor.success).toBe(false);
    });

    it('should retrieve definitions by category', () => {
      const financialDefs = SettingsRegistry.getByCategory(SettingCategory.FINANCIAL);
      expect(financialDefs.length).toBeGreaterThanOrEqual(4);
      expect(financialDefs.some((d) => d.key === 'financial.base_currency')).toBe(true);
    });
  });

  describe('Hierarchical Resolution Precedence', () => {
    const companyId = 'c1111111-1111-4000-8000-000000000001';
    const branchId = 'b2222222-2222-4000-8000-000000000002';
    const context = { companyId, branchId };

    it('should return platform default when no override exists', async () => {
      const resolved = await service.resolve('document.default_template', context);
      expect(resolved.value).toBe('classic');
      expect(resolved.resolvedScope).toBe(SettingScope.PLATFORM);
      expect(resolved.isOverridden).toBe(false);
    });

    it('should resolve company-level override when present', async () => {
      await service.set(
        'document.default_template',
        'modern',
        SettingScope.COMPANY,
        companyId,
        'user-1',
        'Set company brand template',
      );

      const resolved = await service.resolve('document.default_template', context);
      expect(resolved.value).toBe('modern');
      expect(resolved.resolvedScope).toBe(SettingScope.COMPANY);
      expect(resolved.scopeId).toBe(companyId);
      expect(resolved.isOverridden).toBe(true);
    });

    it('should allow branch-level override to win over company-level override', async () => {
      // Company level = 'modern'
      await service.set(
        'document.default_template',
        'modern',
        SettingScope.COMPANY,
        companyId,
        'user-1',
      );

      // Branch level = 'thermal'
      await service.set(
        'document.default_template',
        'thermal',
        SettingScope.BRANCH,
        branchId,
        'user-1',
        'POS thermal printer at retail branch',
      );

      const resolved = await service.resolve('document.default_template', context);
      expect(resolved.value).toBe('thermal');
      expect(resolved.resolvedScope).toBe(SettingScope.BRANCH);
      expect(resolved.scopeId).toBe(branchId);
      expect(resolved.isOverridden).toBe(true);
    });
  });

  describe('Audit Trail & Version History', () => {
    it('should record every change in setting_history and allow reset', async () => {
      const companyId = 'c1111111-1111-4000-8000-000000000001';

      // 1. Set company color
      await service.set(
        'branding.primary_color',
        '#10b981',
        SettingScope.COMPANY,
        companyId,
        'user-admin',
        'Update corporate emerald green brand',
      );

      // 2. Update company color again
      await service.set(
        'branding.primary_color',
        '#6366f1',
        SettingScope.COMPANY,
        companyId,
        'user-admin',
        'Rebrand to indigo',
      );

      const history = await service.getHistory('branding.primary_color', SettingScope.COMPANY, companyId);
      expect(history.length).toBe(2);
      expect(history[0].newValue).toBe('#10b981');
      expect(history[1].oldValue).toBe('#10b981');
      expect(history[1].newValue).toBe('#6366f1');

      // 3. Reset back to default
      await service.reset('branding.primary_color', SettingScope.COMPANY, companyId, 'user-admin');

      const afterReset = await service.resolve('branding.primary_color', { companyId });
      expect(afterReset.value).toBe('#2563eb'); // Default
      expect(afterReset.isOverridden).toBe(false);
    });
  });

  describe('Immutable Document Snapshots', () => {
    it('should compute SHA-256 hash and guarantee snapshot immutability', async () => {
      const tenantId = 't0000000-0000-4000-8000-000000000001';
      const companyId = 'c1111111-1111-4000-8000-000000000001';
      const invoiceId = 'inv-9999999-9999-4000-8000-000000000001';

      const payload = {
        templateVersion: '1.0',
        companyName: 'Acme India Ltd',
        gstin: '27AABCA1234F1Z5',
        totalAmount: 118000.0,
      };

      const snapshot = await service.createDocumentSnapshot(
        tenantId,
        companyId,
        'INVOICE',
        invoiceId,
        payload,
      );

      expect(snapshot.sha256Hash).toBeDefined();
      expect(snapshot.sha256Hash.length).toBe(64);
      expect(snapshot.snapshotData.companyName).toBe('Acme India Ltd');

      // Attempting to snapshot again returns existing snapshot without modification
      const secondCall = await service.createDocumentSnapshot(
        tenantId,
        companyId,
        'INVOICE',
        invoiceId,
        { companyName: 'MUTATED NAME' },
      );

      expect(secondCall.snapshotData.companyName).toBe('Acme India Ltd');
      expect(secondCall.sha256Hash).toBe(snapshot.sha256Hash);
    });
  });

  describe('Copy & Presets for CA Firm Onboarding', () => {
    it('should copy all company-level settings to a newly onboarded client', async () => {
      const firmTemplateCompany = 'c-template-001';
      const newClientCompany = 'c-client-002';

      await service.set('financial.base_currency', 'INR', SettingScope.COMPANY, firmTemplateCompany, 'ca-user');
      await service.set('tax.e_way_bill_threshold', 100000, SettingScope.COMPANY, firmTemplateCompany, 'ca-user');
      await service.set('document.show_qr_code', true, SettingScope.COMPANY, firmTemplateCompany, 'ca-user');

      const result = await service.copyCompanySettings(firmTemplateCompany, newClientCompany, 'ca-user');
      expect(result.copiedCount).toBe(3);

      const clientCurrency = await service.resolve('financial.base_currency', { companyId: newClientCompany });
      expect(clientCurrency.value).toBe('INR');
      expect(clientCurrency.isOverridden).toBe(true);

      const clientThreshold = await service.resolve('tax.e_way_bill_threshold', { companyId: newClientCompany });
      expect(clientThreshold.value).toBe(100000);
    });

    it('should export and import company presets cleanly', async () => {
      const companyId = 'c-import-test';
      const preset = {
        'tax.e_way_bill_threshold': 75000,
        'branding.primary_color': '#e11d48',
      };

      const importResult = await service.importCompanySettings(companyId, preset, 'importer');
      expect(importResult.importedCount).toBe(2);

      const exported = await service.exportCompanySettings(companyId);
      expect(exported['tax.e_way_bill_threshold']).toBe(75000);
      expect(exported['branding.primary_color']).toBe('#e11d48');
    });
  });
});

