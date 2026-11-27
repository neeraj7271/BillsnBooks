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
  DatePicker,
} from '@platform/ui';
import { Plus } from 'lucide-react';
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
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInlineService, setShowInlineService] = useState(false);
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcCategory, setNewSvcCategory] = useState('Advisory');

  const [formData, setFormData] = useState({
    clientId: defaultClientId || '',
    serviceTypeId: '',
    title: '',
    description: '',
    category: 'GST',
    statutoryPeriod: new Date().toISOString().slice(0, 7),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]!,
    priority: 'MEDIUM',
  });

  useEffect(() => {
    if (open) {
      Promise.all([
        apiClient.listPracticeClients(),
        apiClient.listPracticeServices(),
      ]).then(([cData, sData]) => {
        setClients(cData || []);
        setServices(sData || []);
        setFormData((prev) => ({
          ...prev,
          clientId: prev.clientId || defaultClientId || cData?.[0]?.id || '',
          serviceTypeId: prev.serviceTypeId || sData?.[0]?.id || '',
          category: prev.serviceTypeId ? prev.category : sData?.[0]?.category || prev.category,
        }));
      });
    }
  }, [open, defaultClientId]);

  const handleSelectService = (svcId: string) => {
    const svc = services.find((s) => s.id === svcId);
    setFormData((prev) => ({
      ...prev,
      serviceTypeId: svcId,
      category: svc?.category || prev.category,
      title: prev.title || (svc ? `${svc.name}` : ''),
    }));
  };

  const handleCreateInlineService = async () => {
    if (!newSvcName.trim()) return;
    try {
      const created = await apiClient.createPracticeService({
        name: newSvcName.trim(),
        category: newSvcCategory.trim() || 'General',
        frequency: 'MONTHLY',
      });
      setServices((prev) => [...prev, created]);
      setFormData((prev) => ({
        ...prev,
        serviceTypeId: created.id,
        category: created.category,
        title: prev.title || created.name,
      }));
      setNewSvcName('');
      setShowInlineService(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create custom service');
    }
  };

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
              Assign a firm service deliverable or compliance task to a client account.
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

            <FormField label="Service Type (Work Type)" required>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={formData.serviceTypeId}
                    onValueChange={handleSelectService}
                    options={services.map((s) => ({
                      value: s.id,
                      label: `${s.name} (${s.category})`,
                    }))}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInlineService((v) => !v)}
                  title="Add custom service"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Custom
                </Button>
              </div>
            </FormField>

            {showInlineService && (
              <div className="p-3 rounded-lg border border-default bg-surface-muted space-y-2">
                <div className="text-xs font-semibold text-text-primary">Quick Add Custom Service</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newSvcName}
                    onChange={(e) => setNewSvcName(e.target.value)}
                    placeholder="Service name (e.g. FEMA ODI)"
                  />
                  <Input
                    value={newSvcCategory}
                    onChange={(e) => setNewSvcCategory(e.target.value)}
                    placeholder="Category (e.g. FEMA)"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowInlineService(false)}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" variant="primary" onClick={handleCreateInlineService}>
                    Save Service
                  </Button>
                </div>
              </div>
            )}

            <FormField label="Task Title" required>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. GSTR-3B Monthly Return Filing"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
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

              <FormField label="Statutory Period" required hint="e.g. 2026-10">
                <Input
                  value={formData.statutoryPeriod}
                  onChange={(e) => setFormData({ ...formData, statutoryPeriod: e.target.value })}
                  placeholder="2026-10"
                />
              </FormField>
            </div>

            <FormField label="Statutory Due Date" required>
              <DatePicker
                value={formData.dueDate}
                onChange={(d) => setFormData({ ...formData, dueDate: d })}
                required
              />
            </FormField>

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
