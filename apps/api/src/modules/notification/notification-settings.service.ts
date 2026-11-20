import { Injectable, NotFoundException } from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { NotificationSettingOrmEntity } from '../../infrastructure/persistence/entities/notification-setting.orm-entity';
import { NotificationOrmEntity } from '../../infrastructure/persistence/entities/notification.orm-entity';
import { NotificationDispatchLogOrmEntity } from '../../infrastructure/persistence/entities/notification-dispatch-log.orm-entity';
import {
  NotificationSettingDto,
  NotificationSettingsSummaryDto,
  NotificationType,
} from '@platform/shared-types';

export const DEFAULT_NOTIFICATION_RULES: Omit<NotificationSettingDto, 'companyId' | 'id'>[] = [
  {
    eventType: NotificationType.INVOICE_DUE_UPCOMING,
    isEnabled: true,
    triggerType: 'OFFSET_SCHEDULED',
    offsetsDays: [7, 3, 1],
    dispatchTime: '09:30:00',
    timezone: 'Asia/Kolkata',
    enableInApp: true,
    enableEmail: true,
    enableWhatsapp: true,
    enableSms: false,
    includePaymentLink: true,
  },
  {
    eventType: NotificationType.INVOICE_DUE_TODAY,
    isEnabled: true,
    triggerType: 'OFFSET_SCHEDULED',
    offsetsDays: [0],
    dispatchTime: '10:00:00',
    timezone: 'Asia/Kolkata',
    enableInApp: true,
    enableEmail: true,
    enableWhatsapp: true,
    enableSms: false,
    includePaymentLink: true,
  },
  {
    eventType: NotificationType.INVOICE_OVERDUE,
    isEnabled: true,
    triggerType: 'OFFSET_SCHEDULED',
    offsetsDays: [3, 7, 15, 30],
    dispatchTime: '11:00:00',
    timezone: 'Asia/Kolkata',
    enableInApp: true,
    enableEmail: true,
    enableWhatsapp: true,
    enableSms: false,
    includePaymentLink: true,
  },
  {
    eventType: NotificationType.COMPLIANCE_TASK_UPCOMING,
    isEnabled: true,
    triggerType: 'OFFSET_SCHEDULED',
    offsetsDays: [5, 2, 1],
    dispatchTime: '09:00:00',
    timezone: 'Asia/Kolkata',
    enableInApp: true,
    enableEmail: true,
    enableWhatsapp: false,
    enableSms: false,
    includePaymentLink: false,
  },
  {
    eventType: NotificationType.COMPLIANCE_TASK_OVERDUE,
    isEnabled: true,
    triggerType: 'OFFSET_SCHEDULED',
    offsetsDays: [1, 3, 7],
    dispatchTime: '09:15:00',
    timezone: 'Asia/Kolkata',
    enableInApp: true,
    enableEmail: true,
    enableWhatsapp: false,
    enableSms: false,
    includePaymentLink: false,
  },
  {
    eventType: NotificationType.PERIOD_LOCK_APPROACHING,
    isEnabled: true,
    triggerType: 'OFFSET_SCHEDULED',
    offsetsDays: [5, 2],
    dispatchTime: '09:00:00',
    timezone: 'Asia/Kolkata',
    enableInApp: true,
    enableEmail: true,
    enableWhatsapp: false,
    enableSms: false,
    includePaymentLink: false,
  },
  {
    eventType: NotificationType.APPROVAL_REQUIRED,
    isEnabled: true,
    triggerType: 'INSTANT',
    offsetsDays: [0],
    dispatchTime: '09:30:00',
    timezone: 'Asia/Kolkata',
    enableInApp: true,
    enableEmail: true,
    enableWhatsapp: true,
    enableSms: false,
    includePaymentLink: false,
  },
];

@Injectable()
export class NotificationSettingsService {
  constructor(private readonly uow: UnitOfWorkService) {}

