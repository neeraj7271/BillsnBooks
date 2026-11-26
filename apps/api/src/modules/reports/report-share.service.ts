import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { ReportShareOrmEntity } from '../../infrastructure/persistence/entities/report-share.orm-entity';
import { CompanyOrmEntity } from '../../infrastructure/persistence/entities/company.orm-entity';
import {
  ReportShareRequestDto,
  ReportShareResponseDto,
} from '@platform/shared-types';
import * as crypto from 'crypto';

@Injectable()
export class ReportShareService {
  constructor(private readonly uow: UnitOfWorkService) {}

  /**
   * Create an expiring secure report share token and communication links
   */
  async createReportShare(
    tenantId: string,
    companyId: string,
    userId: string,
    dto: ReportShareRequestDto,
    baseUrl: string = 'http://localhost:3000',
  ): Promise<ReportShareResponseDto> {
    return this.uow.executeInTransaction(async (qr) => {
      const company = await qr.manager.findOne(CompanyOrmEntity, {
        where: { id: companyId },
      });
      const companyName = company?.legalName || 'Antigravity Enterprise';

      const token = `rpt_${crypto.randomBytes(16).toString('hex')}`;
      const days = dto.expiresInDays || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      const title = dto.reportTitle || dto.reportKey?.replace(/_/g, ' ') || 'Financial Report';
      const share = qr.manager.create(ReportShareOrmEntity, {
        tenantId,
        companyId,
        userId,
        reportKey: dto.reportKey,
        reportTitle: title,
        filters: dto.filters || {},
        format: dto.format || 'PDF',
        token,
        recipientEmail: dto.recipientEmail || null,
        recipientPhone: dto.recipientPhone || null,
        shareChannel: dto.recipientEmail ? 'EMAIL' : 'LINK',
        expiresAt,
        downloadCount: 0,
      });

      await qr.manager.save(ReportShareOrmEntity, share);

      const shareUrl = `${baseUrl}/reports/shared/${token}`;
      const whatsappShareText = encodeURIComponent(
        `Hello,\n\nPlease find the ${title} shared by ${companyName}.\n` +
          (dto.personalMessage ? `Note: "${dto.personalMessage}"\n` : '') +
          `\nSecure Download Link (Valid for ${days} days):\n${shareUrl}\n\nAntigravity Books & Financial Platform`,
      );
      const whatsappUrl = dto.recipientPhone
        ? `https://wa.me/${dto.recipientPhone}?text=${whatsappShareText}`
        : `https://wa.me/?text=${whatsappShareText}`;

      return {
        shareId: share.id,
        token: share.token,
        shareUrl,
        whatsappUrl,
        whatsappShareText,
        expiresAt: share.expiresAt.toISOString(),
        emailSent: Boolean(dto.recipientEmail),
      };
    });
  }

  /**
   * Resolve shared token and increment access count
   */
  async resolveSharedReport(token: string): Promise<ReportShareOrmEntity> {
    return this.uow.executeInTransaction(async (qr) => {
      const rows = await qr.query(
        `SELECT id, tenant_id AS "tenantId", expires_at AS "expiresAt" FROM resolve_shared_report_by_token($1)`,
        [token],
      );
      const found = rows?.[0];
      if (!found) {
        throw new NotFoundException('Shared report link does not exist or has been revoked.');
      }

      if (new Date() > new Date(found.expiresAt)) {
        throw new GoneException('This report link has expired. Please request an updated share link from your accountant.');
      }

      await qr.query(`SELECT set_config('app.tenant_id', $1, true)`, [found.tenantId]);
      const share = await qr.manager.findOne(ReportShareOrmEntity, {
        where: { id: found.id },
      });
      if (!share) {
        throw new NotFoundException('Shared report link does not exist or has been revoked.');
      }

      share.downloadCount++;
      await qr.manager.save(ReportShareOrmEntity, share);

      return share;
    });
  }
}
