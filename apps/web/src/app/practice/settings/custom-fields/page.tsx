'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  FormField,
  Select,
} from '@platform/ui';
import { Plus, Trash2, Hash, Tag } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { BackButton } from '@/components/back-button';

export default function CustomFieldsAndLabelsPage() {
  const [fields, setFields] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newField, setNewField] = useState({
    entityType: 'CLIENT' as 'CLIENT' | 'JOB',
    label: '',
    fieldType: 'text' as 'text' | 'number' | 'date' | 'dropdown' | 'checkbox',
    optionsCsv: '',
    isRequired: false,
  });

  const [newLabel, setNewLabel] = useState({
    name: '',
    color: 'brand',
    entityType: 'ALL' as 'CLIENT' | 'JOB' | 'ALL',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [f, l] = await Promise.all([
        apiClient.listCustomFields(),
        apiClient.listPracticeLabels(),
      ]);
      setFields(f || []);
      setLabels(l || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newField.label.trim()) return;
    await apiClient.createCustomField({
      entityType: newField.entityType,
      label: newField.label.trim(),
      fieldType: newField.fieldType,
      options: newField.fieldType === 'dropdown'
        ? newField.optionsCsv.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      isRequired: newField.isRequired,
    });
    setNewField({ ...newField, label: '', optionsCsv: '' });
    await loadData();
  };

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.name.trim()) return;
    await apiClient.createPracticeLabel({
      name: newLabel.name.trim(),
      color: newLabel.color,
      entityType: newLabel.entityType,
    });
    setNewLabel({ ...newLabel, name: '' });
    await loadData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-2">
        <BackButton variant="link" fallbackUrl="/practice/settings" label="Back to settings" />
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Hash className="h-6 w-6 text-brand-primary" />
          Custom Fields &amp; Labels
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Define firm-wide custom metadata fields and color-coded labels for Clients and Jobs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-base font-semibold text-text-primary">Custom Fields</h2>
            <form onSubmit={handleCreateField} className="space-y-3 border-b border-default pb-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Applies To">
                  <Select
                    value={newField.entityType}
                    onValueChange={(v: any) => setNewField({ ...newField, entityType: v })}
                    options={[
                      { value: 'CLIENT', label: 'Client Master' },
                      { value: 'JOB', label: 'Jobs Pipeline' },
                    ]}
                  />
                </FormField>
                <FormField label="Field Type">
                  <Select
                    value={newField.fieldType}
                    onValueChange={(v: any) => setNewField({ ...newField, fieldType: v })}
                    options={[
                      { value: 'text', label: 'Text' },
                      { value: 'number', label: 'Number' },
                      { value: 'date', label: 'Date' },
                      { value: 'dropdown', label: 'Dropdown' },
                      { value: 'checkbox', label: 'Checkbox' },
                    ]}
                  />
                </FormField>
              </div>
              <FormField label="Field Label" required>
                <Input
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  placeholder="e.g. Tally Serial Number, Statutory Auditor..."
                />
              </FormField>
              {newField.fieldType === 'dropdown' && (
                <FormField label="Dropdown Options (comma-separated)">
                  <Input
                    value={newField.optionsCsv}
                    onChange={(e) => setNewField({ ...newField, optionsCsv: e.target.value })}
                    placeholder="Option A, Option B, Option C"
                  />
                </FormField>
              )}
              <Button type="submit" variant="primary" size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom Field
              </Button>
            </form>

            {loading ? (
              <div className="text-xs text-text-muted">Loading...</div>
            ) : fields.length === 0 ? (
              <div className="text-xs text-text-muted">No custom fields defined yet.</div>
            ) : (
              <div className="space-y-2">
                {fields.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg border border-default bg-surface-muted">
                    <div>
                      <div className="text-sm font-medium text-text-primary">{f.label}</div>
                      <div className="text-xs text-text-muted">
                        {f.entityType} · {f.fieldType} · key: <span className="font-mono">{f.fieldKey}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await apiClient.deleteCustomField(f.id);
                        await loadData();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-status-danger-text" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Tag className="h-4 w-4 text-brand-primary" />
              Labels &amp; Tags
            </h2>
            <form onSubmit={handleCreateLabel} className="space-y-3 border-b border-default pb-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Label Name" required>
                  <Input
                    value={newLabel.name}
                    onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                    placeholder="e.g. VIP, MSME, Audit-Ready"
                  />
                </FormField>
                <FormField label="Color">
                  <Select
                    value={newLabel.color}
                    onValueChange={(v) => setNewLabel({ ...newLabel, color: v })}
                    options={[
                      { value: 'brand', label: 'Brand' },
                      { value: 'success', label: 'Green (Success)' },
                      { value: 'warning', label: 'Amber (Warning)' },
                      { value: 'danger', label: 'Red (Urgent)' },
                      { value: 'neutral', label: 'Neutral' },
                    ]}
                  />
                </FormField>
              </div>
              <Button type="submit" variant="primary" size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Label
              </Button>
            </form>

            {loading ? (
              <div className="text-xs text-text-muted">Loading...</div>
            ) : labels.length === 0 ? (
              <div className="text-xs text-text-muted">No labels defined yet.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {labels.map((l) => (
                  <div key={l.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-default bg-surface-muted">
                    <Badge variant={l.color === 'danger' ? 'danger' : l.color === 'warning' ? 'warning' : l.color === 'success' ? 'success' : 'neutral'}>
                      {l.name}
                    </Badge>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiClient.deletePracticeLabel(l.id);
                        await loadData();
                      }}
                      className="text-text-muted hover:text-status-danger-text"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
