'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Clock,
  Calendar,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  FileText,
  CheckSquare,
  Lock,
  ArrowLeft,
  Mail,
  Smartphone,
  MessageSquare,
  CreditCard,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Input,
  Select,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { NotificationType } from '@platform/shared-types';

export default function NotificationSettingsPage() {
  const { activeCompanyId, activeCompany } = useCompany();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings State
  const [timezone, setTimezone] = useState<string>('Asia/Kolkata');
  const [dailyDispatchTime, setDailyDispatchTime] = useState<string>('09:30:00');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState<boolean>(true);
  const [quietHoursStart, setQuietHoursStart] = useState<string>('21:00:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState<string>('08:30:00');
  const [rules, setRules] = useState<any[]>([]);

  // Test Notification Dialog
  const [testChannel, setTestChannel] = useState<string>('IN_APP');

  useEffect(() => {
    loadSettings();
  }, [activeCompanyId]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

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
      console.error('Failed to load notification settings', err);
      showToast('error', 'Failed to load company notification settings');
    } finally {
      setLoading(false);
    }
  };

  const getRule = (eventType: string) => {
    return (
      rules.find((r) => r.eventType === eventType) || {
        eventType,
        isEnabled: true,
        triggerType: 'OFFSET_SCHEDULED',
        offsetsDays: [7, 3, 1],
        dispatchTime: '09:30:00',
        enableInApp: true,
        enableEmail: true,
        enableWhatsapp: false,
        enableSms: false,
        includePaymentLink: true,
      }
    );
  };

  const updateRuleField = (eventType: string, field: string, value: any) => {
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.eventType === eventType);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], [field]: value };
        return copy;
      }
      return [...prev, { eventType, [field]: value }];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        timezone,
        dailyDispatchTime,
        rules,
      };
      await apiClient.updateNotificationSettings(activeCompanyId, payload);
      showToast('success', 'Notification architecture and scheduling rules saved successfully!');
      loadSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    setTesting(true);
    try {
      const res = await apiClient.sendTestNotification(activeCompanyId, testChannel);
      showToast('success', res.message || `Test alert sent via ${testChannel}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Test alert failed';
      showToast('error', msg);
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
        `Scheduler scan finished: ${res.dispatchedAlerts} alerts dispatched (${res.skippedDuplicates} duplicate alerts skipped).`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Scan execution failed';
      showToast('error', msg);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/settings"
              className="text-xs font-medium text-muted hover:text-primary hover:text-primary-inverse transition flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> System Settings
            </Link>
            <span className="text-muted text-secondary">/</span>
            <span className="text-xs font-semibold text-brand-text text-brand">
              Notification & Reminder Architecture
            </span>
          </div>
          <h1 className="text-2xl font-black text-primary dark:text-white flex items-center gap-2.5">
            <Bell className="h-6 w-6 text-brand-text text-brand" />
            Notification Rules & Automated Scheduler
          </h1>
          <p className="text-xs text-muted text-muted mt-1">
            Configure multi-channel reminders, advance notice days, daily dispatch times, and statutory dunning triggers for {activeCompany?.legalName || activeCompany?.tradeName || 'Active Company'}.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunScan}
            disabled={scanning}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${scanning ? 'animate-spin' : ''}`} />
            Run Scheduler Scan
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSendTest}
            disabled={testing}
            className="text-xs"
          >
            <Send className="h-3.5 w-3.5 mr-1.5 text-brand-text" />
            Test Alert ({testChannel})
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs shadow-sm font-semibold"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Saving Rules...' : 'Save Notification Rules'}
          </Button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="alert"
          className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-medium shadow-md transition animate-in fade-in-50 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-status-success-subtle bg-status-success border-status-success border-status-success text-status-success-text text-status-success-text'
              : 'bg-status-danger-subtle bg-status-danger border-status-danger border-status-danger text-status-danger-text text-status-danger-text'
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

      {/* Global Dispatch & Delivery Window */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-text" />
                Global Delivery Window & Quiet Hours
              </CardTitle>
              <CardDescription>
                Define default timezones, master dispatch time, and anti-disturbance quiet periods.
              </CardDescription>
            </div>
            <Badge variant="neutral" size="sm">
              Tenant Master
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-secondary text-muted block mb-1.5">
                Standard Business Timezone
              </label>
              <Select
                size="sm"
                value={timezone}
                onValueChange={setTimezone}
                options={[
                  { label: 'Asia/Kolkata (IST - UTC+05:30)', value: 'Asia/Kolkata' },
                  { label: 'UTC (Universal Coordinated Time)', value: 'UTC' },
                  { label: 'America/New_York (EST/EDT)', value: 'America/New_York' },
                  { label: 'Europe/London (GMT/BST)', value: 'Europe/London' },
                  { label: 'Asia/Dubai (GST - UTC+04:00)', value: 'Asia/Dubai' },
                ]}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-secondary text-muted block mb-1.5">
                Daily Master Dispatch Time
              </label>
              <Input
                type="time"
                value={dailyDispatchTime}
                onChange={(e) => setDailyDispatchTime(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-secondary text-muted block mb-1.5">
                Test Alert Channel
              </label>
              <Select
                size="sm"
                value={testChannel}
                onValueChange={setTestChannel}
                options={[
                  { label: 'In-App Notification Bell', value: 'IN_APP' },
                  { label: 'Email (SMTP / SES)', value: 'EMAIL' },
                  { label: 'WhatsApp Business API', value: 'WHATSAPP' },
                  { label: 'SMS (DLT Registered)', value: 'SMS' },
                ]}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-subtle border-strong flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="quiet-hours-toggle"
                checked={quietHoursEnabled}
                onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                className="h-4 w-4 rounded text-brand-text focus:ring-focus-ring border"
              />
              <label htmlFor="quiet-hours-toggle" className="text-xs font-medium text-primary text-primary-inverse">
                Enable Nighttime Quiet Hours (Suppress external WhatsApp & SMS between{' '}
                <span className="font-semibold text-brand-text">{quietHoursStart}</span> and{' '}
                <span className="font-semibold text-brand-text">{quietHoursEnd}</span>)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 1: Invoices & Accounts Receivable Collections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-brand-subtle bg-brand/40 text-brand-text flex items-center justify-center font-bold">
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
        <CardContent className="space-y-6">
          {/* Rule 1: Upcoming Due Date */}
          {(() => {
            const rule = getRule(NotificationType.INVOICE_DUE_UPCOMING);
            return (
              <div className="p-4 rounded-xl border border border-strong bg-canvas bg-surface space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="inv-upcoming-enabled"
                      checked={rule.isEnabled}
                      onChange={(e) => updateRuleField(rule.eventType, 'isEnabled', e.target.checked)}
                      className="h-4 w-4 rounded text-brand-text"
                    />
                    <label htmlFor="inv-upcoming-enabled" className="text-xs font-bold text-primary dark:text-white">
                      Pre-Due Date Reminders (Upcoming Invoices)
                    </label>
                  </div>
                  <Badge variant={rule.isEnabled ? 'success' : 'neutral'} size="xs">
                    {rule.isEnabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Remind How Many Days Before Due Date
                    </label>
                    <Input
                      placeholder="e.g. 7, 3, 1"
                      value={rule.offsetsDays?.join(', ') || '7, 3, 1'}
                      onChange={(e) => {
                        const vals = e.target.value
                          .split(',')
                          .map((v) => parseInt(v.trim(), 10))
                          .filter((n) => !isNaN(n));
                        updateRuleField(rule.eventType, 'offsetsDays', vals);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-[10px] text-muted mt-0.5 block">Comma-separated days before (e.g. 7, 3, 1)</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Dispatch Time (HH:MM)
                    </label>
                    <Input
                      type="time"
                      value={rule.dispatchTime || '09:30:00'}
                      onChange={(e) => updateRuleField(rule.eventType, 'dispatchTime', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Active Delivery Channels
                    </label>
                    <div className="flex items-center gap-3 mt-1.5">
                      <label className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          checked={rule.enableInApp}
                          onChange={(e) => updateRuleField(rule.eventType, 'enableInApp', e.target.checked)}
                        />
                        In-App
                      </label>
                      <label className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          checked={rule.enableEmail}
                          onChange={(e) => updateRuleField(rule.eventType, 'enableEmail', e.target.checked)}
                        />
                        Email
                      </label>
                      <label className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          checked={rule.enableWhatsapp}
                          onChange={(e) => updateRuleField(rule.eventType, 'enableWhatsapp', e.target.checked)}
                        />
                        WhatsApp
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Rule 2: Due Date Alert (Due Today) */}
          {(() => {
            const rule = getRule(NotificationType.INVOICE_DUE_TODAY);
            return (
              <div className="p-4 rounded-xl border border border-strong bg-canvas bg-surface space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="inv-today-enabled"
                      checked={rule.isEnabled}
                      onChange={(e) => updateRuleField(rule.eventType, 'isEnabled', e.target.checked)}
                      className="h-4 w-4 rounded text-brand-text"
                    />
                    <label htmlFor="inv-today-enabled" className="text-xs font-bold text-primary dark:text-white">
                      Due Today Settlement Alert
                    </label>
                  </div>
                  <Badge variant={rule.isEnabled ? 'success' : 'neutral'} size="xs">
                    {rule.isEnabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Trigger Day
                    </label>
                    <div className="h-8 flex items-center text-xs font-medium text-secondary text-muted">
                      Day 0 (Exact Due Date)
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Dispatch Time (HH:MM)
                    </label>
                    <Input
                      type="time"
                      value={rule.dispatchTime || '10:00:00'}
                      onChange={(e) => updateRuleField(rule.eventType, 'dispatchTime', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Active Delivery Channels
                    </label>
                    <div className="flex items-center gap-3 mt-1.5">
                      <label className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          checked={rule.enableInApp}
                          onChange={(e) => updateRuleField(rule.eventType, 'enableInApp', e.target.checked)}
                        />
                        In-App
                      </label>
                      <label className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          checked={rule.enableEmail}
                          onChange={(e) => updateRuleField(rule.eventType, 'enableEmail', e.target.checked)}
                        />
                        Email
                      </label>
                      <label className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          checked={rule.enableWhatsapp}
                          onChange={(e) => updateRuleField(rule.eventType, 'enableWhatsapp', e.target.checked)}
                        />
                        WhatsApp
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Rule 3: Overdue Escalation (Dunning) */}
          {(() => {
            const rule = getRule(NotificationType.INVOICE_OVERDUE);
            return (
              <div className="p-4 rounded-xl border border-status-danger border-status-danger bg-status-danger-subtle bg-status-danger space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="inv-overdue-enabled"
                      checked={rule.isEnabled}
                      onChange={(e) => updateRuleField(rule.eventType, 'isEnabled', e.target.checked)}
                      className="h-4 w-4 rounded text-status-danger-text"
                    />
                    <label htmlFor="inv-overdue-enabled" className="text-xs font-bold text-status-danger-text text-status-danger-text">
                      Overdue Dunning Escalation Notices
                    </label>
                  </div>
                  <Badge variant={rule.isEnabled ? 'warning' : 'neutral'} size="xs">
                    {rule.isEnabled ? 'Escalating' : 'Disabled'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Remind at Days Overdue
                    </label>
                    <Input
                      placeholder="e.g. 3, 7, 15, 30"
                      value={rule.offsetsDays?.join(', ') || '3, 7, 15, 30'}
                      onChange={(e) => {
                        const vals = e.target.value
                          .split(',')
                          .map((v) => parseInt(v.trim(), 10))
                          .filter((n) => !isNaN(n));
                        updateRuleField(rule.eventType, 'offsetsDays', vals);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                    <span className="text-[10px] text-muted mt-0.5 block">Trigger on +3d, +7d, +15d, +30d overdue</span>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Dispatch Time (HH:MM)
                    </label>
                    <Input
                      type="time"
                      value={rule.dispatchTime || '11:00:00'}
                      onChange={(e) => updateRuleField(rule.eventType, 'dispatchTime', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Delivery Channels & Payment Link
                    </label>
                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1 text-[11px]">
                          <input
                            type="checkbox"
                            checked={rule.enableInApp}
                            onChange={(e) => updateRuleField(rule.eventType, 'enableInApp', e.target.checked)}
                          />
                          In-App
                        </label>
                        <label className="flex items-center gap-1 text-[11px]">
                          <input
                            type="checkbox"
                            checked={rule.enableEmail}
                            onChange={(e) => updateRuleField(rule.eventType, 'enableEmail', e.target.checked)}
                          />
                          Email
                        </label>
                        <label className="flex items-center gap-1 text-[11px]">
                          <input
                            type="checkbox"
                            checked={rule.enableWhatsapp}
                            onChange={(e) => updateRuleField(rule.eventType, 'enableWhatsapp', e.target.checked)}
                          />
                          WhatsApp
                        </label>
                      </div>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-text mt-0.5">
                        <input
                          type="checkbox"
                          checked={rule.includePaymentLink}
                          onChange={(e) => updateRuleField(rule.eventType, 'includePaymentLink', e.target.checked)}
                        />
                        Embed 1-Click UPI / Razorpay Payment Link
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* SECTION 2: Practice & Compliance Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-status-success-subtle bg-status-success text-status-success-text flex items-center justify-center font-bold">
                <CheckSquare className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">2. Practice & Compliance Tasks (Statutory Filings)</CardTitle>
                <CardDescription>
                  Alert CA partners and assigned staff before statutory GST, TDS, and Advance Tax deadlines.
                </CardDescription>
              </div>
            </div>
            <Badge variant="brand" size="sm">
              Practice Management
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upcoming Task */}
          {(() => {
            const rule = getRule(NotificationType.COMPLIANCE_TASK_UPCOMING);
            return (
              <div className="p-4 rounded-xl border border border-strong bg-canvas bg-surface space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="task-upcoming-enabled"
                      checked={rule.isEnabled}
                      onChange={(e) => updateRuleField(rule.eventType, 'isEnabled', e.target.checked)}
                      className="h-4 w-4 rounded text-brand-text"
                    />
                    <label htmlFor="task-upcoming-enabled" className="text-xs font-bold text-primary dark:text-white">
                      Task Deadline Approaching (Advance Notice)
                    </label>
                  </div>
                  <Badge variant={rule.isEnabled ? 'success' : 'neutral'} size="xs">
                    {rule.isEnabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Remind Days Before Filing Cutoff
                    </label>
                    <Input
                      placeholder="e.g. 5, 2, 1"
                      value={rule.offsetsDays?.join(', ') || '5, 2, 1'}
                      onChange={(e) => {
                        const vals = e.target.value
                          .split(',')
                          .map((v) => parseInt(v.trim(), 10))
                          .filter((n) => !isNaN(n));
                        updateRuleField(rule.eventType, 'offsetsDays', vals);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Dispatch Time (HH:MM)
                    </label>
                    <Input
                      type="time"
                      value={rule.dispatchTime || '09:00:00'}
                      onChange={(e) => updateRuleField(rule.eventType, 'dispatchTime', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Target Channels
                    </label>
                    <div className="flex items-center gap-3 mt-1.5">
                      <label className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          checked={rule.enableInApp}
                          onChange={(e) => updateRuleField(rule.eventType, 'enableInApp', e.target.checked)}
                        />
                        In-App
                      </label>
                      <label className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          checked={rule.enableEmail}
                          onChange={(e) => updateRuleField(rule.eventType, 'enableEmail', e.target.checked)}
                        />
                        Email
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* SECTION 3: Governance, Month-End Locks & High-Value Approvals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-status-warning-subtle bg-status-warning text-status-warning-text flex items-center justify-center font-bold">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">3. Governance & Period Locks</CardTitle>
                <CardDescription>
                  Notify accountants before monthly financial period lock and enforce maker-checker alerts.
                </CardDescription>
              </div>
            </div>
            <Badge variant="brand" size="sm">
              Audit & Governance
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const rule = getRule(NotificationType.PERIOD_LOCK_APPROACHING);
            return (
              <div className="p-4 rounded-xl border border border-strong bg-canvas bg-surface space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="period-lock-enabled"
                      checked={rule.isEnabled}
                      onChange={(e) => updateRuleField(rule.eventType, 'isEnabled', e.target.checked)}
                      className="h-4 w-4 rounded text-brand-text"
                    />
                    <label htmlFor="period-lock-enabled" className="text-xs font-bold text-primary dark:text-white">
                      Month-End Period Closing & Lock Approaching
                    </label>
                  </div>
                  <Badge variant={rule.isEnabled ? 'success' : 'neutral'} size="xs">
                    {rule.isEnabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Remind Days Before Closure
                    </label>
                    <Input
                      placeholder="e.g. 5, 2"
                      value={rule.offsetsDays?.join(', ') || '5, 2'}
                      onChange={(e) => {
                        const vals = e.target.value
                          .split(',')
                          .map((v) => parseInt(v.trim(), 10))
                          .filter((n) => !isNaN(n));
                        updateRuleField(rule.eventType, 'offsetsDays', vals);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Dispatch Time (HH:MM)
                    </label>
                    <Input
                      type="time"
                      value={rule.dispatchTime || '09:00:00'}
                      onChange={(e) => updateRuleField(rule.eventType, 'dispatchTime', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted text-muted block mb-1">
                      Target Channels
                    </label>
                    <div className="flex items-center gap-3 mt-1.5">
                      <label className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          checked={rule.enableInApp}
                          onChange={(e) => updateRuleField(rule.eventType, 'enableInApp', e.target.checked)}
                        />
                        In-App
                      </label>
                      <label className="flex items-center gap-1 text-[11px]">
                        <input
                          type="checkbox"
                          checked={rule.enableEmail}
                          onChange={(e) => updateRuleField(rule.eventType, 'enableEmail', e.target.checked)}
                        />
                        Email
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
