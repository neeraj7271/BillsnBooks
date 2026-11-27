'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormField,
  Select,
} from '@platform/ui';
import { Plus, Edit3, Trash2, Sliders, X, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface StageConfig {
  key: string;
  label: string;
  order: number;
  assigneeRole: string;
  slaOffsetDays: number;
  requiresApproval: boolean;
}

export default function WorkflowsSettingsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    serviceTypeId: '',
    description: '',
    isRecurring: true,
    recurrenceFrequency: 'MONTHLY',
    defaultDueDay: '20',
  });
  const [stages, setStages] = useState<StageConfig[]>([
    { key: 'PLANNING', label: 'Planning', order: 1, assigneeRole: 'FIRM_PARTNER', slaOffsetDays: 5, requiresApproval: false },
    { key: 'FIELDWORK', label: 'Fieldwork', order: 2, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 7, requiresApproval: false },
    { key: 'PARTNER_REVIEW', label: 'Partner Review', order: 3, assigneeRole: 'FIRM_PARTNER', slaOffsetDays: 3, requiresApproval: true },
    { key: 'DONE', label: 'Completed', order: 4, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 0, requiresApproval: false },
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tpls, svcs] = await Promise.all([
        apiClient.listWorkflowTemplates(),
        apiClient.listPracticeServices(),
      ]);
      setTemplates(tpls || []);
      setServices(svcs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      serviceTypeId: services[0]?.id || '',
      description: '',
      isRecurring: true,
      recurrenceFrequency: 'MONTHLY',
      defaultDueDay: '20',
    });
    setStages([
      { key: 'PLANNING', label: 'Planning', order: 1, assigneeRole: 'FIRM_PARTNER', slaOffsetDays: 5, requiresApproval: false },
      { key: 'EXECUTION', label: 'Execution', order: 2, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 7, requiresApproval: false },
      { key: 'PARTNER_REVIEW', label: 'Partner Review', order: 3, assigneeRole: 'FIRM_PARTNER', slaOffsetDays: 3, requiresApproval: true },
      { key: 'DONE', label: 'Completed', order: 4, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 0, requiresApproval: false },
    ]);
    setDialogOpen(true);
  };

  const openEdit = (tpl: any) => {
    setEditingId(tpl.id);
    setForm({
      name: tpl.name || '',
      serviceTypeId: tpl.serviceTypeId || '',
      description: tpl.description || '',
      isRecurring: Boolean(tpl.isRecurring),
      recurrenceFrequency: tpl.recurrenceFrequency || 'MONTHLY',
      defaultDueDay: String(tpl.defaultDueDay ?? 20),
    });
    const rawStages = tpl.stageConfigs?.length
      ? tpl.stageConfigs
      : (tpl.stages || []).map((k: string, idx: number) => ({
          key: k,
          label: k.replace(/_/g, ' '),
          order: idx + 1,
          assigneeRole: 'STAFF_ACCOUNTANT',
          slaOffsetDays: 2,
          requiresApproval: k.includes('REVIEW'),
        }));
    setStages(rawStages);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        serviceTypeId: form.serviceTypeId || null,
        description: form.description.trim() || null,
        isRecurring: form.isRecurring,
        recurrenceFrequency: form.isRecurring ? form.recurrenceFrequency : null,
        defaultDueDay: Number(form.defaultDueDay) || 20,
        stageConfigs: stages.map((s, idx) => ({ ...s, order: idx + 1 })),
        stages: stages.map((s) => s.key),
      };
      if (editingId) {
        await apiClient.updateWorkflowTemplate(editingId, payload);
      } else {
        await apiClient.createWorkflowTemplate(payload);
      }
      setDialogOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await apiClient.deleteWorkflowTemplate(id);
    await loadData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Sliders className="h-6 w-6 text-brand-primary" />
            Workflow Templates &amp; Custom Statuses
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Customize Kanban stages, SLA offsets, assignee roles, and approval gates per workflow template.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Workflow Template
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-text-muted">Loading workflow templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => {
            const stageList: any[] = tpl.stageConfigs?.length
              ? tpl.stageConfigs
              : (tpl.stages || []).map((k: string) => ({ key: k, label: k.replace(/_/g, ' ') }));
            return (
              <Card key={tpl.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">{tpl.name}</h3>
                      <p className="text-xs text-text-secondary mt-0.5">{tpl.description || 'Custom firm workflow'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(tpl)}>
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(tpl.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-status-danger-text" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {stageList.map((st, idx) => (
                      <Badge key={`${st.key}-${idx}`} variant={st.requiresApproval ? 'warning' : 'neutral'}>
                        {idx + 1}. {st.label}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg">
          <form onSubmit={handleSave} className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Workflow Template' : 'Create Workflow Template'}</DialogTitle>
              <DialogDescription>
                Define custom Kanban stages and approval gates. Jobs created from this template render these columns.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Template Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Statutory Audit 6-Stage Flow"
                />
              </FormField>
              <FormField label="Linked Service (Optional)">
                <Select
                  value={form.serviceTypeId}
                  onValueChange={(v) => setForm({ ...form, serviceTypeId: v })}
                  options={[
                    { value: '', label: 'Any / Unlinked' },
                    ...services.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
              </FormField>
              <FormField label="Description" className="md:col-span-2">
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Workflow purpose and SLA summary..."
                />
              </FormField>
            </div>

            <div className="space-y-2 border-t border-default pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                  Custom Stages ({stages.length})
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setStages([
                      ...stages,
                      {
                        key: `STAGE_${stages.length + 1}`,
                        label: `Stage ${stages.length + 1}`,
                        order: stages.length + 1,
                        assigneeRole: 'STAFF_ACCOUNTANT',
                        slaOffsetDays: 2,
                        requiresApproval: false,
                      },
                    ])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Stage
                </Button>
              </div>
              <div className="space-y-2">
                {stages.map((st, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-4"
                      value={st.label}
                      onChange={(e) => {
                        const next = [...stages];
                        next[idx] = {
                          ...st,
                          label: e.target.value,
                          key: e.target.value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || st.key,
                        };
                        setStages(next);
                      }}
                    />
                    <div className="col-span-3">
                      <Select
                        value={st.assigneeRole}
                        onValueChange={(v) => {
                          const next = [...stages];
                          next[idx] = { ...st, assigneeRole: v };
                          setStages(next);
                        }}
                        options={[
                          { value: 'STAFF_ACCOUNTANT', label: 'Staff' },
                          { value: 'FIRM_PARTNER', label: 'Partner' },
                          { value: 'CLIENT_VIEWER', label: 'Client' },
                        ]}
                      />
                    </div>
                    <Input
                      className="col-span-2"
                      type="number"
                      value={String(st.slaOffsetDays)}
                      onChange={(e) => {
                        const next = [...stages];
                        next[idx] = { ...st, slaOffsetDays: Number(e.target.value) || 0 };
                        setStages(next);
                      }}
                      title="SLA Days"
                    />
                    <label className="col-span-2 flex items-center gap-1 text-xs text-text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={st.requiresApproval}
                        onChange={(e) => {
                          const next = [...stages];
                          next[idx] = { ...st, requiresApproval: e.target.checked };
                          setStages(next);
                        }}
                      />
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Appr.
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="col-span-1"
                      onClick={() => setStages(stages.filter((_, i) => i !== idx))}
                      disabled={stages.length <= 2}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving}>
                Save Workflow
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
