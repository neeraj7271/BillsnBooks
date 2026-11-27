'use client';

import React, { useState } from 'react';
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

interface TaskStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any | null;
  onSuccess: () => void;
}

export function TaskStatusDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
}: TaskStatusDialogProps) {
  const [status, setStatus] = useState<string>('IN_PROGRESS');
  const [ackNumber, setAckNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (task) {
      setStatus(task.status);
      setAckNumber(task.filingAcknowledgmentNumber || '');
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    setLoading(true);
    setError(null);
    try {
      await apiClient.updatePracticeTaskStatus(task.id, status, ackNumber || undefined);
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update task status';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Update Task Status</DialogTitle>
            <DialogDescription>
              {task?.title} ({task?.clientName})
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 rounded-lg bg-status-danger-subtle border border-default text-xs text-status-danger-text font-medium">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <FormField label="Workflow Status" required>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val)}
                options={[
                  { value: 'NOT_STARTED', label: 'Not Started' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'PENDING_REVIEW', label: 'Pending Senior Review' },
                  { value: 'FILED', label: 'Filed / Completed' },
                  { value: 'OVERDUE', label: 'Overdue' },
                ]}
              />
            </FormField>

            {status === 'FILED' && (
              <FormField label="Government ARN / Ack Number" hint="e.g. AA2710260012345">
                <Input
                  value={ackNumber}
                  onChange={(e) => setAckNumber(e.target.value.toUpperCase())}
                  placeholder="Govt Acknowledgment Number"
                />
              </FormField>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Save Status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
