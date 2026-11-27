import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { PdfRenderService } from '../reports/pdf-render.service';
import { DocumentVaultService } from './document-vault.service';
import { PracticeV2Service } from './practice-v2.service';
import {
  PracticeProposalOrmEntity,
  PracticeProposalLineOrmEntity,
} from '../../infrastructure/persistence/entities/practice-proposal.orm-entity';
import {
  PracticeEngagementTemplateOrmEntity,
  PracticeEngagementOrmEntity,
} from '../../infrastructure/persistence/entities/practice-engagement.orm-entity';
import { FirmClientOrmEntity } from '../../infrastructure/persistence/entities/firm-client.orm-entity';
import { ServiceTypeOrmEntity } from '../../infrastructure/persistence/entities/service-type.orm-entity';
import { DocumentFolderOrmEntity } from '../../infrastructure/persistence/entities/document-folder.orm-entity';
import { AuditLogOrmEntity } from '../../infrastructure/persistence/entities/audit-log.orm-entity';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';
import { CompanyOrmEntity } from '../../infrastructure/persistence/entities/company.orm-entity';

const DEFAULT_ENGAGEMENT_BODY = `
<h2>Letter of Engagement — Professional Services</h2>
<p>Date: {{startDate}}</p>
<p>To,<br/><strong>{{clientName}}</strong><br/>PAN: {{pan}}</p>
<p>Dear Sir/Madam,</p>
<p>We are pleased to confirm our acceptance and understanding of the professional engagement to provide the statutory, compliance, and advisory services listed below.</p>
<h3>1. Scope of Services &amp; Fee Schedule</h3>
{{serviceSchedule}}
<p><strong>Total Estimated Annual / Engagement Value:</strong> ₹{{totalFees}} (plus applicable GST @ 18%)</p>
<h3>2. Responsibilities &amp; Confidentiality</h3>
<p>Our firm will perform the engagement in accordance with applicable ICAI standards and statutory timelines. All client credentials and records stored in the encrypted vault remain strictly confidential.</p>
<p>For <strong>{{firmName}}</strong><br/>{{partnerName}}</p>
`.trim();

@Injectable()
export class PracticeOnboardingService {
  constructor(
    private readonly uow: UnitOfWorkService,
    private readonly pdfRender: PdfRenderService,
    private readonly vaultService: DocumentVaultService,
    private readonly v2Service: PracticeV2Service,
  ) {}

