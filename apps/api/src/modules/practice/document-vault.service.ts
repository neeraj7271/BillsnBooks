import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnsupportedMediaTypeException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';
import { EntityManager } from 'typeorm';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { FileStorageService } from '../storage/file-storage.service';
import { DocumentFolderOrmEntity } from '../../infrastructure/persistence/entities/document-folder.orm-entity';
import { DocumentFileOrmEntity } from '../../infrastructure/persistence/entities/document-file.orm-entity';
import { ClientDocumentRequestOrmEntity } from '../../infrastructure/persistence/entities/client-document-request.orm-entity';
import { FirmClientOrmEntity } from '../../infrastructure/persistence/entities/firm-client.orm-entity';
import { AuditLogOrmEntity } from '../../infrastructure/persistence/entities/audit-log.orm-entity';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';
import { DocumentRequestStatus, DocumentRequestType } from '@platform/shared-types';

export const DEFAULT_VAULT_FOLDERS = [
  'GST',
  'Income Tax',
  'TDS',
  'ROC / MCA',
  'Audit',
  'Bank Statements',
  'Agreements',
  'Correspondence',
  'Misc',
] as const;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/csv',
  'application/csv',
  'application/zip',
  'application/x-zip-compressed',
]);

const FORBIDDEN_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.svg',
  '.exe',
  '.sh',
  '.bat',
  '.cmd',
  '.js',
  '.mjs',
  '.cjs',
  '.php',
  '.py',
]);

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class DocumentVaultService {
  constructor(
    private readonly uow: UnitOfWorkService,
    private readonly storage: FileStorageService,
  ) {}

  private sanitizeFileName(raw: string): string {
    const base = path.basename(raw || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
    return base.slice(0, 180) || 'document';
  }

  validateUploadFile(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
    if (!file || !file.buffer) {
      throw new BadRequestException('File upload is required.');
    }
    if (file.size > MAX_UPLOAD_BYTES || file.buffer.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File exceeds maximum allowed size of 25 MB.');
    }
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      throw new UnsupportedMediaTypeException(`File type '${ext}' is not allowed for security reasons.`);
    }
    const mime = (file.mimetype || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new UnsupportedMediaTypeException(
        `Unsupported MIME type '${mime}'. Allowed: PDF, JPG, PNG, XLSX, DOCX, CSV, ZIP.`,
      );
    }
  }

  private async recordAudit(
    manager: EntityManager,
    params: {
      tenantId: string;
      actorId?: string | null;
      entityType: string;
      entityId: string;
      action: string;
      payloadAfter?: Record<string, unknown> | null;
    },
  ) {
    const nowIso = new Date().toISOString();
    const recordHash = crypto
      .createHash('sha256')
      .update(
        `${params.tenantId}|${params.entityType}|${params.entityId}|${params.action}|${params.actorId || 'system'}|${nowIso}`,
      )
      .digest('hex');

    const log = manager.create(AuditLogOrmEntity, {
      tenantId: params.tenantId,
      actorId: params.actorId || null,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      payloadAfter: params.payloadAfter || null,
      recordHash,
    });
    await manager.save(AuditLogOrmEntity, log);
  }

  private async resolveActorName(manager: EntityManager, userId?: string | null): Promise<string | null> {
    if (!userId) return null;
    const u = await manager.findOne(UserOrmEntity, { where: { id: userId } });
    if (!u) return null;
    return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
  }

  private async assertClientAccess(
    manager: EntityManager,
    tenantId: string,
    clientId: string,
    userId?: string,
    role?: string,
  ): Promise<FirmClientOrmEntity> {
    const client = await manager.findOne(FirmClientOrmEntity, {
      where: { id: clientId, tenantId },
      relations: ['company'],
    });
    if (!client) {
      throw new NotFoundException(`Client '${clientId}' not found.`);
    }
    if (role === 'CLIENT_VIEWER' && userId) {
      const user = await manager.findOne(UserOrmEntity, { where: { id: userId } });
      if (user && client.primaryContactEmail && user.email.toLowerCase() !== client.primaryContactEmail.toLowerCase()) {
        // Also allow if user belongs to the same tenant and client has no specific restriction only when explicitly matched;
        // if primaryContactEmail is a different user email, block cross-client access when multiple clients exist.
        const clientCountForUser = await manager.count(FirmClientOrmEntity, {
          where: { tenantId, primaryContactEmail: user.email.toLowerCase() },
        });
        if (clientCountForUser > 0) {
          throw new ForbiddenException('You do not have access to another client vault.');
        }
      }
    }
    return client;
  }

  async ensureDefaultFoldersInTx(
    manager: EntityManager,
    tenantId: string,
    clientId: string,
  ): Promise<DocumentFolderOrmEntity[]> {
    const existing = await manager.find(DocumentFolderOrmEntity, {
      where: { tenantId, clientId },
      order: { name: 'ASC' },
    });
    if (existing.length > 0) return existing;

    const created: DocumentFolderOrmEntity[] = [];
    for (const name of DEFAULT_VAULT_FOLDERS) {
      const folder = manager.create(DocumentFolderOrmEntity, {
        tenantId,
        clientId,
        name,
        isSystem: true,
      });
      created.push(await manager.save(DocumentFolderOrmEntity, folder));
    }
    return created;
  }

  private mapFileDto(f: DocumentFileOrmEntity, clientName?: string) {
    return {
      id: f.id,
      tenantId: f.tenantId,
      clientId: f.clientId,
      clientName: clientName || f.client?.company?.legalName,
      folderId: f.folderId || null,
      folderName: f.folder?.name || null,
      requestId: f.requestId || null,
      fileGroupId: f.fileGroupId,
      storageKey: f.storageKey,
      fileName: f.fileName,
      mimeType: f.mimeType,
      sizeBytes: Number(f.sizeBytes),
      sha256: f.sha256,
      uploadedByUserId: f.uploadedByUserId || null,
      uploadedByName: f.uploadedByName || 'System',
      version: f.version,
      isLatest: f.isLatest,
      createdAt: f.createdAt.toISOString(),
    };
  }

  async getClientVault(
    tenantId: string,
    clientId: string,
    userId: string,
    role: string,
    query?: { folderId?: string; q?: string },
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const client = await this.assertClientAccess(qr.manager, tenantId, clientId, userId, role);
      const folders = await this.ensureDefaultFoldersInTx(qr.manager, tenantId, clientId);

      const qb = qr.manager
        .createQueryBuilder(DocumentFileOrmEntity, 'f')
        .leftJoinAndSelect('f.folder', 'folder')
        .where('f.tenant_id = :tenantId', { tenantId })
        .andWhere('f.client_id = :clientId', { clientId })
        .andWhere('f.is_latest = true')
        .andWhere('f.is_deleted = false')
        .orderBy('f.created_at', 'DESC');

      if (query?.folderId) {
        qb.andWhere('f.folder_id = :folderId', { folderId: query.folderId });
      }
      if (query?.q?.trim()) {
        qb.andWhere('LOWER(f.file_name) LIKE :q', { q: `%${query.q.trim().toLowerCase()}%` });
      }

      const files = await qb.getMany();

      // Count files per folder
      const allActive = await qr.manager.find(DocumentFileOrmEntity, {
        where: { tenantId, clientId, isLatest: true, isDeleted: false },
        select: ['id', 'folderId'],
      });
      const countsByFolder = new Map<string, number>();
      for (const item of allActive) {
        if (item.folderId) {
          countsByFolder.set(item.folderId, (countsByFolder.get(item.folderId) || 0) + 1);
        }
      }

      return {
        client: {
          id: client.id,
          companyId: client.companyId,
          companyName: client.company?.legalName || 'Unknown Client',
          clientCode: client.clientCode,
          primaryContactName: client.primaryContactName,
          primaryContactEmail: client.primaryContactEmail,
        },
        folders: folders.map((fld) => ({
          id: fld.id,
          name: fld.name,
          isSystem: fld.isSystem,
          parentId: fld.parentId || null,
          fileCount: countsByFolder.get(fld.id) || 0,
        })),
        files: files.map((f) => this.mapFileDto(f, client.company?.legalName)),
      };
    });
  }

  async listAllVaultFiles(
    tenantId: string,
    userId: string,
    role: string,
    query?: { clientId?: string; q?: string; folderName?: string },
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const qb = qr.manager
        .createQueryBuilder(DocumentFileOrmEntity, 'f')
        .leftJoinAndSelect('f.folder', 'folder')
        .leftJoinAndSelect('f.client', 'client')
        .leftJoinAndSelect('client.company', 'company')
        .where('f.tenant_id = :tenantId', { tenantId })
        .andWhere('f.is_latest = true')
        .andWhere('f.is_deleted = false')
        .orderBy('f.created_at', 'DESC');

      if (role === 'CLIENT_VIEWER') {
        const user = await qr.manager.findOne(UserOrmEntity, { where: { id: userId } });
        if (user) {
          const ownClients = await qr.manager.find(FirmClientOrmEntity, {
            where: { tenantId, primaryContactEmail: user.email.toLowerCase() },
          });
          if (ownClients.length > 0) {
            qb.andWhere('f.client_id IN (:...ownIds)', { ownIds: ownClients.map((c) => c.id) });
          }
        }
      }

      if (query?.clientId) {
        qb.andWhere('f.client_id = :clientId', { clientId: query.clientId });
      }
      if (query?.folderName) {
        qb.andWhere('LOWER(folder.name) = :fname', { fname: query.folderName.toLowerCase() });
      }
      if (query?.q?.trim()) {
        qb.andWhere('(LOWER(f.file_name) LIKE :q OR LOWER(company.legal_name) LIKE :q)', {
          q: `%${query.q.trim().toLowerCase()}%`,
        });
      }

      const files = await qb.getMany();
      return files.map((f) => this.mapFileDto(f));
    });
  }

  async createFolder(tenantId: string, clientId: string, name: string, parentId?: string) {
    const clean = (name || '').trim();
    if (!clean) throw new BadRequestException('Folder name is required.');
    return this.uow.executeInTransaction(async (qr) => {
      await this.assertClientAccess(qr.manager, tenantId, clientId);
      const folder = qr.manager.create(DocumentFolderOrmEntity, {
        tenantId,
        clientId,
        name: clean.slice(0, 150),
        parentId: parentId || null,
        isSystem: false,
      });
      return await qr.manager.save(DocumentFolderOrmEntity, folder);
    });
  }

  async renameFolder(tenantId: string, folderId: string, name: string) {
    const clean = (name || '').trim();
    if (!clean) throw new BadRequestException('Folder name is required.');
    return this.uow.executeInTransaction(async (qr) => {
      const folder = await qr.manager.findOne(DocumentFolderOrmEntity, {
        where: { id: folderId, tenantId },
      });
      if (!folder) throw new NotFoundException('Folder not found.');
      folder.name = clean.slice(0, 150);
      return await qr.manager.save(DocumentFolderOrmEntity, folder);
    });
  }

  private mapRequestTypeToFolderName(docType: DocumentRequestType): string {
    switch (docType) {
      case DocumentRequestType.BANK_STATEMENT:
        return 'Bank Statements';
      case DocumentRequestType.SALES_REGISTER:
      case DocumentRequestType.PURCHASE_BILLS:
        return 'GST';
      case DocumentRequestType.CHALLAN:
        return 'TDS';
      case DocumentRequestType.EXPENSE_VOUCHERS:
        return 'Audit';
      default:
        return 'Misc';
    }
  }

  async uploadToRequest(
    tenantId: string,
    userId: string,
    requestId: string,
    file: Express.Multer.File,
  ) {
    this.validateUploadFile(file);
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const safeName = this.sanitizeFileName(file.originalname);

    return this.uow.executeInTransaction(async (qr) => {
      const docReq = await qr.manager.findOne(ClientDocumentRequestOrmEntity, {
        where: { id: requestId, tenantId },
        relations: ['client', 'client.company'],
      });
      if (!docReq) {
        throw new NotFoundException(`Document request '${requestId}' not found.`);
      }

      const folders = await this.ensureDefaultFoldersInTx(qr.manager, tenantId, docReq.clientId);
      const targetFolderName = this.mapRequestTypeToFolderName(docReq.documentType);
      const targetFolder = folders.find((f) => f.name === targetFolderName) || folders[0];

      const existingLatest = await qr.manager.findOne(DocumentFileOrmEntity, {
        where: { tenantId, requestId, isLatest: true, isDeleted: false },
        order: { version: 'DESC' },
      });

      const fileGroupId = existingLatest?.fileGroupId || crypto.randomUUID();
      const nextVersion = existingLatest ? existingLatest.version + 1 : 1;

      if (existingLatest) {
        existingLatest.isLatest = false;
        await qr.manager.save(DocumentFileOrmEntity, existingLatest);
      }

      const storageKey = `tenant/${tenantId}/clients/${docReq.clientId}/docreq/${requestId}/${crypto.randomUUID()}-${safeName}`;
      await this.storage.put(storageKey, file.buffer, file.mimetype, {
        tenantId,
        clientId: docReq.clientId,
        requestId,
        sha256,
      });

      const uploaderName = await this.resolveActorName(qr.manager, userId);

      const newFile = qr.manager.create(DocumentFileOrmEntity, {
        tenantId,
        clientId: docReq.clientId,
        folderId: targetFolder?.id || null,
        requestId,
        fileGroupId,
        storageKey,
        fileName: file.originalname || safeName,
        mimeType: file.mimetype,
        sizeBytes: file.buffer.length,
        sha256,
        uploadedByUserId: userId,
        uploadedByName: uploaderName,
        version: nextVersion,
        isLatest: true,
        isDeleted: false,
      });

      const savedFile = await qr.manager.save(DocumentFileOrmEntity, newFile);

      docReq.fileName = savedFile.fileName;
      docReq.fileSizeBytes = Number(savedFile.sizeBytes);
      docReq.fileUrl = `/v1/practice/documents/files/${savedFile.id}/download`;
      docReq.status = DocumentRequestStatus.UPLOADED;
      docReq.rejectionReason = null;

      const savedReq = await qr.manager.save(ClientDocumentRequestOrmEntity, docReq);

      await this.recordAudit(qr.manager, {
        tenantId,
        actorId: userId,
        entityType: 'DOCUMENT_FILE',
        entityId: savedFile.id,
        action: 'UPLOAD',
        payloadAfter: {
          fileGroupId,
          fileName: savedFile.fileName,
          sizeBytes: Number(savedFile.sizeBytes),
          sha256,
          version: nextVersion,
          requestId,
          storageKey,
        },
      });

      return {
        id: savedReq.id,
        tenantId: savedReq.tenantId,
        clientId: savedReq.clientId,
        clientName: savedReq.client?.company?.legalName,
        title: savedReq.title,
        description: savedReq.description || undefined,
        documentType: savedReq.documentType,
        period: savedReq.period,
        status: savedReq.status,
        dueDate: savedReq.dueDate || undefined,
        fileUrl: savedReq.fileUrl || undefined,
        fileName: savedReq.fileName || undefined,
        fileSizeBytes: Number(savedReq.fileSizeBytes || 0),
        fileId: savedFile.id,
        version: savedFile.version,
        sha256: savedFile.sha256,
        createdAt: savedReq.createdAt.toISOString(),
        updatedAt: savedReq.updatedAt.toISOString(),
      };
    });
  }

  async uploadToVault(
    tenantId: string,
    userId: string,
    role: string,
    clientId: string,
    file: Express.Multer.File,
    opts?: { folderId?: string; replaceFileGroupId?: string },
  ) {
    this.validateUploadFile(file);
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const safeName = this.sanitizeFileName(file.originalname);

    return this.uow.executeInTransaction(async (qr) => {
      const client = await this.assertClientAccess(qr.manager, tenantId, clientId, userId, role);
      const folders = await this.ensureDefaultFoldersInTx(qr.manager, tenantId, clientId);

      let folderId = opts?.folderId || null;
      let fileGroupId = opts?.replaceFileGroupId || crypto.randomUUID();
      let nextVersion = 1;

      if (opts?.replaceFileGroupId) {
        const prevLatest = await qr.manager.findOne(DocumentFileOrmEntity, {
          where: { tenantId, clientId, fileGroupId: opts.replaceFileGroupId, isLatest: true, isDeleted: false },
          order: { version: 'DESC' },
        });
        if (!prevLatest) {
          throw new NotFoundException('Target file to replace was not found.');
        }
        nextVersion = prevLatest.version + 1;
        folderId = folderId || prevLatest.folderId || null;
        prevLatest.isLatest = false;
        await qr.manager.save(DocumentFileOrmEntity, prevLatest);
      }

      if (!folderId) {
        const misc = folders.find((f) => f.name === 'Misc') || folders[0];
        folderId = misc?.id || null;
      }

      const storageKey = `tenant/${tenantId}/clients/${clientId}/vault/${crypto.randomUUID()}-${safeName}`;
      await this.storage.put(storageKey, file.buffer, file.mimetype, {
        tenantId,
        clientId,
        sha256,
      });

      const uploaderName = await this.resolveActorName(qr.manager, userId);

      const entity = qr.manager.create(DocumentFileOrmEntity, {
        tenantId,
        clientId,
        folderId,
        requestId: null,
        fileGroupId,
        storageKey,
        fileName: file.originalname || safeName,
        mimeType: file.mimetype,
        sizeBytes: file.buffer.length,
        sha256,
        uploadedByUserId: userId,
        uploadedByName: uploaderName,
        version: nextVersion,
        isLatest: true,
        isDeleted: false,
      });

      const saved = await qr.manager.save(DocumentFileOrmEntity, entity);
      saved.folder = folders.find((f) => f.id === folderId) || null;

      await this.recordAudit(qr.manager, {
        tenantId,
        actorId: userId,
        entityType: 'DOCUMENT_FILE',
        entityId: saved.id,
        action: opts?.replaceFileGroupId ? 'NEW_VERSION' : 'UPLOAD',
        payloadAfter: {
          fileGroupId,
          fileName: saved.fileName,
          sizeBytes: Number(saved.sizeBytes),
          sha256,
          version: nextVersion,
          folderId,
          storageKey,
        },
      });

      return this.mapFileDto(saved, client.company?.legalName);
    });
  }

  async downloadFile(
    tenantId: string,
    userId: string,
    role: string,
    fileId: string,
    mode: 'download' | 'view' = 'download',
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const file = await qr.manager.findOne(DocumentFileOrmEntity, {
        where: { id: fileId, tenantId, isDeleted: false },
      });
      if (!file) {
        throw new NotFoundException(`Document file '${fileId}' not found.`);
      }
      await this.assertClientAccess(qr.manager, tenantId, file.clientId, userId, role);

      const stored = await this.storage.get(file.storageKey);

      await this.recordAudit(qr.manager, {
        tenantId,
        actorId: userId,
        entityType: 'DOCUMENT_FILE',
        entityId: file.id,
        action: mode === 'view' ? 'VIEW' : 'DOWNLOAD',
        payloadAfter: {
          fileGroupId: file.fileGroupId,
          fileName: file.fileName,
          version: file.version,
        },
      });

      return {
        body: stored.body,
        contentType: file.mimeType || stored.contentType,
        fileName: file.fileName,
        sha256: file.sha256,
      };
    });
  }

  async downloadByRequestId(tenantId: string, userId: string, role: string, requestId: string) {
    const file = await this.uow.executeInTransaction(async (qr) => {
      return await qr.manager.findOne(DocumentFileOrmEntity, {
        where: { tenantId, requestId, isLatest: true, isDeleted: false },
        order: { version: 'DESC' },
      });
    });
    if (!file) {
      throw new NotFoundException(`No uploaded file found for request '${requestId}'.`);
    }
    return this.downloadFile(tenantId, userId, role, file.id, 'download');
  }

  async listVersions(tenantId: string, fileId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const target = await qr.manager.findOne(DocumentFileOrmEntity, {
        where: { id: fileId, tenantId },
      });
      if (!target) throw new NotFoundException('File not found.');

      const versions = await qr.manager.find(DocumentFileOrmEntity, {
        where: { tenantId, fileGroupId: target.fileGroupId, isDeleted: false },
        relations: ['folder'],
        order: { version: 'DESC' },
      });
      return versions.map((v) => this.mapFileDto(v));
    });
  }

  async restoreVersion(tenantId: string, userId: string, fileId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const target = await qr.manager.findOne(DocumentFileOrmEntity, {
        where: { id: fileId, tenantId, isDeleted: false },
        relations: ['folder'],
      });
      if (!target) throw new NotFoundException('File version not found.');

      const currentLatest = await qr.manager.findOne(DocumentFileOrmEntity, {
        where: { tenantId, fileGroupId: target.fileGroupId, isLatest: true, isDeleted: false },
        order: { version: 'DESC' },
      });
      const nextVersion = (currentLatest?.version || target.version) + 1;

      if (currentLatest) {
        currentLatest.isLatest = false;
        await qr.manager.save(DocumentFileOrmEntity, currentLatest);
      }

      const stored = await this.storage.get(target.storageKey);
      const safeName = this.sanitizeFileName(target.fileName);
      const newKey = `tenant/${tenantId}/clients/${target.clientId}/vault/${crypto.randomUUID()}-${safeName}`;
      await this.storage.put(newKey, stored.body, target.mimeType, {
        tenantId,
        clientId: target.clientId,
        restoredFromVersion: String(target.version),
      });

      const actorName = await this.resolveActorName(qr.manager, userId);

      const restored = qr.manager.create(DocumentFileOrmEntity, {
        tenantId,
        clientId: target.clientId,
        folderId: target.folderId,
        requestId: target.requestId,
        fileGroupId: target.fileGroupId,
        storageKey: newKey,
        fileName: target.fileName,
        mimeType: target.mimeType,
        sizeBytes: target.sizeBytes,
        sha256: target.sha256,
        uploadedByUserId: userId,
        uploadedByName: actorName,
        version: nextVersion,
        isLatest: true,
        isDeleted: false,
      });

      const saved = await qr.manager.save(DocumentFileOrmEntity, restored);
      await this.recordAudit(qr.manager, {
        tenantId,
        actorId: userId,
        entityType: 'DOCUMENT_FILE',
        entityId: saved.id,
        action: 'RESTORE_VERSION',
        payloadAfter: {
          fileGroupId: saved.fileGroupId,
          restoredFromVersion: target.version,
          newVersion: nextVersion,
        },
      });

      return this.mapFileDto(saved);
    });
  }

  async updateFileMeta(
    tenantId: string,
    userId: string,
    fileId: string,
    updates: { fileName?: string; folderId?: string | null },
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const file = await qr.manager.findOne(DocumentFileOrmEntity, {
        where: { id: fileId, tenantId, isDeleted: false },
        relations: ['folder'],
      });
      if (!file) throw new NotFoundException('File not found.');

      const groupFiles = await qr.manager.find(DocumentFileOrmEntity, {
        where: { tenantId, fileGroupId: file.fileGroupId, isDeleted: false },
      });

      for (const f of groupFiles) {
        if (updates.fileName?.trim()) f.fileName = updates.fileName.trim().slice(0, 255);
        if (updates.folderId !== undefined) f.folderId = updates.folderId;
        await qr.manager.save(DocumentFileOrmEntity, f);
      }

      await this.recordAudit(qr.manager, {
        tenantId,
        actorId: userId,
        entityType: 'DOCUMENT_FILE',
        entityId: file.id,
        action: 'UPDATE',
        payloadAfter: updates as Record<string, unknown>,
      });

      const reloaded = await qr.manager.findOne(DocumentFileOrmEntity, {
        where: { id: fileId, tenantId },
        relations: ['folder'],
      });
      return this.mapFileDto(reloaded!);
    });
  }

  async getAuditTrail(tenantId: string, fileId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const file = await qr.manager.findOne(DocumentFileOrmEntity, {
        where: { id: fileId, tenantId },
      });
      if (!file) throw new NotFoundException('File not found.');

      const groupVersions = await qr.manager.find(DocumentFileOrmEntity, {
        where: { tenantId, fileGroupId: file.fileGroupId },
        select: ['id'],
      });
      const ids = groupVersions.map((v) => v.id);

      const logs = await qr.manager
        .createQueryBuilder(AuditLogOrmEntity, 'a')
        .where('a.tenant_id = :tenantId', { tenantId })
        .andWhere("a.entity_type = 'DOCUMENT_FILE'")
        .andWhere('a.entity_id IN (:...ids)', { ids })
        .orderBy('a.created_at', 'DESC')
        .getMany();

      const actorIds = Array.from(new Set(logs.map((l) => l.actorId).filter(Boolean))) as string[];
      const users =
        actorIds.length > 0
          ? await qr.manager
              .createQueryBuilder(UserOrmEntity, 'u')
              .where('u.id IN (:...actorIds)', { actorIds })
              .getMany()
          : [];
      const userMap = new Map(users.map((u) => [u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email]));

      return logs.map((l) => ({
        id: l.id,
        action: l.action,
        entityId: l.entityId,
        actorId: l.actorId,
        actorName: (l.actorId && userMap.get(l.actorId)) || 'System',
        details: l.payloadAfter,
        createdAt: l.createdAt.toISOString(),
      }));
    });
  }

  async softDeleteFile(tenantId: string, userId: string, fileId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const file = await qr.manager.findOne(DocumentFileOrmEntity, {
        where: { id: fileId, tenantId, isDeleted: false },
      });
      if (!file) throw new NotFoundException('File not found.');

      const groupFiles = await qr.manager.find(DocumentFileOrmEntity, {
        where: { tenantId, fileGroupId: file.fileGroupId, isDeleted: false },
      });

      const now = new Date();
      for (const f of groupFiles) {
        const deletedKey = f.storageKey.startsWith('deleted/') ? f.storageKey : `deleted/${f.storageKey}`;
        await this.storage.move(f.storageKey, deletedKey);
        f.storageKey = deletedKey;
        f.isDeleted = true;
        f.isLatest = false;
        f.deletedAt = now;
        await qr.manager.save(DocumentFileOrmEntity, f);
      }

      await this.recordAudit(qr.manager, {
        tenantId,
        actorId: userId,
        entityType: 'DOCUMENT_FILE',
        entityId: file.id,
        action: 'DELETE',
        payloadAfter: {
          fileGroupId: file.fileGroupId,
          fileName: file.fileName,
          movedToPrefix: 'deleted/',
        },
      });

      return { deleted: true, id: fileId };
    });
  }

  async autoPlaceAcceptedRequestFile(
    manager: EntityManager,
    tenantId: string,
    docReq: ClientDocumentRequestOrmEntity,
  ) {
    const folders = await this.ensureDefaultFoldersInTx(manager, tenantId, docReq.clientId);
    const targetFolderName = this.mapRequestTypeToFolderName(docReq.documentType);
    const targetFolder = folders.find((f) => f.name === targetFolderName) || folders[0];
    if (!targetFolder) return;

    const files = await manager.find(DocumentFileOrmEntity, {
      where: { tenantId, requestId: docReq.id, isDeleted: false },
    });
    for (const f of files) {
      if (!f.folderId || f.folderId !== targetFolder.id) {
        f.folderId = targetFolder.id;
        await manager.save(DocumentFileOrmEntity, f);
      }
    }
  }
}
