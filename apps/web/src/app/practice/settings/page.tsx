'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, Button, Badge } from '@platform/ui';
import { Settings, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { BackButton } from '@/components/back-button';

export default function PracticeSettingsHubPage() {
  const [settings, setSettings] = useState<any>({ reviewMode: 'ENFORCED', colleagueCount: 1, suggestedMode: 'ENFORCED' });
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const loadData = async () => {
    const res = await apiClient.getReviewSettings();
    setSettings(res);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectMode = async (mode: 'OFF' | 'SELF_SIGNOFF' | 'ENFORCED') => {
    setSaving(true);
    try {
      await apiClient.setReviewMode(mode);
      setSavedMsg(`Review gate updated to ${mode}.`);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="space-y-2">
        <BackButton variant="link" fallbackUrl="/practice" label="Back to Practice" />
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Settings className="h-6 w-6 text-brand-primary" />
          Practice Settings &amp; Controls
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure maker-checker review enforcement, team roles, service catalog, and automation templates.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-primary" />
                Solo vs Team Review Gate
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Require a second person to review before filing. Currently {settings.colleagueCount} active colleague(s) in this firm.
              </p>
            </div>
            <Badge variant="brand">{settings.reviewMode}</Badge>
          </div>

          {savedMsg && (
            <div className="p-2.5 rounded-lg bg-status-success-subtle text-xs text-status-success-text flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> {savedMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                mode: 'ENFORCED' as const,
                title: 'Firm Mode (Enforced)',
                desc: 'Preparer cannot approve or file their own work. Reviewer / Partner sign-off required.',
              },
              {
                mode: 'SELF_SIGNOFF' as const,
                title: 'Solo CA (Self Sign-Off)',
                desc: 'Single practitioner can prepare and self-confirm sign-off with full audit trail.',
              },
              {
                mode: 'OFF' as const,
                title: 'Review Gate Off',
                desc: 'Stages advance freely without blocking gates.',
              },
            ].map((opt) => (
              <button
                key={opt.mode}
                type="button"
                disabled={saving}
                onClick={() => handleSelectMode(opt.mode)}
                className={`text-left p-4 rounded-xl border transition ${
                  settings.reviewMode === opt.mode
                    ? 'border-brand bg-brand-subtle/30'
                    : 'border-default bg-surface-muted hover:border-brand'
                }`}
              >
                <div className="text-sm font-semibold text-text-primary">{opt.title}</div>
                <div className="text-xs text-text-secondary mt-1">{opt.desc}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        <Link href="/practice/team" className="p-4 rounded-xl border border-subtle bg-surface shadow-card hover:shadow-card-hover hover:border-brand transition-shadow font-semibold text-text-primary">Team &amp; Colleagues →</Link>
        <Link href="/practice/settings/roles" className="p-4 rounded-xl border border-subtle bg-surface shadow-card hover:shadow-card-hover hover:border-brand transition-shadow font-semibold text-text-primary">Permission &amp; Job Roles →</Link>
        <Link href="/practice/settings/services" className="p-4 rounded-xl border border-subtle bg-surface shadow-card hover:shadow-card-hover hover:border-brand transition-shadow font-semibold text-text-primary">Service Master →</Link>
        <Link href="/practice/settings/workflows" className="p-4 rounded-xl border border-subtle bg-surface shadow-card hover:shadow-card-hover hover:border-brand transition-shadow font-semibold text-text-primary">Workflow Templates →</Link>
        <Link href="/practice/settings/custom-fields" className="p-4 rounded-xl border border-subtle bg-surface shadow-card hover:shadow-card-hover hover:border-brand transition-shadow font-semibold text-text-primary">Custom Fields →</Link>
        <Link href="/practice/settings/engagement-templates" className="p-4 rounded-xl border border-subtle bg-surface shadow-card hover:shadow-card-hover hover:border-brand transition-shadow font-semibold text-text-primary">Engagement Letter Templates →</Link>
        <Link href="/practice/settings/templates" className="p-4 rounded-xl border border-subtle bg-surface shadow-card hover:shadow-card-hover hover:border-brand transition-shadow font-semibold text-text-primary">Reminder Rules →</Link>
      </div>
    </div>
  );
}
