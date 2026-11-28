'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button, Input, FormField } from '@platform/ui';
import { Plus, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { BackButton } from '@/components/back-button';

export default function EngagementTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState(
    '<h2>Engagement Letter</h2><p>Client: {{clientName}} (PAN: {{pan}})</p>{{serviceSchedule}}<p>Total: ₹{{totalFees}}</p>',
  );

  const loadData = async () => {
    const res = await apiClient.listEngagementTemplates();
    setTemplates(res || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await apiClient.upsertEngagementTemplate({ name: name.trim(), bodyTemplate });
    setName('');
    await loadData();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="space-y-2">
        <BackButton variant="link" fallbackUrl="/practice/settings" label="Back to settings" />
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FileText className="h-6 w-6 text-brand-primary" />
          Engagement Letter Templates
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure firm engagement letter templates with merge fields: {'{{clientName}}, {{pan}}, {{serviceSchedule}}, {{totalFees}}, {{startDate}}, {{partnerName}}'}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="text-sm font-semibold text-text-primary">Existing Templates</h2>
            {templates.map((t) => (
              <div key={t.id} className="p-3 rounded-xl bg-surface-sunken">
                <div className="text-sm font-semibold text-text-primary">{t.name}</div>
                <div className="text-xs text-text-muted mt-1">{t.description || 'Custom template'}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleSave} className="space-y-3">
              <h2 className="text-sm font-semibold text-text-primary">Create Template</h2>
              <FormField label="Template Name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tax Audit Engagement Letter" />
              </FormField>
              <FormField label="HTML Body Template">
                <textarea
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  rows={8}
                  className="w-full rounded-xl border border-default bg-surface p-3 text-xs font-mono text-text-primary"
                />
              </FormField>
              <Button type="submit" variant="primary" size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" /> Save Template
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
