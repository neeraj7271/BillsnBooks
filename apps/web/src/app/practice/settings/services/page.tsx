'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Plus,
  Copy,
  Edit3,
  Trash2,
  Power,
  Search,
  Boxes,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { BackButton } from '@/components/back-button';

interface StageDraft {
  key: string;
  label: string;
  order: number;
  assigneeRole: string;
  slaOffsetDays: number;
  requiresApproval: boolean;
}

interface ChecklistDraft {
  id: string;
  title: string;
  stage: string;
}

const DEFAULT_STAGES: StageDraft[] = [
  { key: 'BACKLOG', label: 'Backlog / Docs Pending', order: 1, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 5, requiresApproval: false },
  { key: 'IN_PROGRESS', label: 'Preparation', order: 2, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 3, requiresApproval: false },
  { key: 'REVIEW', label: 'Partner Review', order: 3, assigneeRole: 'FIRM_PARTNER', slaOffsetDays: 2, requiresApproval: true },
  { key: 'FILED', label: 'Filed / Submitted', order: 4, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 1, requiresApproval: false },
  { key: 'DONE', label: 'Completed', order: 5, assigneeRole: 'STAFF_ACCOUNTANT', slaOffsetDays: 0, requiresApproval: false },
];

export default function ServiceMasterPage() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [showInactive, setShowInactive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    code: '',
    category: 'GST',
    description: '',
    frequency: 'MONTHLY',
    customRecurrenceRule: '',
    statutoryFormRef: '',
    defaultAssigneeRole: 'STAFF_ACCOUNTANT',
    defaultPriority: 'MEDIUM',
    estimatedHours: '2',
    dueBasis: 'period_end' as 'period_end' | 'period_start' | 'fixed_date',
    dueOffsetDays: '20',
    fixedMonth: '9',
    fixedDay: '30',
  });
  const [stages, setStages] = useState<StageDraft[]>(DEFAULT_STAGES);
  const [checklist, setChecklist] = useState<ChecklistDraft[]>([]);
  const [newCheckTitle, setNewCheckTitle] = useState('');
  const [newCheckStage, setNewCheckStage] = useState('BACKLOG');

  const loadData = async () => {
    setLoading(true);
    try {
      const [svcs, cats] = await Promise.all([
        apiClient.listPracticeServices(true),
        apiClient.getPracticeServiceCategories(),
      ]);
      setServices(svcs || []);
      setCategories(cats || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (!showInactive && !s.isActive) return false;
      if (catFilter !== 'ALL' && s.category !== catFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.name?.toLowerCase().includes(q) ||
          s.code?.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q) ||
          s.statutoryFormRef?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [services, showInactive, catFilter, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      code: '',
      category: categories[0] || 'Advisory',
      description: '',
      frequency: 'MONTHLY',
      customRecurrenceRule: '',
      statutoryFormRef: '',
      defaultAssigneeRole: 'STAFF_ACCOUNTANT',
      defaultPriority: 'MEDIUM',
      estimatedHours: '2',
      dueBasis: 'period_end',
      dueOffsetDays: '20',
      fixedMonth: '9',
      fixedDay: '30',
    });
    setStages(DEFAULT_STAGES);
    setChecklist([]);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (svc: any) => {
    setEditingId(svc.id);
    const rule = svc.defaultDueDateRule || { basis: 'period_end', offsetDays: 20 };
    setForm({
      name: svc.name || '',
      code: svc.code || '',
      category: svc.category || '',
      description: svc.description || '',
      frequency: svc.frequency || 'MONTHLY',
      customRecurrenceRule: svc.customRecurrenceRule || '',
      statutoryFormRef: svc.statutoryFormRef || '',
      defaultAssigneeRole: svc.defaultAssigneeRole || 'STAFF_ACCOUNTANT',
      defaultPriority: svc.defaultPriority || 'MEDIUM',
      estimatedHours: String(svc.estimatedHours ?? 2),
      dueBasis: rule.basis || 'period_end',
      dueOffsetDays: String(rule.offsetDays ?? 20),
      fixedMonth: String(rule.fixedMonth ?? 9),
      fixedDay: String(rule.fixedDay ?? 30),
    });
    setStages(
      (svc.defaultStages?.length ? svc.defaultStages : DEFAULT_STAGES).map((st: any, idx: number) => ({
        key: st.key,
        label: st.label,
        order: st.order ?? idx + 1,
        assigneeRole: st.assigneeRole || 'STAFF_ACCOUNTANT',
        slaOffsetDays: st.slaOffsetDays ?? 2,
        requiresApproval: Boolean(st.requiresApproval),
      })),
    );
    setChecklist(svc.defaultChecklist || []);
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category.trim()) {
      setError('Service name and category are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        category: form.category.trim(),
        description: form.description.trim() || null,
        frequency: form.frequency,
        customRecurrenceRule: form.frequency === 'CUSTOM' ? form.customRecurrenceRule.trim() : null,
        statutoryFormRef: form.statutoryFormRef.trim() || null,
        defaultAssigneeRole: form.defaultAssigneeRole,
        defaultPriority: form.defaultPriority,
        estimatedHours: Number(form.estimatedHours) || 2,
        defaultDueDateRule:
          form.dueBasis === 'fixed_date'
            ? { basis: 'fixed_date', fixedMonth: Number(form.fixedMonth) || 9, fixedDay: Number(form.fixedDay) || 30 }
            : { basis: form.dueBasis, offsetDays: Number(form.dueOffsetDays) || 0 },
        defaultStages: stages.map((st, idx) => ({ ...st, order: idx + 1 })),
        defaultChecklist: checklist,
      };
      if (editingId) {
        await apiClient.updatePracticeService(editingId, payload);
      } else {
        await apiClient.createPracticeService(payload);
      }
      setDialogOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async (id: string) => {
    await apiClient.clonePracticeService(id);
    await loadData();
  };

  const handleToggle = async (svc: any) => {
    await apiClient.updatePracticeService(svc.id, { isActive: !svc.isActive });
    await loadData();
  };

  const handleDelete = async (svc: any) => {
    setError(null);
    try {
      await apiClient.deletePracticeService(svc.id);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Cannot delete service');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <BackButton variant="link" fallbackUrl="/practice/settings" label="Back to settings" />
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Boxes className="h-6 w-6 text-brand-primary" />
            Service Master (Work Types)
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Configure your firm&apos;s service catalog, statutory due-date rules, default stages, and checklists. Replaces fixed category enums.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Service
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-status-danger-subtle border border-default text-sm text-status-danger-text">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search service name, code, form..."
              className="pl-9"
            />
          </div>
          <div className="w-52">
            <Select
              value={catFilter}
              onValueChange={setCatFilter}
              options={[
                { value: 'ALL', label: 'All Categories' },
                ...categories.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-default"
            />
            Show disabled
          </label>
        </CardContent>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-sm text-text-muted">Loading service catalog...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((svc) => (
            <Card key={svc.id} className={!svc.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="neutral">{svc.category}</Badge>
                      <Badge variant={svc.isActive ? 'success' : 'neutral'}>
                        {svc.isActive ? svc.frequency : 'DISABLED'}
                      </Badge>
                      <Badge variant="info">
                        {svc.billingType || (svc.frequency === 'ONE_TIME' ? 'Fixed' : 'Retainer')}
                        {svc.defaultFee ? ` · ₹${Number(svc.defaultFee).toLocaleString('en-IN')}` : ''}
                      </Badge>
                    </div>
                    <h3 className="text-base font-semibold text-text-primary mt-2">{svc.name}</h3>
                    <div className="text-xs text-text-muted font-mono">{svc.code}</div>
                  </div>
                </div>

                {svc.description && (
                  <p className="text-xs text-text-secondary line-clamp-2">{svc.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted pt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {svc.estimatedHours}h est.
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {svc.defaultStages?.length || 0} stages · {svc.defaultChecklist?.length || 0} tasks
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-default text-xs">
                  <span className="text-text-secondary">
                    {svc.subscriberCount} client(s) · {svc.jobCount} job(s)
                  </span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(svc)} title="Edit">
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleClone(svc.id)} title="Clone">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggle(svc)} title={svc.isActive ? 'Disable' : 'Enable'}>
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(svc)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-status-danger-text" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg">
          <form onSubmit={handleSave} className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Service' : 'Create Custom Service'}</DialogTitle>
              <DialogDescription>
                Define a firm service type, its recurrence, statutory due-date rule, workflow stages, and default checklist.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField label="Service Name" required>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. FEMA ODI Annual Filing"
                />
              </FormField>
              <FormField label="Service Code" hint="Auto-generated if left blank">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. FEMA-ODI"
                />
              </FormField>
              <FormField label="Category (free-form or existing)" required>
                <Input
                  list="service-categories-list"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. FEMA / RBI, GST, Audit..."
                />
                <datalist id="service-categories-list">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Frequency" required>
                <Select
                  value={form.frequency}
                  onValueChange={(v) => setForm({ ...form, frequency: v })}
                  options={[
                    { value: 'ONE_TIME', label: 'One-Time / Project' },
                    { value: 'WEEKLY', label: 'Weekly' },
                    { value: 'MONTHLY', label: 'Monthly' },
                    { value: 'QUARTERLY', label: 'Quarterly' },
                    { value: 'HALF_YEARLY', label: 'Half-Yearly' },
                    { value: 'ANNUAL', label: 'Annual' },
                    { value: 'CUSTOM', label: 'Custom Rule' },
                  ]}
                />
              </FormField>
              {form.frequency === 'CUSTOM' && (
                <FormField label="Custom Recurrence Rule" className="md:col-span-2">
                  <Input
                    value={form.customRecurrenceRule}
                    onChange={(e) => setForm({ ...form, customRecurrenceRule: e.target.value })}
                    placeholder="e.g. Every 45 days or event-based"
                  />
                </FormField>
              )}
              <FormField label="Statutory Form Ref">
                <Input
                  value={form.statutoryFormRef}
                  onChange={(e) => setForm({ ...form, statutoryFormRef: e.target.value })}
                  placeholder="e.g. Form FC-GPR / GSTR-3B"
                />
              </FormField>
              <FormField label="Estimated Hours">
                <Input
                  type="number"
                  step="0.5"
                  value={form.estimatedHours}
                  onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })}
                />
              </FormField>
              <FormField label="Due-Date Rule Basis">
                <Select
                  value={form.dueBasis}
                  onValueChange={(v: any) => setForm({ ...form, dueBasis: v })}
                  options={[
                    { value: 'period_end', label: 'Days after Period End' },
                    { value: 'period_start', label: 'Days after Period Start' },
                    { value: 'fixed_date', label: 'Fixed Calendar Date' },
                  ]}
                />
              </FormField>
              {form.dueBasis === 'fixed_date' ? (
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Month (1-12)">
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={form.fixedMonth}
                      onChange={(e) => setForm({ ...form, fixedMonth: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Day (1-31)">
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={form.fixedDay}
                      onChange={(e) => setForm({ ...form, fixedDay: e.target.value })}
                    />
                  </FormField>
                </div>
              ) : (
                <FormField label="Offset Days" hint="e.g. 20 = 20th of next month">
                  <Input
                    type="number"
                    value={form.dueOffsetDays}
                    onChange={(e) => setForm({ ...form, dueOffsetDays: e.target.value })}
                  />
                </FormField>
              )}
            </div>

            <FormField label="Description">
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Scope & filing guidelines..."
              />
            </FormField>

            <div className="space-y-2 border-t border-default pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                  Workflow Stages ({stages.length})
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
                        label: `Custom Stage ${stages.length + 1}`,
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
                      placeholder="Stage Label"
                    />
                    <div className="col-span-4">
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
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="col-span-2"
                      onClick={() => setStages(stages.filter((_, i) => i !== idx))}
                      disabled={stages.length <= 2}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-default pt-3">
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                Default Checklist ({checklist.length})
              </span>
              <div className="flex gap-2">
                <Input
                  value={newCheckTitle}
                  onChange={(e) => setNewCheckTitle(e.target.value)}
                  placeholder="Checklist step..."
                />
                <div className="w-40">
                  <Select
                    value={newCheckStage}
                    onValueChange={setNewCheckStage}
                    options={stages.map((s) => ({ value: s.key, label: s.label }))}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!newCheckTitle.trim()) return;
                    setChecklist([
                      ...checklist,
                      { id: `chk-${Date.now()}`, title: newCheckTitle.trim(), stage: newCheckStage || stages[0]?.key || 'BACKLOG' },
                    ]);
                    setNewCheckTitle('');
                  }}
                >
                  Add
                </Button>
              </div>
              {checklist.map((c, idx) => (
                <div key={c.id} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded bg-surface-muted">
                  <span>
                    <span className="font-medium text-text-primary">{c.title}</span>{' '}
                    <span className="text-text-muted">({c.stage})</span>
                  </span>
                  <button
                    type="button"
                    className="text-text-muted hover:text-status-danger-text"
                    onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving}>
                {editingId ? 'Save Changes' : 'Create Service'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
