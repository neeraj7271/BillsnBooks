'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button, Badge, Input, FormField } from '@platform/ui';
import { Bell, Play, Plus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function ReminderRulesSettingsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [runResult, setRunResult] = useState<any | null>(null);

  const [ruleName, setRuleName] = useState('');
  const [eventType, setEventType] = useState('DUE_DATE');
  const [daysBefore, setDaysBefore] = useState('3');

  const loadData = async () => {
    const [t, r] = await Promise.all([
      apiClient.listReminderTemplates(),
      apiClient.listNotificationRules(),
    ]);
    setTemplates(t || []);
    setRules(r || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;
    await apiClient.upsertNotificationRule({
      name: ruleName.trim(),
      eventType,
      daysBefore: Number(daysBefore) || 3,
      recipients: ['ASSIGNEE', 'CLIENT'],
    });
    setRuleName('');
    await loadData();
  };

  const handleRunRules = async () => {
    const res = await apiClient.runNotificationRules();
    setRunResult(res);
    await loadData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Bell className="h-6 w-6 text-brand-primary" />
            Reminder Rules
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Configure automated due-date nudges, WhatsApp click-to-send templates, and in-app/email notification rules.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleRunRules}>
          <Play className="h-4 w-4 mr-1.5" /> Evaluate &amp; Dispatch Now
        </Button>
      </div>

      {runResult && (
        <div className="p-4 rounded-xl bg-status-success-subtle border border-subtle shadow-card text-xs space-y-2">
          <div className="font-semibold text-status-success-text">
            Evaluated {runResult.rulesEvaluated} rule(s) · Dispatched {runResult.notificationsDispatched} in-app notification(s) · SMTP: {runResult.smtpConfigured ? 'Configured' : 'Not set (in-app + WhatsApp link mode)'}
          </div>
          {(runResult.whatsappLinks || []).slice(0, 3).map((w: any, i: number) => (
            <div key={i} className="flex items-center justify-between bg-surface-sunken p-2 rounded-lg">
              <span className="truncate mr-3">{w.client}: {w.message}</span>
              <a href={w.link} target="_blank" rel="noreferrer" className="text-brand-text font-semibold underline shrink-0">
                Open WhatsApp
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Notification Rules</h2>
            <form onSubmit={handleCreateRule} className="space-y-3 border-b border-default pb-4">
              <FormField label="Rule Name" required>
                <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="e.g. 3 days before GST due date" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Event">
                  <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-text-primary">
                    <option value="DUE_DATE">Job Due Date</option>
                    <option value="NOTICE_RESPONSE">Notice Response Due</option>
                  </select>
                </FormField>
                <FormField label="Days Before">
                  <Input type="number" value={daysBefore} onChange={(e) => setDaysBefore(e.target.value)} />
                </FormField>
              </div>
              <Button type="submit" size="sm" variant="primary"><Plus className="h-3.5 w-3.5 mr-1" /> Add Rule</Button>
            </form>

            <div className="space-y-2">
              {rules.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-sunken">
                  <div>
                    <div className="text-xs font-semibold text-text-primary">{r.name}</div>
                    <div className="text-[11px] text-text-secondary">{r.eventType} · {r.daysBefore} day(s) before</div>
                  </div>
                  <Badge variant="success" size="xs">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Message Templates (Email / WhatsApp)</h2>
            {templates.map((t) => (
              <div key={t.id} className="p-3 rounded-xl bg-surface-sunken space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary">{t.name}</span>
                  <Badge variant="info" size="xs">{t.channel}</Badge>
                </div>
                <div className="text-[11px] text-text-secondary">{t.bodyTemplate}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