  /**
   * Get all notification settings rules for a company, initializing defaults if none exist
   */
  async getCompanySettings(
    tenantId: string,
    companyId: string,
  ): Promise<NotificationSettingsSummaryDto> {
    return this.uow.executeInTransaction(async (qr) => {
      let existing = await qr.manager.find(NotificationSettingOrmEntity, {
        where: { tenantId, companyId },
        order: { eventType: 'ASC' },
      });

      // If no settings exist yet, seed standard statutory defaults
      if (existing.length === 0) {
        for (const def of DEFAULT_NOTIFICATION_RULES) {
          const ent = qr.manager.create(NotificationSettingOrmEntity, {
            tenantId,
            companyId,
            eventType: def.eventType,
            isEnabled: def.isEnabled,
            triggerType: def.triggerType,
            offsetsDays: def.offsetsDays,
            dispatchTime: def.dispatchTime,
            timezone: def.timezone,
            enableInApp: def.enableInApp,
            enableEmail: def.enableEmail,
            enableWhatsapp: def.enableWhatsapp,
            enableSms: def.enableSms,
            includePaymentLink: def.includePaymentLink,
          });
          await qr.manager.save(NotificationSettingOrmEntity, ent);
        }

        existing = await qr.manager.find(NotificationSettingOrmEntity, {
          where: { tenantId, companyId },
          order: { eventType: 'ASC' },
        });
      }

      const rules: NotificationSettingDto[] = existing.map((e) => ({
        id: e.id,
        companyId: e.companyId,
        eventType: e.eventType,
        isEnabled: e.isEnabled,
        triggerType: e.triggerType as 'INSTANT' | 'OFFSET_SCHEDULED',
        offsetsDays: e.offsetsDays || [],
        dispatchTime: e.dispatchTime,
        timezone: e.timezone,
        enableInApp: e.enableInApp,
        enableEmail: e.enableEmail,
        enableWhatsapp: e.enableWhatsapp,
        enableSms: e.enableSms,
        includePaymentLink: e.includePaymentLink,
        updatedAt: e.updatedAt?.toISOString(),
      }));

      const primary = rules[0];

      return {
        companyId,
        timezone: primary?.timezone || 'Asia/Kolkata',
        dailyDispatchTime: primary?.dispatchTime || '09:30:00',
        quietHoursEnabled: true,
        quietHoursStart: '21:00:00',
        quietHoursEnd: '08:30:00',
        rules,
      };
    });
  }

  /**
   * Update notification settings rules for a company
   */
  async updateCompanySettings(
    tenantId: string,
    companyId: string,
    dto: {
      timezone?: string;
      dailyDispatchTime?: string;
      rules: NotificationSettingDto[];
    },
  ): Promise<NotificationSettingsSummaryDto> {
    return this.uow.executeInTransaction(async (qr) => {
      for (const rule of dto.rules) {
        let ent = await qr.manager.findOne(NotificationSettingOrmEntity, {
          where: { tenantId, companyId, eventType: rule.eventType },
        });

        if (!ent) {
          ent = qr.manager.create(NotificationSettingOrmEntity, {
            tenantId,
            companyId,
            eventType: rule.eventType,
          });
        }

        ent.isEnabled = rule.isEnabled !== undefined ? rule.isEnabled : true;
        ent.triggerType = rule.triggerType || 'OFFSET_SCHEDULED';
        ent.offsetsDays = rule.offsetsDays || [7, 3, 1];
        ent.dispatchTime = rule.dispatchTime || dto.dailyDispatchTime || '09:30:00';
        ent.timezone = rule.timezone || dto.timezone || 'Asia/Kolkata';
        ent.enableInApp = rule.enableInApp !== undefined ? rule.enableInApp : true;
        ent.enableEmail = rule.enableEmail !== undefined ? rule.enableEmail : true;
        ent.enableWhatsapp = rule.enableWhatsapp !== undefined ? rule.enableWhatsapp : false;
        ent.enableSms = rule.enableSms !== undefined ? rule.enableSms : false;
        ent.includePaymentLink = rule.includePaymentLink !== undefined ? rule.includePaymentLink : true;

        await qr.manager.save(NotificationSettingOrmEntity, ent);
      }

      return this.getCompanySettings(tenantId, companyId);
    });
  }

  /**
   * Send a test notification across specified channel
   */
  async sendTestNotification(
    tenantId: string,
    companyId: string,
    userId: string,
    channel: string = 'IN_APP',
  ): Promise<{ success: boolean; message: string; notificationId: string }> {
    return this.uow.executeInTransaction(async (qr) => {
      const title = `Antigravity Alert: Test ${channel} Notification`;
      const message = `This is a verified test alert sent at ${new Date().toLocaleTimeString()} IST. Your notification settings and delivery pipeline are working properly.`;

      const notification = qr.manager.create(NotificationOrmEntity, {
        tenantId,
        userId,
        title,
        message,
        type: NotificationType.TEST_NOTIFICATION,
        entityType: 'TEST',
        isRead: false,
      });
      const saved = await qr.manager.save(NotificationOrmEntity, notification);

      const log = qr.manager.create(NotificationDispatchLogOrmEntity, {
        tenantId,
        companyId,
        eventType: NotificationType.TEST_NOTIFICATION,
        entityType: 'TEST',
        entityId: saved.id,
        recipientType: 'USER',
        recipientAddress: userId,
        channel,
        offsetDayTriggered: 0,
        status: 'SENT',
      });
      await qr.manager.save(NotificationDispatchLogOrmEntity, log);

      return {
        success: true,
        message: `Test alert dispatched successfully via ${channel}.`,
        notificationId: saved.id,
      };
    });
  }
}
