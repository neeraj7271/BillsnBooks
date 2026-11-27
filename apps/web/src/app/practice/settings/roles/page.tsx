'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button, Badge, Input, FormField } from '@platform/ui';
import { ShieldCheck, Plus, Briefcase } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

const PERM_KEYS = [
  { key: 'manageTeam', label: 'Manage Team' },
  { key: 'manageServices', label: 'Manage Services' },
  { key: 'viewBilling', label: 'View Billing & WIP' },
  { key: 'approveSignoff', label: 'Approve & Sign-Off' },
  { key: 'manageClients', label: 'Manage Clients' },
  { key: 'fileReturns', label: 'File Returns' },
  { key: 'restrictedClientAccess', label: 'Restricted to Assigned Clients' },
] as const;

export default function RolesAndJobRolesPage() {
  const [permRoles, setPermRoles] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [roleName, setRoleName] = useState('');
  const [perms, setPerms] = useState<Record<string, boolean>>({
    manageTeam: false,
    manageServices: false,
    viewBilling: false,
    approveSignoff: true,
    manageClients: true,
    fileReturns: false,
    manageSettings: false,
    restrictedClientAccess: false,
  });
  const [jobRoleName, setJobRoleName] = useState('');

  const loadData = async () => {
    const [pr, jr] = await Promise.all([
      apiClient.listPermissionRoles(),
      apiClient.listJobRoles(),
    ]);
    setPermRoles(pr || []);
    setJobRoles(jr || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePermRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;
    await apiClient.createPermissionRole({ name: roleName.trim(), permissions: perms });
    setRoleName('');
    await loadData();
  };

  const handleCreateJobRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobRoleName.trim()) return;
    await apiClient.createJobRole({ name: jobRoleName.trim() });
    setJobRoleName('');
    await loadData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-brand-primary" />
          Permission Roles &amp; Job Roles
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Permission roles control system access rights; job roles (Preparer, Reviewer, Partner) control workflow stage ownership per client.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Custom Permission Roles</h2>
            <form onSubmit={handleCreatePermRole} className="space-y-3 border-b border-default pb-4">
              <FormField label="New Permission Role Name" required>
                <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. Senior Reviewer / Articled Clerk" />
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                {PERM_KEYS.map((pk) => (
                  <label key={pk.key} className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(perms[pk.key])}
                      onChange={(e) => setPerms({ ...perms, [pk.key]: e.target.checked })}
                    />
                    {pk.label}
                  </label>
                ))}
              </div>
              <Button type="submit" size="sm" variant="primary"><Plus className="h-3.5 w-3.5 mr-1" /> Create Role</Button>
            </form>

            <div className="space-y-2">
              {permRoles.map((r) => (
                <div key={r.id} className="p-3 rounded-xl bg-surface-sunken space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-primary">{r.name}</span>
                    <Badge variant={r.isSystem ? 'neutral' : 'brand'} size="xs">{r.isSystem ? 'System' : 'Custom'}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {PERM_KEYS.filter((pk) => r.permissions?.[pk.key]).map((pk) => (
                      <Badge key={pk.key} variant="info" size="xs">{pk.label}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-brand-primary" />
              Job Roles (Workflow Assignment)
            </h2>
            <form onSubmit={handleCreateJobRole} className="flex gap-2 border-b border-default pb-4">
              <Input value={jobRoleName} onChange={(e) => setJobRoleName(e.target.value)} placeholder="e.g. Tax Audit Specialist" />
              <Button type="submit" size="sm" variant="primary"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
            </form>
            <div className="space-y-2">
              {jobRoles.map((jr) => (
                <div key={jr.id} className="p-3 rounded-xl bg-surface-sunken flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-text-primary">{jr.name}</div>
                    <div className="text-[11px] text-text-muted">{jr.description || jr.code}</div>
                  </div>
                  <Badge variant="success" size="xs">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
