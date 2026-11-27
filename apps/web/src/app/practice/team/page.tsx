'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button, Badge, Input, FormField, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@platform/ui';
import { Users, UserPlus, Edit3, RefreshCw, Ban, Copy } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function TeamManagementPage() {
  const [data, setData] = useState<any>({ colleagues: [], invitations: [], permissionRoles: [], jobRoles: [] });
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<any | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // Invite form
  const [invEmail, setInvEmail] = useState('');
  const [invName, setInvName] = useState('');
  const [invRole, setInvRole] = useState('STAFF_ACCOUNTANT');
  const [invPermRoleId, setInvPermRoleId] = useState('');

  // Edit form
  const [editCapacity, setEditCapacity] = useState('40');
  const [editCostRate, setEditCostRate] = useState('500');
  const [editRole, setEditRole] = useState('STAFF_ACCOUNTANT');
  const [editPermRoleId, setEditPermRoleId] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [reassignTo, setReassignTo] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getTeam();
      setData(res || { colleagues: [], invitations: [], permissionRoles: [], jobRoles: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiClient.createTeamInvite({
      email: invEmail,
      name: invName,
      invitedRole: invRole,
      permissionRoleId: invPermRoleId || undefined,
    });
    setInviteLink(`${window.location.origin}${res.inviteLink}`);
    setInvEmail('');
    setInvName('');
    await loadData();
  };

  const openEdit = (m: any) => {
    setEditMember(m);
    setEditCapacity(String(m.weeklyCapacityHours ?? 40));
    setEditCostRate(String(m.hourlyCostRate ?? 500));
    setEditRole(m.role || 'STAFF_ACCOUNTANT');
    setEditPermRoleId(m.permissionRoleId || '');
    setEditActive(Boolean(m.isActive));
    setReassignTo('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember) return;
    await apiClient.updateTeamMember(editMember.id, {
      role: editRole,
      permissionRoleId: editPermRoleId || null,
      weeklyCapacityHours: Number(editCapacity) || 40,
      hourlyCostRate: Number(editCostRate) || 500,
      isActive: editActive,
      reassignOpenJobsToUserId: !editActive && reassignTo ? reassignTo : undefined,
    });
    setEditMember(null);
    await loadData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-primary" />
            Team &amp; Colleagues
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Invite colleagues into your existing firm workspace, manage permission roles, weekly capacity hours, and hourly cost rates.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => { setInviteLink(null); setInviteOpen(true); }}>
          <UserPlus className="h-4 w-4 mr-1.5" /> Invite Colleague
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-3">
            Firm Colleagues ({data.colleagues.length})
          </h2>
          {loading ? (
            <div className="text-xs text-text-muted py-6 text-center">Loading team...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-default text-text-muted uppercase text-[11px]">
                    <th className="py-2 px-3">Colleague</th>
                    <th className="py-2 px-3">Permission Role</th>
                    <th className="py-2 px-3 text-right">Weekly Capacity</th>
                    <th className="py-2 px-3 text-right">Cost Rate (₹/hr)</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {data.colleagues.map((c: any) => (
                    <tr key={c.id}>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-text-primary">{c.name}</div>
                        <div className="text-[11px] text-text-muted font-mono">{c.email}</div>
                      </td>
                      <td className="py-2.5 px-3"><Badge variant="brand" size="xs">{c.permissionRoleName}</Badge></td>
                      <td className="py-2.5 px-3 text-right font-mono">{c.weeklyCapacityHours}h</td>
                      <td className="py-2.5 px-3 text-right font-mono">₹{c.hourlyCostRate}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={c.isActive ? 'success' : 'neutral'} size="xs">
                          {c.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button size="xs" variant="ghost" onClick={() => openEdit(c)}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data.invitations.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Invitations</h2>
            {data.invitations.map((inv: any) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-surface-sunken text-xs">
                <div>
                  <span className="font-semibold text-text-primary">{inv.email}</span>
                  <span className="ml-2 text-text-muted">({inv.invitedRole})</span>
                  <Badge className="ml-2" variant={inv.status === 'ACCEPTED' ? 'success' : inv.status === 'PENDING' ? 'warning' : 'neutral'} size="xs">
                    {inv.status}
                  </Badge>
                </div>
                {inv.status === 'PENDING' && (
                  <div className="flex items-center gap-1.5">
                    <Button size="xs" variant="outline" onClick={async () => { await apiClient.resendTeamInvite(inv.id); await loadData(); }}>
                      <RefreshCw className="h-3 w-3 mr-1" /> Resend
                    </Button>
                    <Button size="xs" variant="ghost" onClick={async () => { await apiClient.revokeTeamInvite(inv.id); await loadData(); }}>
                      <Ban className="h-3 w-3 text-status-danger-text" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent size="sm">
          <form onSubmit={handleSendInvite} className="space-y-3">
            <DialogHeader><DialogTitle>Invite Colleague to Firm</DialogTitle></DialogHeader>
            <FormField label="Email Address" required>
              <Input type="email" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="priya@firm.in" required />
            </FormField>
            <FormField label="Name (Optional)">
              <Input value={invName} onChange={(e) => setInvName(e.target.value)} placeholder="Priya Nair" />
            </FormField>
            <FormField label="System Role">
              <select value={invRole} onChange={(e) => setInvRole(e.target.value)} className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-text-primary">
                <option value="STAFF_ACCOUNTANT">Staff Accountant (Preparer)</option>
                <option value="MANAGER">Manager (Reviewer)</option>
                <option value="FIRM_ADMIN">Firm Admin</option>
                <option value="FIRM_PARTNER">Firm Partner</option>
              </select>
            </FormField>
            <FormField label="Custom Permission Role (Optional)">
              <select value={invPermRoleId} onChange={(e) => setInvPermRoleId(e.target.value)} className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-text-primary">
                <option value="">Use System Role Default</option>
                {data.permissionRoles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </FormField>
            {inviteLink && (
              <div className="p-3 rounded-xl bg-status-success-subtle text-xs space-y-1">
                <div className="font-semibold text-status-success-text">Invite Link Ready (joins this firm):</div>
                <div className="flex items-center gap-2">
                  <input readOnly value={inviteLink} data-testid="invite-magic-link" className="w-full bg-surface px-2 py-1 rounded border border-default font-mono text-[11px]" />
                  <Button type="button" size="xs" variant="outline" onClick={() => navigator.clipboard?.writeText(inviteLink)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Close</Button>
              <Button type="submit" variant="primary">Create Invite</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!editMember} onOpenChange={(o) => !o && setEditMember(null)}>
        <DialogContent size="sm">
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <DialogHeader><DialogTitle>Edit Colleague: {editMember?.name}</DialogTitle></DialogHeader>
            <FormField label="System Role">
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-text-primary">
                <option value="STAFF_ACCOUNTANT">Staff Accountant</option>
                <option value="MANAGER">Manager / Reviewer</option>
                <option value="FIRM_ADMIN">Firm Admin</option>
                <option value="FIRM_PARTNER">Firm Partner</option>
              </select>
            </FormField>
            <FormField label="Custom Permission Role">
              <select value={editPermRoleId} onChange={(e) => setEditPermRoleId(e.target.value)} className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-text-primary">
                <option value="">Default</option>
                {data.permissionRoles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Weekly Capacity (hrs)">
                <Input type="number" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} />
              </FormField>
              <FormField label="Hourly Cost Rate (₹)">
                <Input type="number" value={editCostRate} onChange={(e) => setEditCostRate(e.target.value)} />
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
              <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} /> Active member
            </label>
            {!editActive && (
              <FormField label="Reassign Open Jobs To">
                <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-text-primary">
                  <option value="">Leave unassigned</option>
                  {data.colleagues.filter((c: any) => c.id !== editMember?.id && c.isActive).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormField>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Member</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
