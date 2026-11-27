'use client';
import { logger } from '@/lib/logger';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  CheckSquare,
  Lock,
  ArrowLeft,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  FormPage,
  LoadingState,
  toast,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { NotificationType } from '@platform/shared-types';
import { NotificationRuleCard, type NotificationRuleData } from './notification-rule-card';
import { NotificationDeliveryCard } from './notification-delivery-card';

export default function NotificationSettingsPage() {
  const { activeCompanyId, activeCompany } = useCompany();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Global Tenant Notification Settings
  const [timezone, setTimezone] = useState<string>('Asia/Kolkata');
  const [dailyDispatchTime, setDailyDispatchTime] = useState<string>('09:30:00');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState<boolean>(true);
  const [quietHoursStart, setQuietHoursStart] = useState<string>('21:00:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState<string>('08:30:00');
  const [testChannel, setTestChannel] = useState<string>('IN_APP');

  // Rules Array
  const [rules, setRules] = useState<NotificationRuleData[]>([]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    if (type === 'success') {
      toast.success(text);
    } else {
      toast.error(text);
    }
    setTimeout(() => setToastMessage(null), 5000);
  };

  useEffect(() => {
    loadSettings();
  }, [activeCompanyId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getNotificationSettings(activeCompanyId);
      if (data) {
        setTimezone(data.timezone || 'Asia/Kolkata');
        setDailyDispatchTime(data.dailyDispatchTime || '09:30:00');
        setQuietHoursEnabled(data.quietHoursEnabled ?? true);
        setQuietHoursStart(data.quietHoursStart || '21:00:00');
        setQuietHoursEnd(data.quietHoursEnd || '08:30:00');
        setRules(data.rules || []);
      }
    } catch (err: unknown) {
      logger.error('Failed to load notification settings', err);
      showToast('error', 'Failed to load company notification settings');
    } finally {
      setLoading(false);
    }
  };

  const getRule = (eventType: string): NotificationRuleData => {
    const found = rules.find((r) => r.eventType === eventType);
    if (found) return found;

    return {
      eventType,
      isEnabled: true,
      enableInApp: true,
      enableEmail: true,
      enableWhatsapp: false,
      offsetsDays:
        eventType === NotificationType.INVOICE_DUE_UPCOMING
          ? [7, 3, 1]
          : eventType === NotificationType.INVOICE_OVERDUE
          ? [1, 7, 15, 30]
          : [0],
      dispatchTime: '09:30:00',
    };
  };

  const updateRuleField = (eventType: string, field: string, val: any) => {
    setRules((prev) => {
      const existingIdx = prev.findIndex((r) => r.eventType === eventType);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx]!, [field]: val };
        return copy;
      } else {
        const defaultRule = getRule(eventType);
        return [...prev, { ...defaultRule, [field]: val }];
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.updateNotificationSettings(activeCompanyId, {
        timezone,
        dailyDispatchTime,
        rules,
      });
      showToast('success', 'Notification architecture and scheduling rules saved successfully!');
      await loadSettings();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    try {
      const res = await apiClient.sendTestNotification(activeCompanyId, testChannel);
      showToast('success', res?.message || `Test alert sent via ${testChannel}`);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Test alert failed');
    } finally {
      setTesting(false);
    }
  };

  const handleRunScan = async () => {
    setScanning(true);
    try {
      const res = await apiClient.triggerNotificationScan(activeCompanyId);
      showToast(
        'success',
        `Scheduler scan finished: ${res?.dispatchedAlerts || 0} alerts dispatched (${res?.skippedDuplicates || 0} duplicate alerts skipped).`,
      );
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Scan execution failed');
    } finally {
      setScanning(false);
    }
  };

  return (
    <FormPage
      header={{
        title: 'Notification Rules & Automated Scheduler',
        subtitle: `Configure multi-channel reminders, advance notice days, and statutory dunning triggers for ${
          activeCompany?.legalName || activeCompany?.tradeName || 'Active Company'
        }.`,
        badge: <Badge variant="brand" size="sm">Automated Scheduler</Badge>,
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
            <Link href="/settings" className="hover:text-primary transition flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> System Settings
            </Link>
            <span>/</span>
            <span className="font-semibold text-brand-text">Notification Architecture</span>
          </div>
        ),
        actions: (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunScan}
              loading={scanning}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Run Scan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTest}
              loading={testing}
              leftIcon={<Send className="h-3.5 w-3.5 text-brand-text" />}
            >
              Test ({testChannel})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              loading={saving}
              leftIcon={<Save className="h-3.5 w-3.5" />}
            >
              Save Rules
            </Button>
          </div>
        ),
      }}
      footer={
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          loading={saving}
          leftIcon={<Save className="h-3.5 w-3.5" />}
        >
          Save Notification Architecture
        </Button>
      }
    >
      <div className="space-y-6">
        {toastMessage && (
          <div
            role="alert"
            className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-medium shadow-md transition animate-in fade-in-50 duration-200 ${
              toastMessage.type === 'success'
                ? 'bg-status-success-subtle border-default text-status-success-text'
                : 'bg-status-danger-subtle border-default text-status-danger-text'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-status-success-text shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-status-danger-text shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {loading ? (
          <LoadingState rows={8} />
        ) : (
          <>
            <NotificationDeliveryCard
              timezone={timezone}
              onTimezoneChange={setTimezone}
              dailyDispatchTime={dailyDispatchTime}
              onDailyDispatchTimeChange={setDailyDispatchTime}
              testChannel={testChannel}
              onTestChannelChange={setTestChannel}
              quietHoursEnabled={quietHoursEnabled}
              onQuietHoursEnabledChange={setQuietHoursEnabled}
              quietHoursStart={quietHoursStart}
              quietHoursEnd={quietHoursEnd}
              onShowToast={showToast}
            />

            {/* SECTION 1: Invoices & Accounts Receivable Collections */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-brand-subtle text-brand-text flex items-center justify-center font-bold">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">1. Invoices & AR Collections (Dunning Architecture)</CardTitle>
                      <CardDescription>
                        Automate payment reminders before due date, on due date, and escalating notices when overdue.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="brand" size="sm">
                    Statutory Dunning
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <NotificationRuleCard
                  rule={getRule(NotificationType.INVOICE_DUE_UPCOMING)}
                  title="Pre-Due Date Reminders (Upcoming Invoices)"
                  hasCustomOffset
                  offsetLabel="Remind Days Before Due Date"
                  offsetPlaceholder="7, 3, 1"
                  offsetHelper="Comma-separated days before (e.g. 7, 3, 1)"
                  onUpdateField={updateRuleField}
                />

                <NotificationRuleCard
                  rule={getRule(NotificationType.INVOICE_DUE_TODAY)}
                  title="Due Today Settlement Alert"
                  offsetLabel="Trigger Day"
                  fixedOffsetNote="Day 0 (Exact Due Date)"
                  onUpdateField={updateRuleField}
                />

                <NotificationRuleCard
                  rule={getRule(NotificationType.INVOICE_OVERDUE)}
                  title="Overdue Escalation Notices (Overdue AR Invoices)"
                  hasCustomOffset
                  offsetLabel="Escalation Schedule (Days After Due Date)"
                  offsetPlaceholder="1, 7, 15, 30"
                  offsetHelper="Intervals after due date to issue notices"
                  onUpdateField={updateRuleField}
                />
              </CardContent>
            </Card>

            {/* SECTION 2: Maker-Checker Financial Approvals */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-brand-subtle text-brand-text flex items-center justify-center font-bold">
                      <CheckSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">2. Maker-Checker Financial Approvals</CardTitle>
                      <CardDescription>
                        Internal segregation-of-duties notifications for dual-authorization vouchers and credit notes.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="brand" size="sm">
                    Dual Authorization
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <NotificationRuleCard
                  rule={getRule(NotificationType.APPROVAL_REQUIRED)}
                  title="Pending Authorization Queue Alert"
                  offsetLabel="Delivery Cadence"
                  fixedOffsetNote="Immediate on Submission"
                  onUpdateField={updateRuleField}
                />
              </CardContent>
            </Card>

            {/* SECTION 3: Banking Reconciliation & Settlement */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-brand-subtle text-brand-text flex items-center justify-center font-bold">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">3. Banking & Settlement Alerts</CardTitle>
                      <CardDescription>
                        Payment gateway webhook settlements, batch imports, and bank auto-reconciliation notices.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="neutral" size="sm">
                    Bank Reconcile
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <NotificationRuleCard
                  rule={getRule(NotificationType.PAYMENT_RECEIVED)}
                  title="Gateway Payout & Settlement Confirmation"
                  offsetLabel="Event Trigger"
                  fixedOffsetNote="Immediate upon Bank Webhook"
                  onUpdateField={updateRuleField}
                />
              </CardContent>
            </Card>

            {/* SECTION 4: Compliance & Statutory Deadlines */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-brand-subtle text-brand-text flex items-center justify-center font-bold">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">4. Statutory Compliance & Filing Deadlines</CardTitle>
                      <CardDescription>
                        Government deadlines for GST (11th & 20th), TDS (7th), and Advance Tax quarterly milestones.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="brand" size="sm">
                    Rule 46 & GSTN
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <NotificationRuleCard
                  rule={getRule(NotificationType.COMPLIANCE_TASK_UPCOMING)}
                  title="Statutory Due Date Calendar Notifications"
                  hasCustomOffset
                  offsetLabel="Advance Warning Days"
                  offsetPlaceholder="5, 2, 0"
                  offsetHelper="Days prior to statutory cut-off dates"
                  onUpdateField={updateRuleField}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </FormPage>
  );
}
