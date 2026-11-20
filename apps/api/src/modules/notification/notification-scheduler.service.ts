import { Injectable, Logger } from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { NotificationSettingOrmEntity } from '../../infrastructure/persistence/entities/notification-setting.orm-entity';
import { NotificationOrmEntity } from '../../infrastructure/persistence/entities/notification.orm-entity';
import { NotificationDispatchLogOrmEntity } from '../../infrastructure/persistence/entities/notification-dispatch-log.orm-entity';
import { InvoiceOrmEntity } from '../../infrastructure/persistence/entities/invoice.orm-entity';
import { ComplianceTaskOrmEntity } from '../../infrastructure/persistence/entities/compliance-task.orm-entity';
import { AccountingPeriodOrmEntity } from '../../infrastructure/persistence/entities/accounting-period.orm-entity';
import { UserOrmEntity } from '../../infrastructure/persistence/entities/user.orm-entity';
import { NotificationType, InvoiceStatus, TaskStatus } from '@platform/shared-types';
import { In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

export interface DispatchSummary {
  scannedInvoices: number;
  scannedTasks: number;
  dispatchedAlerts: number;
  skippedDuplicates: number;
  details: string[];
}

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(private readonly uow: UnitOfWorkService) {}

  /**
   * Scan system records against notification rules and dispatch matching alerts
   */
  async scanAndDispatchScheduledNotifications(
    tenantId: string,
    companyId: string,
    simulatedDateStr?: string,
  ): Promise<DispatchSummary> {
    return this.uow.executeInTransaction(async (qr) => {
      const summary: DispatchSummary = {
        scannedInvoices: 0,
        scannedTasks: 0,
        dispatchedAlerts: 0,
        skippedDuplicates: 0,
        details: [],
      };

      const now = simulatedDateStr ? new Date(simulatedDateStr) : new Date();
      now.setHours(0, 0, 0, 0);

      // 1. Fetch active company notification settings
      const settings = await qr.manager.find(NotificationSettingOrmEntity, {
        where: { tenantId, companyId, isEnabled: true },
      });

      const settingsMap = new Map<string, NotificationSettingOrmEntity>();
      for (const s of settings) {
        settingsMap.set(s.eventType, s);
      }

      // Default user to notify (Admin or primary company user)
      const users = await qr.manager.find(UserOrmEntity, {
        where: { tenantId },
        take: 1,
      });
      const defaultUserId = users[0]?.id;
      if (!defaultUserId) {
        summary.details.push('No users found to notify.');
        return summary;
      }

      // 2. Scan Invoices for Pre-Due, Due Today, and Overdue Dunning
      const openInvoices = await qr.manager.find(InvoiceOrmEntity, {
        where: {
          tenantId,
          companyId,
          status: InvoiceStatus.ISSUED,
        },
        relations: ['party'],
      });
      summary.scannedInvoices = openInvoices.length;

      const upcomingRule = settingsMap.get(NotificationType.INVOICE_DUE_UPCOMING);
      const dueTodayRule = settingsMap.get(NotificationType.INVOICE_DUE_TODAY);
      const overdueRule = settingsMap.get(NotificationType.INVOICE_OVERDUE);

      for (const inv of openInvoices) {
        if (!inv.dueDate) continue;

        const due = new Date(inv.dueDate);
        due.setHours(0, 0, 0, 0);

        // Positive = due in future; Zero = due today; Negative = overdue
        const diffMs = due.getTime() - now.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        let matchedRule: NotificationSettingOrmEntity | undefined;
        let matchedOffset: number | null = null;
        let eventType: NotificationType | null = null;

        if (diffDays > 0 && upcomingRule?.offsetsDays?.includes(diffDays)) {
          matchedRule = upcomingRule;
          matchedOffset = diffDays;
          eventType = NotificationType.INVOICE_DUE_UPCOMING;
        } else if (diffDays === 0 && dueTodayRule?.offsetsDays?.includes(0)) {
          matchedRule = dueTodayRule;
          matchedOffset = 0;
          eventType = NotificationType.INVOICE_DUE_TODAY;
        } else if (diffDays < 0 && overdueRule) {
          const daysOverdue = Math.abs(diffDays);
          if (overdueRule.offsetsDays?.includes(daysOverdue)) {
            matchedRule = overdueRule;
            matchedOffset = daysOverdue;
            eventType = NotificationType.INVOICE_OVERDUE;
          }
        }

        if (matchedRule && eventType && matchedOffset !== null) {
          // Check Deduplication: has an alert been dispatched today for this invoice + offset?
          const existingLog = await qr.manager.findOne(NotificationDispatchLogOrmEntity, {
            where: {
              tenantId,
              companyId,
              entityId: inv.id,
              eventType,
              offsetDayTriggered: matchedOffset,
              dispatchedAt: MoreThanOrEqual(now),
            },
          });

          if (existingLog) {
            summary.skippedDuplicates++;
            continue;
          }

          const partyName = inv.party?.name || 'Customer';
          const formattedAmount = `₹${Number(inv.totalAmount || 0).toLocaleString('en-IN')}`;
          let title = '';
          let msg = '';

          if (eventType === NotificationType.INVOICE_DUE_UPCOMING) {
            title = `Invoice #${inv.invoiceNumber} due in ${matchedOffset} days`;
            msg = `Invoice #${inv.invoiceNumber} for ${partyName} (${formattedAmount}) is due on ${inv.dueDate}. Automated pre-due notice prepared.`;
          } else if (eventType === NotificationType.INVOICE_DUE_TODAY) {
            title = `Invoice #${inv.invoiceNumber} is due TODAY`;
            msg = `Invoice #${inv.invoiceNumber} for ${partyName} (${formattedAmount}) is due today. Settlement reminders queued.`;
          } else {
            title = `URGENT: Invoice #${inv.invoiceNumber} is ${matchedOffset} days OVERDUE`;
            msg = `Invoice #${inv.invoiceNumber} for ${partyName} (${formattedAmount}) is ${matchedOffset} days overdue. Escalation dunning notice triggered.`;
          }

          // 1. Create In-App Notification if enabled
          if (matchedRule.enableInApp) {
            const notif = qr.manager.create(NotificationOrmEntity, {
              tenantId,
              userId: defaultUserId,
              title,
              message: msg,
              type: eventType,
              entityType: 'INVOICE',
              entityId: inv.id,
              isRead: false,
            });
            await qr.manager.save(NotificationOrmEntity, notif);
          }

          // 2. Record dispatch logs for each enabled channel
          const channels = [];
          if (matchedRule.enableInApp) channels.push('IN_APP');
          if (matchedRule.enableEmail) channels.push('EMAIL');
          if (matchedRule.enableWhatsapp) channels.push('WHATSAPP');
          if (matchedRule.enableSms) channels.push('SMS');

          for (const ch of channels) {
            const log = qr.manager.create(NotificationDispatchLogOrmEntity, {
              tenantId,
              companyId,
              eventType,
              entityType: 'INVOICE',
              entityId: inv.id,
              recipientType: 'PARTY',
              recipientAddress: inv.party?.email || inv.party?.phone || defaultUserId,
              channel: ch,
              offsetDayTriggered: matchedOffset,
              status: 'SENT',
            });
            await qr.manager.save(NotificationDispatchLogOrmEntity, log);
          }

          summary.dispatchedAlerts++;
          summary.details.push(`Dispatched ${eventType} for Invoice ${inv.invoiceNumber} (Offset: ${matchedOffset}d)`);
        }
      }

      // 3. Scan Compliance Tasks for Deadlines
      const pendingTasks = await qr.manager.find(ComplianceTaskOrmEntity, {
        where: {
          tenantId,
          status: In([TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS]),
        },
      });
      summary.scannedTasks = pendingTasks.length;

      const taskUpcomingRule = settingsMap.get(NotificationType.COMPLIANCE_TASK_UPCOMING);
      const taskOverdueRule = settingsMap.get(NotificationType.COMPLIANCE_TASK_OVERDUE);

      for (const task of pendingTasks) {
        if (!task.dueDate) continue;

        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);

        const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let matchedRule: NotificationSettingOrmEntity | undefined;
        let matchedOffset: number | null = null;
        let eventType: NotificationType | null = null;

        if (diffDays > 0 && taskUpcomingRule?.offsetsDays?.includes(diffDays)) {
          matchedRule = taskUpcomingRule;
          matchedOffset = diffDays;
          eventType = NotificationType.COMPLIANCE_TASK_UPCOMING;
        } else if (diffDays < 0 && taskOverdueRule) {
          const overdueDays = Math.abs(diffDays);
          if (taskOverdueRule.offsetsDays?.includes(overdueDays)) {
            matchedRule = taskOverdueRule;
            matchedOffset = overdueDays;
            eventType = NotificationType.COMPLIANCE_TASK_OVERDUE;
          }
        }

        if (matchedRule && eventType && matchedOffset !== null) {
          const existingLog = await qr.manager.findOne(NotificationDispatchLogOrmEntity, {
            where: {
              tenantId,
              companyId,
              entityId: task.id,
              eventType,
              offsetDayTriggered: matchedOffset,
              dispatchedAt: MoreThanOrEqual(now),
            },
          });

          if (existingLog) {
            summary.skippedDuplicates++;
            continue;
          }

          const targetUser = task.assignedToUserId || defaultUserId;
          const title =
            eventType === NotificationType.COMPLIANCE_TASK_UPCOMING
              ? `Compliance Task Due in ${matchedOffset} days: ${task.title}`
              : `OVERDUE TASK: ${task.title} (${matchedOffset} days late)`;

          const msg = `Task '${task.title}' is scheduled for completion on ${task.dueDate}. Priority review required.`;

          if (matchedRule.enableInApp) {
            const notif = qr.manager.create(NotificationOrmEntity, {
              tenantId,
              userId: targetUser,
              title,
              message: msg,
              type: eventType,
              entityType: 'COMPLIANCE_TASK',
              entityId: task.id,
              isRead: false,
            });
            await qr.manager.save(NotificationOrmEntity, notif);
          }

          const log = qr.manager.create(NotificationDispatchLogOrmEntity, {
            tenantId,
            companyId,
            eventType,
            entityType: 'COMPLIANCE_TASK',
            entityId: task.id,
            recipientType: 'USER',
            recipientAddress: targetUser,
            channel: 'IN_APP',
            offsetDayTriggered: matchedOffset,
            status: 'SENT',
          });
          await qr.manager.save(NotificationDispatchLogOrmEntity, log);

          summary.dispatchedAlerts++;
          summary.details.push(`Dispatched ${eventType} for Task '${task.title}' (Offset: ${matchedOffset}d)`);
        }
      }

      // 4. Scan Accounting Periods Approaching Lock Date
      const periodRule = settingsMap.get(NotificationType.PERIOD_LOCK_APPROACHING);
      if (periodRule) {
        const periods = await qr.manager.find(AccountingPeriodOrmEntity, {
          where: { tenantId, companyId, isLocked: false },
        });

        for (const p of periods) {
          if (!p.endDate) continue;
          const lock = new Date(p.endDate);
          lock.setHours(0, 0, 0, 0);
          const diffDays = Math.round((lock.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays > 0 && periodRule.offsetsDays?.includes(diffDays)) {
            const existingLog = await qr.manager.findOne(NotificationDispatchLogOrmEntity, {
              where: {
                tenantId,
                companyId,
                entityId: p.id,
                eventType: NotificationType.PERIOD_LOCK_APPROACHING,
                offsetDayTriggered: diffDays,
                dispatchedAt: MoreThanOrEqual(now),
              },
            });

            if (!existingLog) {
              const notif = qr.manager.create(NotificationOrmEntity, {
                tenantId,
                userId: defaultUserId,
                title: `Month-End Period Lock Approaching (${diffDays} days left)`,
                message: `Financial Period ${p.periodName || p.id} end date is ${p.endDate}. Complete all draft adjustments before closure.`,
                type: NotificationType.PERIOD_LOCK_APPROACHING,
                entityType: 'ACCOUNTING_PERIOD',
                entityId: p.id,
                isRead: false,
              });
              await qr.manager.save(NotificationOrmEntity, notif);

              const log = qr.manager.create(NotificationDispatchLogOrmEntity, {
                tenantId,
                companyId,
                eventType: NotificationType.PERIOD_LOCK_APPROACHING,
                entityType: 'ACCOUNTING_PERIOD',
                entityId: p.id,
                recipientType: 'USER',
                recipientAddress: defaultUserId,
                channel: 'IN_APP',
                offsetDayTriggered: diffDays,
                status: 'SENT',
              });
              await qr.manager.save(NotificationDispatchLogOrmEntity, log);

              summary.dispatchedAlerts++;
              summary.details.push(`Dispatched PERIOD_LOCK_APPROACHING for Period ${p.periodName} (${diffDays}d)`);
            }
          }
        }
      }

      return summary;
    });
  }
}
