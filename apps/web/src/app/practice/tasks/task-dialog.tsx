'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  FormField,
  Input,
  Select,
  Button,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultClientId?: string;
}

export function TaskDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultClientId,
}: TaskDialogProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clientId: defaultClientId || '',
    title: '',
    description: '',
    category: 'GST',
    statutoryPeriod: new Date().toISOString().slice(0, 7),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]!,
    priority: 'MEDIUM',
  });

  useEffect(() => {
    if (open) {
      apiClient.listPracticeClients().then((data) => {
        setClients(data || []);
        if (data?.length > 0 && !formData.clientId) {
          setFormData((prev) => ({ ...prev, clientId: defaultClientId || data[0].id }));
        }
      });
    }
  }, [open, defaultClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.title || !formData.dueDate) {
      setError('Please provide client, title, and statutory due date.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiClient.createPracticeTask(formData);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create task';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Create Compliance Task</DialogTitle>
            <DialogDescription>
              Assign a statutory deadline or bookkeeping workflow to a client account.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 rounded-lg bg-status-danger-subtle border border-default text-xs text-status-danger-text font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <FormField label="Client Portfolio" required>
              <Select
                value={formData.clientId}
                onValueChange={(val) => setFormData({ ...formData, clientId: val })}
                options={clients.map((c) => ({
                  value: c.id,
                  label: `${c.companyName} (${c.clientCode})`,
                }))}
              />
            </FormField>

            <FormField label="Task Title" required>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. GSTR-3B Monthly Return Filing"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Category" required>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                  options={[
                    { value: 'GST', label: 'GST Return' },
                    { value: 'TDS', label: 'TDS / TCS' },
                    { value: 'INCOME_TAX', label: 'Income Tax' },
                    { value: 'ROC', label: 'ROC / MCA' },
                    { value: 'AUDIT', label: 'Audit' },
                    { value: 'ACCOUNTING', label: 'Bookkeeping / Close' },
                  ]}
                />
              </FormField>

              <FormField label="Priority" required>
                <Select
                  value={formData.priority}
                  onValueChange={(val) => setFormData({ ...formData, priority: val })}
                  options={[
                    { value: 'LOW', label: 'Low' },
                    { value: 'MEDIUM', label: 'Medium' },
                    { value: 'HIGH', label: 'High (Urgent)' },
                    { value: 'CRITICAL', label: 'Critical (Statutory Risk)' },
                  ]}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Statutory Period" required hint="e.g. 2026-10">
                <Input
                  value={formData.statutoryPeriod}
                  onChange={(e) => setFormData({ ...formData, statutoryPeriod: e.target.value })}
                  placeholder="2026-10"
                />
              </FormField>

              <FormField label="Statutory Due Date" required>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Scope & Instructions">
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details, e-filing portal steps, or notes..."
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