  private hash(payload: unknown): string {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private escapeHtml(v: string): string {
    return String(v || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ==================== PROPOSALS ====================

  async listProposals(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const list = await qr.manager.find(PracticeProposalOrmEntity, {
        where: { tenantId },
        relations: ['client', 'client.company', 'lines'],
        order: { createdAt: 'DESC' },
      });
      return list.map((p) => ({
        ...p,
        totalValue: Number(p.totalValue),
        gstAmount: Number(p.gstAmount),
        clientName: p.client?.company?.legalName || p.prospectName || 'Prospect',
        lines: (p.lines || []).map((l) => ({
          ...l,
          feeAmount: Number(l.feeAmount),
          estimatedHours: Number(l.estimatedHours),
          hourlyRate: Number(l.hourlyRate),
          gstRate: Number(l.gstRate),
        })),
      }));
    });
  }

  async getProposal(tenantId: string, id: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const p = await qr.manager.findOne(PracticeProposalOrmEntity, {
        where: { id, tenantId },
        relations: ['client', 'client.company', 'lines'],
      });
      if (!p) throw new NotFoundException('Proposal not found');
      return {
        ...p,
        totalValue: Number(p.totalValue),
        gstAmount: Number(p.gstAmount),
        clientName: p.client?.company?.legalName || p.prospectName || 'Prospect',
        lines: (p.lines || []).map((l) => ({
          ...l,
          feeAmount: Number(l.feeAmount),
          estimatedHours: Number(l.estimatedHours),
          hourlyRate: Number(l.hourlyRate),
          gstRate: Number(l.gstRate),
        })),
      };
    });
  }

  async createProposal(
    tenantId: string,
    userId: string,
    dto: {
      clientId?: string | null;
      prospectName?: string | null;
      prospectEmail?: string | null;
      validUntil?: string;
      notes?: string | null;
      lines: Array<{
        serviceTypeId?: string | null;
        description: string;
        feeType: 'FIXED' | 'RECURRING' | 'HOURLY';
        feeAmount: number;
        recurrenceFrequency?: string | null;
        estimatedHours?: number;
        hourlyRate?: number;
        gstRate?: number;
      }>;
    },
  ) {
    if (!dto.clientId && !dto.prospectName?.trim()) {
      throw new BadRequestException('Select a client or enter a prospect name.');
    }
    if (!dto.lines?.length) {
      throw new BadRequestException('Add at least one service line to the proposal.');
    }

    return this.uow.executeInTransaction(async (qr) => {
      const validUntil =
        dto.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      let subtotal = 0;
      let gstTotal = 0;
      const computedLines: Partial<PracticeProposalLineOrmEntity>[] = dto.lines.map((l, idx) => {
        const lineAmt =
          l.feeType === 'HOURLY'
            ? Number(l.estimatedHours || 0) * Number(l.hourlyRate || 0)
            : Number(l.feeAmount || 0);
        const gstRate = l.gstRate ?? 18;
        subtotal += lineAmt;
        gstTotal += (lineAmt * gstRate) / 100;
        return {
          tenantId,
          serviceTypeId: l.serviceTypeId || null,
          description: l.description,
          feeType: l.feeType || 'RECURRING',
          feeAmount: lineAmt,
          recurrenceFrequency: l.recurrenceFrequency || null,
          estimatedHours: Number(l.estimatedHours || 0),
          hourlyRate: Number(l.hourlyRate || 0),
          gstRate,
          sortOrder: idx,
        };
      });

      const propRepo = qr.manager.getRepository(PracticeProposalOrmEntity);
      const lineRepo = qr.manager.getRepository(PracticeProposalLineOrmEntity);

      const saved = await propRepo.save(
        propRepo.create({
          tenantId,
          clientId: dto.clientId || null,
          prospectName: dto.prospectName?.trim() || null,
          prospectEmail: dto.prospectEmail?.trim() || null,
          status: 'DRAFT',
          validUntil,
          createdByUserId: userId,
          totalValue: Number(subtotal.toFixed(2)),
          gstAmount: Number(gstTotal.toFixed(2)),
          currency: 'INR',
          notes: dto.notes || null,
        }),
      );

      for (const line of computedLines) {
        await lineRepo.save(lineRepo.create({ ...line, proposalId: saved.id }));
      }

      return saved;
    });
  }

  async updateProposalStatus(
    tenantId: string,
    id: string,
    status: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED',
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PracticeProposalOrmEntity);
      const p = await repo.findOne({ where: { id, tenantId } });
      if (!p) throw new NotFoundException('Proposal not found');
      p.status = status;
      if (status === 'ACCEPTED') p.acceptedAt = new Date();
      return await repo.save(p);
    });
  }

  async generateProposalPdf(tenantId: string, userId: string, role: string, id: string) {
    const proposal = await this.getProposal(tenantId, id);
    const rowsHtml = (proposal.lines || [])
      .map(
        (l: any, idx: number) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${idx + 1}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;"><strong>${this.escapeHtml(l.description)}</strong><br/><span style="color:#64748b;font-size:11px;">${l.feeType}${l.recurrenceFrequency ? ` · ${l.recurrenceFrequency}` : ''}</span></td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">₹${Number(l.feeAmount).toLocaleString('en-IN')}</td>
          <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">${l.gstRate}%</td>
        </tr>`,
      )
      .join('');

    const grandTotal = Number(proposal.totalValue) + Number(proposal.gstAmount);
    const html = `
      <!doctype html>
      <html>
        <head><meta charset="utf-8" /><style>body{font-family:Inter,Arial,sans-serif;color:#0f172a;padding:8px;}</style></head>
        <body>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px;">
            <div>
              <h1 style="margin:0;font-size:22px;">Professional Services Proposal</h1>
              <p style="margin:4px 0 0;color:#475569;font-size:12px;">Prepared for <strong>${this.escapeHtml(proposal.clientName)}</strong></p>
            </div>
            <div style="text-align:right;font-size:12px;color:#475569;">
              <div>Status: <strong>${proposal.status}</strong></div>
              <div>Valid Until: <strong>${proposal.validUntil}</strong></div>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px;">
            <thead>
              <tr style="background:#f8fafc;text-align:left;">
                <th style="padding:8px;border-bottom:1px solid #cbd5e1;">#</th>
                <th style="padding:8px;border-bottom:1px solid #cbd5e1;">Service &amp; Billing Model</th>
                <th style="padding:8px;border-bottom:1px solid #cbd5e1;text-align:right;">Fee (INR)</th>
                <th style="padding:8px;border-bottom:1px solid #cbd5e1;text-align:right;">GST</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div style="margin-left:auto;width:260px;font-size:13px;">
            <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Subtotal:</span><span>₹${Number(proposal.totalValue).toLocaleString('en-IN')}</span></div>
            <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>GST (18%):</span><span>₹${Number(proposal.gstAmount).toLocaleString('en-IN')}</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid #0f172a;font-weight:700;font-size:15px;"><span>Total:</span><span>₹${grandTotal.toLocaleString('en-IN')}</span></div>
          </div>
          ${proposal.notes ? `<div style="margin-top:24px;padding:12px;background:#f8fafc;border-radius:6px;font-size:12px;"><strong>Notes:</strong><br/>${this.escapeHtml(proposal.notes)}</div>` : ''}
        </body>
      </html>
    `;

    const pdfBuffer = await this.pdfRender.renderHtmlToPdf(html, { reportTitle: 'Service Proposal' });

    if (proposal.clientId) {
      const savedFile = await this.vaultService.uploadToVault(
        tenantId,
        userId,
        role,
        proposal.clientId,
        {
          originalname: `Proposal-${proposal.id.slice(0, 8)}.pdf`,
          mimetype: 'application/pdf',
          buffer: pdfBuffer,
          size: pdfBuffer.length,
        } as Express.Multer.File,
      );
      await this.uow.executeInTransaction(async (qr) => {
        await qr.manager.update(
          PracticeProposalOrmEntity,
          { id: proposal.id, tenantId },
          { pdfFileId: savedFile.id },
        );
      });
    }

    return { pdfBuffer, fileName: `Proposal-${proposal.id.slice(0, 8)}.pdf` };
  }

  // ==================== ENGAGEMENT TEMPLATES & ENGAGEMENTS ====================

  async listEngagementTemplates(tenantId: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PracticeEngagementTemplateOrmEntity);
      const existing = await repo.find({ where: { tenantId }, order: { createdAt: 'ASC' } });
      if (existing.length > 0) return existing;

      const def = await repo.save(
        repo.create({
          tenantId,
          name: 'Standard ICAI Retainer Engagement Letter',
          description: 'Default engagement letter template with scope schedule and confidentiality clause.',
          bodyTemplate: DEFAULT_ENGAGEMENT_BODY,
          isDefault: true,
        }),
      );
      return [def];
    });
  }

  async upsertEngagementTemplate(
    tenantId: string,
    dto: { id?: string; name: string; description?: string; bodyTemplate: string; isDefault?: boolean },
  ) {
    return this.uow.executeInTransaction(async (qr) => {
      const repo = qr.manager.getRepository(PracticeEngagementTemplateOrmEntity);
      if (dto.id) {
        const tpl = await repo.findOne({ where: { id: dto.id, tenantId } });
        if (!tpl) throw new NotFoundException('Engagement template not found');
        tpl.name = dto.name;
        tpl.description = dto.description || null;
        tpl.bodyTemplate = dto.bodyTemplate;
        if (dto.isDefault !== undefined) tpl.isDefault = dto.isDefault;
        return await repo.save(tpl);
      }
      return await repo.save(
        repo.create({
          tenantId,
          name: dto.name,
          description: dto.description || null,
          bodyTemplate: dto.bodyTemplate,
          isDefault: dto.isDefault ?? false,
        }),
      );
    });
  }

  async listEngagements(tenantId: string, clientId?: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const where: any = { tenantId };
      if (clientId) where.clientId = clientId;
      const list = await qr.manager.find(PracticeEngagementOrmEntity, {
        where,
        relations: ['client', 'client.company'],
        order: { createdAt: 'DESC' },
      });
      return list.map((e) => ({
        ...e,
        clientName: e.client?.company?.legalName || 'Client',
      }));
    });
  }

  async getEngagement(tenantId: string, id: string) {
    return this.uow.executeInTransaction(async (qr) => {
      const e = await qr.manager.findOne(PracticeEngagementOrmEntity, {
        where: { id, tenantId },
        relations: ['client', 'client.company'],
      });
      if (!e) throw new NotFoundException('Engagement not found');
      return {
        ...e,
        clientName: e.client?.company?.legalName || 'Client',
      };
    });
  }

  async convertProposalToEngagement(
    tenantId: string,
    userId: string,
    role: string,
    proposalId: string,
    templateId?: string,
  ) {
    const proposal = await this.getProposal(tenantId, proposalId);
    if (!proposal.clientId) {
      throw new BadRequestException('Link proposal to a client before converting to an engagement.');
    }

    const templates = await this.listEngagementTemplates(tenantId);
    const tpl = (templateId ? templates.find((t) => t.id === templateId) : templates[0]) || templates[0];

    const created = await this.uow.executeInTransaction(async (qr) => {
      const client = await qr.manager.findOne(FirmClientOrmEntity, {
        where: { id: proposal.clientId!, tenantId },
        relations: ['company'],
      });
      if (!client) throw new NotFoundException('Client not found');

      const partner = await qr.manager.findOne(UserOrmEntity, { where: { id: userId } });
      const partnerName = partner
        ? `${partner.firstName || ''} ${partner.lastName || ''}`.trim() || partner.email
        : 'Managing Partner';

      const scheduleRows = (proposal.lines || [])
        .map(
          (l: any) =>
            `<tr><td style="padding:6px;border:1px solid #cbd5e1;">${this.escapeHtml(l.description)}</td><td style="padding:6px;border:1px solid #cbd5e1;">${l.feeType}</td><td style="padding:6px;border:1px solid #cbd5e1;text-align:right;">₹${Number(l.feeAmount).toLocaleString('en-IN')}</td></tr>`,
        )
        .join('');
      const scheduleHtml = `<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#f8fafc;"><th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Service</th><th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Billing</th><th style="padding:6px;border:1px solid #cbd5e1;text-align:right;">Fee</th></tr></thead><tbody>${scheduleRows}</tbody></table>`;

      const startDate = new Date().toISOString().slice(0, 10);
      const renderedBody = (tpl?.bodyTemplate || DEFAULT_ENGAGEMENT_BODY)
        .replace(/\{\{clientName\}\}/g, this.escapeHtml(client.company?.legalName || client.primaryContactName))
        .replace(/\{\{pan\}\}/g, this.escapeHtml(client.company?.panEncrypted || 'On File'))
        .replace(/\{\{serviceSchedule\}\}/g, scheduleHtml)
        .replace(/\{\{totalFees\}\}/g, Number(proposal.totalValue).toLocaleString('en-IN'))
        .replace(/\{\{startDate\}\}/g, startDate)
        .replace(/\{\{firmName\}\}/g, 'Antigravity Practice')
        .replace(/\{\{partnerName\}\}/g, this.escapeHtml(partnerName));

      const scopeOfServices = (proposal.lines || []).map((l: any) => ({
        serviceTypeId: l.serviceTypeId,
        description: l.description,
        feeType: l.feeType,
        feeAmount: l.feeAmount,
        recurrenceFrequency: l.recurrenceFrequency,
      }));

      const repo = qr.manager.getRepository(PracticeEngagementOrmEntity);
      const eng = await repo.save(
        repo.create({
          tenantId,
          clientId: client.id,
          proposalId: proposal.id,
          templateId: tpl?.id || null,
          title: `Engagement Letter — ${client.company?.legalName || client.clientCode}`,
          status: 'SENT',
          scopeOfServices,
          feeSchedule: scopeOfServices,
          letterBody: renderedBody,
          startDate,
        }),
      );

      // Mark proposal accepted if not yet
      await qr.manager.update(
        PracticeProposalOrmEntity,
        { id: proposal.id, tenantId },
        { status: 'ACCEPTED', acceptedAt: proposal.acceptedAt || new Date() },
      );

      return eng;
    });

    // Render Engagement Letter PDF and store in client's Agreements vault folder
    const pdfHtml = `<!doctype html><html><head><meta charset="utf-8" /><style>body{font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.5;}</style></head><body>${created.letterBody}</body></html>`;
    const pdfBuffer = await this.pdfRender.renderHtmlToPdf(pdfHtml, { reportTitle: 'Engagement Letter' });
    const docHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    const agreementsFolder = await this.uow.executeInTransaction(async (qr) => {
      const folders = await this.vaultService.ensureDefaultFoldersInTx(qr.manager, tenantId, created.clientId);
      return folders.find((f) => f.name === 'Agreements') || folders[0];
    });

    const vaultFile = await this.vaultService.uploadToVault(
      tenantId,
      userId,
      role,
      created.clientId,
      {
        originalname: `Engagement-${created.id.slice(0, 8)}.pdf`,
        mimetype: 'application/pdf',
        buffer: pdfBuffer,
        size: pdfBuffer.length,
      } as Express.Multer.File,
      { folderId: agreementsFolder?.id },
    );

    await this.uow.executeInTransaction(async (qr) => {
      await qr.manager.update(
        PracticeEngagementOrmEntity,
        { id: created.id, tenantId },
        { engagementLetterFileId: vaultFile.id, documentSha256: docHash },
      );
    });

    return await this.getEngagement(tenantId, created.id);
  }

  // ==================== E-SIGNATURE & AUTO-PROVISIONING ====================

  async clientSignEngagement(
    tenantId: string,
    userId: string,
    role: string,
    engagementId: string,
    dto: { signerName: string; signerEmail?: string; signatureDataUrl?: string; consentAccepted: boolean; ipAddress?: string },
  ) {
    if (!dto.consentAccepted) {
      throw new BadRequestException('Consent checkbox must be accepted to sign.');
    }
    if (!dto.signerName?.trim()) {
      throw new BadRequestException('Signer name is required.');
    }

    const eng = await this.getEngagement(tenantId, engagementId);
    let signatureFileId: string | null = eng.signatureFileId || null;

    if (dto.signatureDataUrl && dto.signatureDataUrl.startsWith('data:image/png;base64,')) {
      const base64 = dto.signatureDataUrl.replace(/^data:image\/png;base64,/, '');
      const imgBuf = Buffer.from(base64, 'base64');
      const sigFile = await this.vaultService.uploadToVault(
        tenantId,
        userId,
        role,
        eng.clientId,
        {
          originalname: `Signature-${eng.id.slice(0, 8)}.png`,
          mimetype: 'image/png',
          buffer: imgBuf,
          size: imgBuf.length,
        } as Express.Multer.File,
      );
      signatureFileId = sigFile.id;
    }

    const signedAt = new Date();
    const stampedHtml = `
      <!doctype html>
      <html>
        <head><meta charset="utf-8" /><style>body{font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.5;}</style></head>
        <body>
          ${eng.letterBody || ''}
          <div style="margin-top:32px;padding:14px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;font-size:12px;">
            <strong>Electronic Signature Certificate</strong><br/>
            Signed by: <strong>${this.escapeHtml(dto.signerName)}</strong> (${this.escapeHtml(dto.signerEmail || '')})<br/>
            Timestamp: ${signedAt.toISOString()} · IP: ${this.escapeHtml(dto.ipAddress || 'recorded')}<br/>
            Original Hash (SHA-256): <code>${eng.documentSha256 || 'verified'}</code>
          </div>
        </body>
      </html>
    `;
    const stampedPdf = await this.pdfRender.renderHtmlToPdf(stampedHtml, { reportTitle: 'Signed Engagement Letter' });
    const newSha = crypto.createHash('sha256').update(stampedPdf).digest('hex');

    const signedVaultFile = await this.vaultService.uploadToVault(
      tenantId,
      userId,
      role,
      eng.clientId,
      {
        originalname: `Signed-Engagement-${eng.id.slice(0, 8)}.pdf`,
        mimetype: 'application/pdf',
        buffer: stampedPdf,
        size: stampedPdf.length,
      } as Express.Multer.File,
    );

    await this.uow.executeInTransaction(async (qr) => {
      await qr.manager.update(
        PracticeEngagementOrmEntity,
        { id: eng.id, tenantId },
        {
          status: 'SIGNED',
          signatureFileId,
          engagementLetterFileId: signedVaultFile.id,
          signedByClientAt: signedAt,
          signedByClientName: dto.signerName.trim(),
          signedByClientEmail: dto.signerEmail || null,
          signedByClientIp: dto.ipAddress || '127.0.0.1',
          documentSha256: newSha,
        },
      );

      const auditRepo = qr.manager.getRepository(AuditLogOrmEntity);
      const payload = {
        engagementId: eng.id,
        clientId: eng.clientId,
        signerName: dto.signerName.trim(),
        signerEmail: dto.signerEmail,
        ip: dto.ipAddress || '127.0.0.1',
        documentSha256: newSha,
      };
      await auditRepo.save(
        auditRepo.create({
          tenantId,
          companyId: eng.client?.companyId || null,
          actorId: userId,
          entityType: 'PRACTICE_ENGAGEMENT',
          entityId: eng.id,
          action: 'ENGAGEMENT_CLIENT_SIGNED',
          payloadAfter: payload,
          recordHash: this.hash(payload),
        }),
      );
    });

    return await this.getEngagement(tenantId, eng.id);
  }

  async firmCountersignEngagement(tenantId: string, userId: string, engagementId: string) {
    const eng = await this.getEngagement(tenantId, engagementId);
    const now = new Date();

    await this.uow.executeInTransaction(async (qr) => {
      await qr.manager.update(
        PracticeEngagementOrmEntity,
        { id: eng.id, tenantId },
        {
          status: 'ACTIVE',
          signedByFirmAt: now,
          signedByFirmUserId: userId,
        },
      );

      const auditRepo = qr.manager.getRepository(AuditLogOrmEntity);
      const payload = { engagementId: eng.id, clientId: eng.clientId, countersignedAt: now.toISOString() };
      await auditRepo.save(
        auditRepo.create({
          tenantId,
          companyId: eng.client?.companyId || null,
          actorId: userId,
          entityType: 'PRACTICE_ENGAGEMENT',
          entityId: eng.id,
          action: 'ENGAGEMENT_ACTIVATED',
          payloadAfter: payload,
          recordHash: this.hash(payload),
        }),
      );
    });

    // Auto-create client_services from engagement scope & spawn first jobs
    const serviceItems = (eng.scopeOfServices || [])
      .filter((s: any) => s.serviceTypeId)
      .map((s: any) => ({
        serviceTypeId: s.serviceTypeId,
        startDate: eng.startDate,
        feeAmount: Number(s.feeAmount || 0),
        feeType: (s.feeType || 'recurring').toLowerCase(),
        isActive: true,
      }));

    if (serviceItems.length > 0) {
      await this.v2Service.subscribeClientServices(tenantId, eng.clientId, serviceItems);
    }
    const spawnRes = await this.v2Service.spawnDueJobsFromClientServices(tenantId);

    return {
      engagement: await this.getEngagement(tenantId, eng.id),
      servicesCreated: serviceItems.length,
      jobsSpawned: spawnRes.spawnedCount,
    };
  }
}
