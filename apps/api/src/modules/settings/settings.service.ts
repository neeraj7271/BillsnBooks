import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as crypto from 'crypto';
import {
  SettingScope,
  SettingResolutionContext,
  ResolvedSetting,
} from '@platform/shared-types';
import { SettingValueOrmEntity } from '../../infrastructure/persistence/entities/setting-value.orm-entity';
import { SettingHistoryOrmEntity } from '../../infrastructure/persistence/entities/setting-history.orm-entity';
import { DocumentSnapshotOrmEntity } from '../../infrastructure/persistence/entities/document-snapshot.orm-entity';
import { SettingsRegistry } from './settings.registry';
import { FileStorageService } from '../storage/file-storage.service';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingValueOrmEntity)
    private readonly settingValueRepo: Repository<SettingValueOrmEntity>,
    @InjectRepository(SettingHistoryOrmEntity)
    private readonly settingHistoryRepo: Repository<SettingHistoryOrmEntity>,
    @InjectRepository(DocumentSnapshotOrmEntity)
    private readonly snapshotRepo: Repository<DocumentSnapshotOrmEntity>,
    private readonly storage: FileStorageService,
  ) {}

  /**
   * Resolve a single setting using strict hierarchy precedence:
   * USER -> DOC_TYPE -> BRANCH -> COMPANY -> TENANT -> PLATFORM (DB) -> REGISTRY DEFAULT
   */
  async resolve(key: string, context: SettingResolutionContext): Promise<ResolvedSetting> {
    const def = SettingsRegistry.get(key);
    if (!def) {
      throw new NotFoundException(`Setting "${key}" is not registered.`);
    }

    // Build the query lookup conditions based on provided context
    const lookupScopes: Array<{ scope: SettingScope; scopeId: string | null }> = [];

    if (context.userId && def.allowedScopes.includes(SettingScope.USER)) {
      lookupScopes.push({ scope: SettingScope.USER, scopeId: context.userId });
    }
    if (context.docType && def.allowedScopes.includes(SettingScope.DOC_TYPE)) {
      // For doc_type, scope_id can be stored as the docType string or null if global to type
      lookupScopes.push({ scope: SettingScope.DOC_TYPE, scopeId: context.docType });
    }
    if (context.branchId && def.allowedScopes.includes(SettingScope.BRANCH)) {
      lookupScopes.push({ scope: SettingScope.BRANCH, scopeId: context.branchId });
    }
    if (context.companyId && def.allowedScopes.includes(SettingScope.COMPANY)) {
      lookupScopes.push({ scope: SettingScope.COMPANY, scopeId: context.companyId });
    }
    if (context.tenantId && def.allowedScopes.includes(SettingScope.TENANT)) {
      lookupScopes.push({ scope: SettingScope.TENANT, scopeId: context.tenantId });
    }
    if (def.allowedScopes.includes(SettingScope.PLATFORM)) {
      lookupScopes.push({ scope: SettingScope.PLATFORM, scopeId: null });
    }

    // Fetch existing overrides in database
    const existingValues = await this.settingValueRepo.find({
      where: {
        settingKey: key,
      },
    });

    // Check each level in priority order
    for (const target of lookupScopes) {
      const match = existingValues.find(
        (v) =>
          v.scope === target.scope &&
          (target.scopeId === null ? v.scopeId === null : v.scopeId === target.scopeId),
      );
      if (match) {
        return {
          key: def.key,
          value: match.value,
          resolvedScope: match.scope,
          scopeId: match.scopeId,
          isOverridden: true,
          defaultValue: def.defaultValue,
          category: def.category,
          description: def.description,
          isSensitive: def.isSensitive,
          isLockedAfterFirstUse: def.isLockedAfterFirstUse,
          impactsIssuedDocuments: def.impactsIssuedDocuments,
          allowedScopes: def.allowedScopes,
        };
      }
    }

    // Fallback to default
    return {
      key: def.key,
      value: def.defaultValue,
      resolvedScope: SettingScope.PLATFORM,
      scopeId: null,
      isOverridden: false,
      defaultValue: def.defaultValue,
      category: def.category,
      description: def.description,
      isSensitive: def.isSensitive,
      isLockedAfterFirstUse: def.isLockedAfterFirstUse,
      impactsIssuedDocuments: def.impactsIssuedDocuments,
      allowedScopes: def.allowedScopes,
    };
  }

  /**
   * Resolve all registered settings for a given context
   */
  async resolveAll(context: SettingResolutionContext): Promise<ResolvedSetting[]> {
    const allDefs = SettingsRegistry.getAll();
    const results: ResolvedSetting[] = [];
    for (const def of allDefs) {
      results.push(await this.resolve(def.key, context));
    }
    return results;
  }

  /**
   * Save or override a setting value with validation and audit trail
   */
  async set(
    key: string,
    value: any,
    scope: SettingScope,
    scopeId: string | null,
    userId: string,
    reason?: string,
  ): Promise<SettingValueOrmEntity> {
    const def = SettingsRegistry.get(key);
    if (!def) {
      throw new BadRequestException(`Unrecognized setting key: "${key}"`);
    }

    if (!def.allowedScopes.includes(scope)) {
      throw new BadRequestException(
        `Setting "${key}" cannot be set at scope "${scope}". Allowed scopes: ${def.allowedScopes.join(', ')}`,
      );
    }

    // Validate value against Zod schema
    const validation = SettingsRegistry.validate(key, value);
    if (!validation.success) {
      throw new BadRequestException(`Validation error for "${key}": ${validation.error}`);
    }

    const validatedValue = validation.data;

    // Check existing value
    const existing = await this.settingValueRepo.findOne({
      where: {
        settingKey: key,
        scope,
        scopeId: scopeId ?? undefined,
      },
    });

    const oldValue = existing ? existing.value : null;

    // If setting to null or resetting, remove the override to fall back cleanly to default
    if (validatedValue === null || validatedValue === undefined) {
      if (existing) {
        await this.settingHistoryRepo.save(
          this.settingHistoryRepo.create({
            settingKey: key,
            scope,
            scopeId,
            oldValue: existing.value,
            newValue: null,
            changedBy: userId,
            changeReason: reason || 'Reset to default configuration',
          }),
        );
        await this.settingValueRepo.remove(existing);
      }
      return { id: '', settingKey: key, scope, scopeId, value: null } as any;
    }

    let savedEntity: SettingValueOrmEntity;
    if (existing) {
      existing.value = validatedValue;
      existing.updatedBy = userId;
      savedEntity = await this.settingValueRepo.save(existing);
    } else {
      const newEntity = this.settingValueRepo.create({
        settingKey: key,
        scope,
        scopeId,
        value: validatedValue,
        updatedBy: userId,
      });
      savedEntity = await this.settingValueRepo.save(newEntity);
    }

    // Record audit history
    await this.settingHistoryRepo.save(
      this.settingHistoryRepo.create({
        settingKey: key,
        scope,
        scopeId,
        oldValue,
        newValue: validatedValue,
        changedBy: userId,
        changeReason: reason || 'Manual configuration update',
      }),
    );

    return savedEntity;
  }

  /**
   * Reset / delete an override at a specific scope
   */
  async reset(
    key: string,
    scope: SettingScope,
    scopeId: string | null,
    userId: string,
    reason?: string,
  ): Promise<void> {
    const existing = await this.settingValueRepo.findOne({
      where: {
        settingKey: key,
        scope,
        scopeId: scopeId ?? undefined,
      },
    });

    if (existing) {
      await this.settingHistoryRepo.save(
        this.settingHistoryRepo.create({
          settingKey: key,
          scope,
          scopeId,
          oldValue: existing.value,
          newValue: null,
          changedBy: userId,
          changeReason: reason || 'Reset to default configuration',
        }),
      );
      await this.settingValueRepo.remove(existing);
    }
  }

  /**
   * Get version history / audit trail for a setting
   */
  async getHistory(
    key: string,
    scope?: SettingScope,
    scopeId?: string | null,
  ): Promise<SettingHistoryOrmEntity[]> {
    const where: any = { settingKey: key };
    if (scope) where.scope = scope;
    if (scopeId !== undefined) where.scopeId = scopeId;

    return this.settingHistoryRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /**
   * Create an immutable document snapshot with SHA-256 hash
   */
  async createDocumentSnapshot(
    tenantId: string,
    companyId: string,
    documentType: string,
    documentId: string,
    snapshotData: any,
  ): Promise<DocumentSnapshotOrmEntity> {
    const existing = await this.snapshotRepo.findOne({
      where: { documentType, documentId },
    });
    if (existing) {
      return existing; // Already permanently snapshotted; immutable
    }

    const payloadString = JSON.stringify(snapshotData);
    const hash = crypto.createHash('sha256').update(payloadString).digest('hex');

    const snapshot = this.snapshotRepo.create({
      tenantId,
      companyId,
      documentType,
      documentId,
      snapshotData,
      sha256Hash: hash,
    });

    return this.snapshotRepo.save(snapshot);
  }

  /**
   * Retrieve immutable document snapshot
   */
  async getDocumentSnapshot(
    documentType: string,
    documentId: string,
  ): Promise<DocumentSnapshotOrmEntity | null> {
    return this.snapshotRepo.findOne({
      where: { documentType, documentId },
    });
  }

  /**
   * Copy company-level settings from one company to another (for CA firm onboarding)
   */
  async copyCompanySettings(
    sourceCompanyId: string,
    targetCompanyId: string,
    userId: string,
  ): Promise<{ copiedCount: number }> {
    const sourceSettings = await this.settingValueRepo.find({
      where: {
        scope: SettingScope.COMPANY,
        scopeId: sourceCompanyId,
      },
    });

    let count = 0;
    for (const s of sourceSettings) {
      await this.set(
        s.settingKey,
        s.value,
        SettingScope.COMPANY,
        targetCompanyId,
        userId,
        `Copied from company ${sourceCompanyId}`,
      );
      count++;
    }

    return { copiedCount: count };
  }

  /**
   * Export all company settings to a JSON payload
   */
  async exportCompanySettings(companyId: string): Promise<Record<string, any>> {
    const settings = await this.settingValueRepo.find({
      where: {
        scope: SettingScope.COMPANY,
        scopeId: companyId,
      },
    });

    const exportMap: Record<string, any> = {};
    for (const s of settings) {
      exportMap[s.settingKey] = s.value;
    }
    return exportMap;
  }

  /**
   * Import company settings from a JSON payload
   */
  async importCompanySettings(
    companyId: string,
    settingsMap: Record<string, any>,
    userId: string,
  ): Promise<{ importedCount: number }> {
    let count = 0;
    for (const [key, value] of Object.entries(settingsMap)) {
      const def = SettingsRegistry.get(key);
      if (def && def.allowedScopes.includes(SettingScope.COMPANY)) {
        await this.set(
          key,
          value,
          SettingScope.COMPANY,
          companyId,
          userId,
          'Imported from JSON configuration preset',
        );
        count++;
      }
    }
    return { importedCount: count };
  }

  async uploadBrandingAsset(
    companyId: string,
    key: string,
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ key: string; storageKey: string; url: string }> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Branding image file is required.');
    }
    const allowed = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
    if (!allowed.has((file.mimetype || '').toLowerCase())) {
      throw new BadRequestException('Only PNG, JPG, or WebP images are allowed for branding assets.');
    }
    if (file.buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('Branding image must be under 5 MB.');
    }
    const ext = file.mimetype.includes('jpeg') || file.mimetype.includes('jpg') ? 'jpg' : file.mimetype.includes('webp') ? 'webp' : 'png';
    const cleanKeyName = key.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const storageKey = `branding/${companyId}/${cleanKeyName}-${crypto.randomUUID()}.${ext}`;
    await this.storage.put(storageKey, file.buffer, file.mimetype, { companyId, settingKey: key });

    const assetUrl = `/v1/companies/${companyId}/settings/branding/asset?key=${encodeURIComponent(storageKey)}`;
    await this.set(key, assetUrl, SettingScope.COMPANY, companyId, userId, 'Uploaded branding asset to object storage');
    return { key, storageKey, url: assetUrl };
  }

  async getBrandingAsset(companyId: string, storageKey: string) {
    if (!storageKey || !storageKey.startsWith(`branding/${companyId}/`)) {
      throw new BadRequestException('Invalid branding asset key.');
    }
    return await this.storage.get(storageKey);
  }

  async migrateBrandingBase64ToStorage(companyId?: string): Promise<{ migrated: number }> {
    const targetKeys = ['invoice.logo_url', 'invoice.signature_url'];
    const rows = await this.settingValueRepo.find({
      where: {
        settingKey: In(targetKeys),
        ...(companyId ? { scope: SettingScope.COMPANY, scopeId: companyId } : {}),
      },
    });
    let migrated = 0;
    for (const row of rows) {
      const val = typeof row.value === 'string' ? row.value : '';
      const match = val.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) continue;
      const mime = match[1];
      const buf = Buffer.from(match[2], 'base64');
      const cid = row.scopeId || 'global';
      const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('svg') ? 'svg' : 'png';
      const storageKey = `branding/${cid}/${row.settingKey.replace(/[^a-zA-Z0-9_.-]/g, '_')}-${crypto.randomUUID()}.${ext}`;
      await this.storage.put(storageKey, buf, mime, { companyId: cid, migratedFrom: 'base64' });
      row.value = `/v1/companies/${cid}/settings/branding/asset?key=${encodeURIComponent(storageKey)}`;
      await this.settingValueRepo.save(row);
      migrated++;
    }
    return { migrated };
  }
}

