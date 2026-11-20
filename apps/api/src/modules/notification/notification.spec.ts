import { NotificationSettingsService, DEFAULT_NOTIFICATION_RULES } from './notification-settings.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationType } from '@platform/shared-types';

describe('Notification Engine Unit Tests', () => {
  describe('DEFAULT_NOTIFICATION_RULES', () => {
    it('should define statutory presets for invoices, compliance, and period locks', () => {
      const eventTypes = DEFAULT_NOTIFICATION_RULES.map((r) => r.eventType);
      expect(eventTypes).toContain(NotificationType.INVOICE_DUE_UPCOMING);
      expect(eventTypes).toContain(NotificationType.INVOICE_DUE_TODAY);
      expect(eventTypes).toContain(NotificationType.INVOICE_OVERDUE);
      expect(eventTypes).toContain(NotificationType.COMPLIANCE_TASK_UPCOMING);
      expect(eventTypes).toContain(NotificationType.COMPLIANCE_TASK_OVERDUE);
      expect(eventTypes).toContain(NotificationType.PERIOD_LOCK_APPROACHING);

      const upcomingInvoice = DEFAULT_NOTIFICATION_RULES.find(
        (r) => r.eventType === NotificationType.INVOICE_DUE_UPCOMING,
      );
      expect(upcomingInvoice?.offsetsDays).toEqual([7, 3, 1]);
      expect(upcomingInvoice?.dispatchTime).toBe('09:30:00');
      expect(upcomingInvoice?.enableWhatsapp).toBe(true);
    });
  });

  describe('NotificationSettingsService', () => {
    let mockUow: any;
    let mockManager: any;
    let service: NotificationSettingsService;

    beforeEach(() => {
      mockManager = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn((_, dto) => ({ ...dto, id: 'rule-001' })),
        save: jest.fn(async (_, entity) => entity),
      };
      mockUow = {
        executeInTransaction: jest.fn(async (cb) => cb({ manager: mockManager })),
      };
      service = new NotificationSettingsService(mockUow);
    });

    it('should seed default rules when no settings exist for company', async () => {
      mockManager.find.mockResolvedValueOnce([]).mockResolvedValueOnce(
        DEFAULT_NOTIFICATION_RULES.map((r, idx) => ({
          ...r,
          id: `rule-${idx}`,
          companyId: 'comp-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );

      const result = await service.getCompanySettings('tenant-1', 'comp-1');
      expect(result.companyId).toBe('comp-1');
      expect(result.rules.length).toBe(DEFAULT_NOTIFICATION_RULES.length);
      expect(mockManager.save).toHaveBeenCalledTimes(DEFAULT_NOTIFICATION_RULES.length);
    });

    it('should update company notification rules', async () => {
      mockManager.findOne.mockResolvedValue({
        id: 'rule-1',
        eventType: NotificationType.INVOICE_DUE_UPCOMING,
        offsetsDays: [7, 3, 1],
        dispatchTime: '09:30:00',
      });
      mockManager.find.mockResolvedValue([
        {
          id: 'rule-1',
          companyId: 'comp-1',
          eventType: NotificationType.INVOICE_DUE_UPCOMING,
          offsetsDays: [5, 2],
          dispatchTime: '10:00:00',
          timezone: 'Asia/Kolkata',
          isEnabled: true,
          triggerType: 'OFFSET_SCHEDULED',
          enableInApp: true,
          enableEmail: true,
          enableWhatsapp: true,
          enableSms: false,
          includePaymentLink: true,
        },
      ]);

      const updated = await service.updateCompanySettings('tenant-1', 'comp-1', {
        dailyDispatchTime: '10:00:00',
        rules: [
          {
            companyId: 'comp-1',
            eventType: NotificationType.INVOICE_DUE_UPCOMING,
            isEnabled: true,
            triggerType: 'OFFSET_SCHEDULED',
            offsetsDays: [5, 2],
            dispatchTime: '10:00:00',
            timezone: 'Asia/Kolkata',
            enableInApp: true,
            enableEmail: true,
            enableWhatsapp: true,
            enableSms: false,
            includePaymentLink: true,
          },
        ],
      });

      expect(updated.rules[0].offsetsDays).toEqual([5, 2]);
      expect(updated.rules[0].dispatchTime).toBe('10:00:00');
    });

    it('should create and log test notifications across channels', async () => {
      const testResult = await service.sendTestNotification('tenant-1', 'comp-1', 'user-1', 'WHATSAPP');
      expect(testResult.success).toBe(true);
      expect(testResult.message).toContain('WHATSAPP');
      expect(mockManager.save).toHaveBeenCalledTimes(2); // Notification + Dispatch Log
    });
  });

  describe('NotificationSchedulerService', () => {
    let mockUow: any;
    let mockManager: any;
    let scheduler: NotificationSchedulerService;

    beforeEach(() => {
      mockManager = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn((_, dto) => ({ ...dto, id: 'dispatch-001' })),
        save: jest.fn(async (_, entity) => entity),
      };
      mockUow = {
        executeInTransaction: jest.fn(async (cb) => cb({ manager: mockManager })),
      };
      scheduler = new NotificationSchedulerService(mockUow);
    });

    it('should scan upcoming invoices and dispatch alerts matching configured offsets', async () => {
      // 1. Settings
      mockManager.find.mockImplementation((entity: any) => {
        const name = entity.name || '';
        if (name === 'NotificationSettingOrmEntity') {
          return [
            {
              eventType: NotificationType.INVOICE_DUE_UPCOMING,
              isEnabled: true,
              offsetsDays: [3],
              enableInApp: true,
              enableEmail: true,
            },
          ];
        }
        if (name === 'UserOrmEntity') {
          return [{ id: 'user-admin' }];
        }
        if (name === 'InvoiceOrmEntity') {
          // Due in 3 days
          const dueDate = new Date('2026-11-20');
          return [
            {
              id: 'inv-123',
              invoiceNumber: 'INV-2026-001',
              dueDate: dueDate.toISOString().split('T')[0],
              totalAmount: 59000,
              party: { name: 'Acme Corp', email: 'billing@acme.com' },
            },
          ];
        }
        return [];
      });

      // No duplicate log exists
      mockManager.findOne.mockResolvedValue(null);

      const summary = await scheduler.scanAndDispatchScheduledNotifications(
        'tenant-1',
        'comp-1',
        '2026-11-17',
      );

      expect(summary.scannedInvoices).toBe(1);
      expect(summary.dispatchedAlerts).toBe(1);
      expect(summary.skippedDuplicates).toBe(0);
      expect(summary.details[0]).toContain('Invoice INV-2026-001');
    });

    it('should skip duplicate dispatch if alert already sent today for offset', async () => {
      mockManager.find.mockImplementation((entity: any) => {
        const name = entity.name || '';
        if (name === 'NotificationSettingOrmEntity') {
          return [
            {
              eventType: NotificationType.INVOICE_DUE_UPCOMING,
              isEnabled: true,
              offsetsDays: [3],
              enableInApp: true,
            },
          ];
        }
        if (name === 'UserOrmEntity') return [{ id: 'user-admin' }];
        if (name === 'InvoiceOrmEntity') {
          return [
            {
              id: 'inv-123',
              invoiceNumber: 'INV-2026-001',
              dueDate: '2026-11-20',
              totalAmount: 59000,
            },
          ];
        }
        return [];
      });

      // Existing log exists (already sent today)
      mockManager.findOne.mockResolvedValue({ id: 'existing-log-01' });

      const summary = await scheduler.scanAndDispatchScheduledNotifications(
        'tenant-1',
        'comp-1',
        '2026-11-17',
      );

      expect(summary.scannedInvoices).toBe(1);
      expect(summary.dispatchedAlerts).toBe(0);
      expect(summary.skippedDuplicates).toBe(1);
    });
  });
});
