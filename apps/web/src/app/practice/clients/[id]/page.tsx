'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  FolderOpen,
  Calendar,
  Users,
  Clock,
  Activity,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, DateText, Input } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { DocumentVaultView } from '../../documents/document-vault-view';

type TabKey = 'OVERVIEW' | 'JOBS' | 'DOCUMENTS' | 'COMPLIANCE' | 'CONTACTS' | 'ACTIVITY' | 'BILLING';

export default function Client360Page() {
  const params = useParams();
  const clientId = String(params?.id || '');

  const [tab, setTab] = useState<TabKey>('OVERVIEW');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Add contact form
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('Director');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const load360 = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await apiClient.getClient360(clientId);
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load360();
  }, [clientId]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;
    await apiClient.addClientContact(clientId, {
      name: contactName,
      role: contactRole,
      email: contactEmail,
      phone: contactPhone,
    });
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    await load360();
  };

  const client = data?.client;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-default bg-surface p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/practice/clients"
              aria-label="Back to Clients"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-default bg-surface-sunken text-secondary hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-primary">
                  {loading ? 'Loading Client 360...' : client?.companyName}
                </h1>
                {client?.clientCode && <Badge variant="brand" size="sm">{client.clientCode}</Badge>}
                {client?.healthStatus && (
                  <Badge variant={client.healthStatus === 'HEALTHY' ? 'success' : 'warning'} size="sm">
                    {client.healthStatus}
                  </Badge>
                )}
              </div>
              {client && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-secondary mt-1">
                  <span>PAN: <strong className="font-mono text-primary">{client.pan || 'Not Set'}</strong></span>
                  <span>GSTINs: <strong className="font-mono text-primary">{client.gstins?.length ? client.gstins.join(', ') : 'Unregistered'}</strong></span>
                  <span>Tier: <strong>{client.serviceTier}</strong> ({client.engagementType})</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/practice/clients/${clientId}/vault`}>
              <Button variant="outline" size="sm" leftIcon={<FolderOpen className="h-3.5 w-3.5" />}>
                Full Vault
              </Button>
            </Link>
            <Link href="/practice/jobs">
              <Button variant="primary" size="sm" leftIcon={<Briefcase className="h-3.5 w-3.5" />}>
                Manage Jobs
              </Button>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-default pt-3">
          {(
            [
              { key: 'OVERVIEW', label: 'Overview', icon: Building2 },
              { key: 'JOBS', label: `Jobs (${data?.jobs?.length || 0})`, icon: Briefcase },
              { key: 'DOCUMENTS', label: 'Documents Vault', icon: FolderOpen },
              { key: 'COMPLIANCE', label: 'Compliance Calendar', icon: Calendar },
              { key: 'CONTACTS', label: `Contacts (${data?.contacts?.length || 0})`, icon: Users },
              { key: 'ACTIVITY', label: 'Notes & Activity', icon: Activity },
              { key: 'BILLING', label: 'Time & Billing', icon: Clock },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  tab === t.key
                    ? 'bg-brand-subtle text-brand-text'
                    : 'text-secondary hover:bg-surface-sunken'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'OVERVIEW' && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Jobs & Filings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.jobs.length === 0 ? (
                <p className="text-xs text-muted py-4">No jobs created for this client yet.</p>
              ) : (
                data.jobs.slice(0, 6).map((j: any) => (
                  <div key={j.id} className="flex items-center justify-between p-3 rounded-xl border border-default bg-surface-sunken/40">
                    <div>
                      <div className="text-xs font-bold text-primary">{j.title}</div>
                      <div className="text-[11px] text-muted">Due <DateText date={j.dueDate} /> · {j.assignedToName}</div>
                    </div>
                    <Badge variant="brand" size="xs">{j.stage}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Vault Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.recentFiles.length === 0 ? (
                <p className="text-xs text-muted py-4">No documents uploaded to vault yet.</p>
              ) : (
                data.recentFiles.slice(0, 6).map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border border-default bg-surface-sunken/40">
                    <span className="text-xs font-semibold text-primary truncate">{f.fileName}</span>
                    <Badge variant="neutral" size="xs">v{f.version}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'JOBS' && data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Jobs & Workflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.jobs.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">No jobs yet. Create one from the Jobs Pipeline.</p>
            ) : (
              data.jobs.map((j: any) => (
                <div key={j.id} className="flex items-center justify-between p-3 rounded-xl border border-default">
                  <div>
                    <div className="text-xs font-bold text-primary">{j.title}</div>
                    <div className="text-[11px] text-secondary">Period: {j.period} · Assigned: {j.assignedToName}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="xs"><DateText date={j.dueDate} /></Badge>
                    <Badge variant="brand" size="xs">{j.stage}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'DOCUMENTS' && clientId && <DocumentVaultView clientId={clientId} />}

      {tab === 'COMPLIANCE' && data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statutory Compliance Calendar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.complianceCalendar || []).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-default">
                <div>
                  <div className="text-xs font-bold text-primary">{t.title}</div>
                  <div className="text-[11px] text-muted">{t.category} · Due {t.dueDate}</div>
                </div>
                <Badge variant={t.status === 'FILED' ? 'success' : 'warning'} size="xs">{t.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === 'CONTACTS' && data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Client Contacts & Signatories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-3 rounded-xl border border-default bg-brand-subtle/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">{client.primaryContactName}</span>
                  <Badge variant="brand" size="xs">Primary Contact</Badge>
                </div>
                <p className="text-[11px] text-secondary mt-0.5">{client.primaryContactEmail} · {client.primaryContactPhone || '—'}</p>
              </div>

              {data.contacts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-default">
                  <div>
                    <div className="text-xs font-bold text-primary">{c.name} <span className="text-muted font-normal">({c.role})</span></div>
                    <div className="text-[11px] text-secondary">{c.email || '—'} · {c.phone || '—'}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${c.name}`}
                    onClick={async () => {
                      await apiClient.deleteClientContact(c.id);
                      await load360();
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-status-danger-text" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddContact} className="space-y-3">
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Full Name" required />
                <select
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-primary"
                >
                  <option value="Director">Director</option>
                  <option value="Authorised Signatory">Authorised Signatory</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Partner">Partner</option>
                </select>
                <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" type="email" />
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Phone" />
                <Button type="submit" variant="primary" size="sm" className="w-full" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  Add Contact
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'ACTIVITY' && data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline & Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.activity || []).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-default bg-surface-sunken/30 text-xs">
                <div>
                  <Badge variant="neutral" size="xs">{a.type}</Badge>
                  <span className="ml-2 font-semibold text-primary">{a.title}</span>
                  <span className="ml-2 text-muted">{a.meta}</span>
                </div>
                <span className="text-[11px] font-mono text-muted">{new Date(a.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === 'BILLING' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-text" />
              <span>Time Tracking, WIP & Engagement Billing</span>
              <Badge variant="info" size="xs">Phase 2 · Coming soon</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-secondary leading-relaxed">
              The underlying <code className="font-mono">practice_time_entries</code> schema is already provisioned in PostgreSQL.
              In Phase 2 (see <code className="font-mono">docs/practice/PRACTICE_ROADMAP.md</code>), staff timers, weekly timesheets,
              and one-click GST engagement invoicing will activate here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
