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
  Boxes,
  KeyRound,
  Eye,
  Copy,
  Settings,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, DateText, Input, FormField } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { DocumentVaultView } from '../../documents/document-vault-view';

type TabKey =
  | 'OVERVIEW'
  | 'SERVICES'
  | 'JOBS'
  | 'DOCUMENTS'
  | 'CREDENTIALS'
  | 'COMPLIANCE'
  | 'CONTACTS'
  | 'PROFILE'
  | 'ACTIVITY'
  | 'BILLING';

export default function Client360Page() {
  const params = useParams();
  const clientId = String(params?.id || '');

  const [tab, setTab] = useState<TabKey>('OVERVIEW');
  const [data, setData] = useState<any>(null);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [credAudit, setCredAudit] = useState<any[]>([]);
  const [revealedMap, setRevealedMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Add contact form
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('Director');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // Subscribe service form
  const [subServiceId, setSubServiceId] = useState('');
  const [subFeeAmount, setSubFeeAmount] = useState('');
  const [subFeeType, setSubFeeType] = useState('recurring');
  const [subStaffId, setSubStaffId] = useState('');
  const [subDueOffset, setSubDueOffset] = useState('');

  // Credential form
  const [credLabel, setCredLabel] = useState('');
  const [credPortal, setCredPortal] = useState('GST');
  const [credUser, setCredUser] = useState('');
  const [credPass, setCredPass] = useState('');
  const [credUrl, setCredUrl] = useState('');

  // Profile form
  const [profileForm, setProfileForm] = useState({
    entityType: 'Pvt Ltd',
    incorporationDate: '',
    cin: '',
    tan: '',
    aadhaarMasked: '',
    registeredAddress: '',
    gstinsCsv: '',
    fyPreference: 'April-March',
    isVip: false,
    customFields: {} as Record<string, any>,
    labels: [] as string[],
  });

  const load360 = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [res, svcs, workload] = await Promise.all([
        apiClient.getClient360(clientId),
        apiClient.listPracticeServices().catch(() => []),
        apiClient.getPracticeWorkload().catch(() => ({ staff: [] })),
      ]);
      setData(res);
      setAllServices(svcs || []);
      setStaff(workload?.staff || []);
      if (!subServiceId && svcs?.length > 0) setSubServiceId(svcs[0].id);

      if (res?.client) {
        setProfileForm({
          entityType: res.client.entityType || 'Pvt Ltd',
          incorporationDate: res.client.incorporationDate || '',
          cin: res.client.cin || '',
          tan: res.client.tan || '',
          aadhaarMasked: res.client.aadhaarMasked || '',
          registeredAddress: res.client.registeredAddress || '',
          gstinsCsv: (res.client.gstins || []).join(', '),
          fyPreference: res.client.fyPreference || 'April-March',
          isVip: Boolean(res.client.isVip),
          customFields: res.client.customFields || {},
          labels: res.client.labels || [],
        });
      }

      // Load credentials silently (will return 403 for CLIENT_VIEWER, which is expected)
      try {
        const [creds, audit] = await Promise.all([
          apiClient.listClientCredentials(clientId),
          apiClient.getClientCredentialAudit(clientId),
        ]);
        setCredentials(creds || []);
        setCredAudit(audit || []);
      } catch {
        setCredentials([]);
      }
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

  const handleSubscribeService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subServiceId) return;
    await apiClient.subscribeClientServices(clientId, [
      {
        serviceTypeId: subServiceId,
        feeAmount: subFeeAmount ? Number(subFeeAmount) : null,
        feeType: subFeeType,
        assignedStaffId: subStaffId || null,
        customDueRule: subDueOffset ? { basis: 'period_end', offsetDays: Number(subDueOffset) } : null,
      },
    ]);
    setSubFeeAmount('');
    setSubDueOffset('');
    setNotice('Client service subscription saved.');
    await load360();
  };

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credLabel.trim() || !credUser.trim() || !credPass.trim()) return;
    await apiClient.upsertClientCredential(clientId, {
      label: credLabel.trim(),
      portalType: credPortal,
      username: credUser.trim(),
      password: credPass,
      url: credUrl.trim() || null,
    });
    setCredLabel('');
    setCredUser('');
    setCredPass('');
    setCredUrl('');
    setNotice('Portal credential encrypted and stored in vault.');
    await load360();
  };

  const handleRevealCredential = async (credId: string) => {
    const res = await apiClient.revealClientCredential(credId);
    setRevealedMap((prev) => ({ ...prev, [credId]: res.password }));
    setNotice(`Credential revealed and logged in audit trail.`);
    const audit = await apiClient.getClientCredentialAudit(clientId).catch(() => []);
    setCredAudit(audit);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiClient.updatePracticeClient(clientId, {
      entityType: profileForm.entityType,
      incorporationDate: profileForm.incorporationDate || null,
      cin: profileForm.cin || null,
      tan: profileForm.tan || null,
      aadhaarMasked: profileForm.aadhaarMasked || null,
      registeredAddress: profileForm.registeredAddress || null,
      gstins: profileForm.gstinsCsv.split(',').map((s) => s.trim()).filter(Boolean),
      fyPreference: profileForm.fyPreference,
      isVip: profileForm.isVip,
      customFields: profileForm.customFields,
      labels: profileForm.labels,
    });
    setNotice('Client master profile updated.');
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
                {client?.isVip && (
                  <Badge variant="warning" size="sm">
                    <Star className="h-3 w-3 mr-1" /> VIP
                  </Badge>
                )}
                {client?.clientCode && <Badge variant="brand" size="sm">{client.clientCode}</Badge>}
                {client?.entityType && <Badge variant="neutral" size="sm">{client.entityType}</Badge>}
                {client?.healthStatus && (
                  <Badge variant={client.healthStatus === 'HEALTHY' ? 'success' : 'warning'} size="sm">
                    {client.healthStatus}
                  </Badge>
                )}
              </div>
              {client && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-secondary mt-1">
                  <span>PAN: <strong className="font-mono text-primary">{client.pan || 'Not Set'}</strong></span>
                  {client.cin && <span>CIN: <strong className="font-mono text-primary">{client.cin}</strong></span>}
                  {client.tan && <span>TAN: <strong className="font-mono text-primary">{client.tan}</strong></span>}
                  <span>GSTINs: <strong className="font-mono text-primary">{client.gstins?.length ? client.gstins.join(', ') : 'Unregistered'}</strong></span>
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
              { key: 'SERVICES', label: `Services (${data?.clientServices?.length || 0})`, icon: Boxes },
              { key: 'JOBS', label: `Jobs (${data?.jobs?.length || 0})`, icon: Briefcase },
              { key: 'DOCUMENTS', label: 'Documents Vault', icon: FolderOpen },
              { key: 'CREDENTIALS', label: `Credentials (${credentials.length})`, icon: KeyRound },
              { key: 'COMPLIANCE', label: 'Compliance Calendar', icon: Calendar },
              { key: 'CONTACTS', label: `Contacts (${data?.contacts?.length || 0})`, icon: Users },
              { key: 'PROFILE', label: 'Profile & Fields', icon: Settings },
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

      {notice && (
        <div className="p-3 rounded-xl bg-status-success-subtle border border-default text-xs text-status-success-text font-medium flex items-center justify-between">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> {notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      {/* OVERVIEW */}
      {tab === 'OVERVIEW' && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subscribed Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data.clientServices || []).length === 0 ? (
                <p className="text-xs text-muted py-4">No services mapped yet. Open the Services tab to subscribe.</p>
              ) : (
                data.clientServices.map((cs: any) => (
                  <div key={cs.id} className="flex items-center justify-between p-3 rounded-xl border border-default bg-surface-sunken/40">
                    <div>
                      <div className="text-xs font-bold text-primary">{cs.serviceType?.name}</div>
                      <div className="text-[11px] text-muted">{cs.serviceType?.category} · {cs.serviceType?.frequency}</div>
                    </div>
                    <Badge variant={cs.isActive ? 'success' : 'neutral'} size="xs">
                      {cs.feeAmount ? `₹${cs.feeAmount}` : 'Active'}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Jobs &amp; Filings</CardTitle>
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
        </div>
      )}

      {/* SERVICES & ENGAGEMENTS */}
      {tab === 'SERVICES' && data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Client-Work Mapping (Subscribed Services)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data.clientServices || []).length === 0 ? (
                <p className="text-xs text-muted py-6 text-center">No services subscribed yet. Subscribe services on the right to automate recurring jobs.</p>
              ) : (
                data.clientServices.map((cs: any) => (
                  <div key={cs.id} className="flex items-center justify-between p-3 rounded-xl border border-default">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">{cs.serviceType?.name}</span>
                        <Badge variant="neutral" size="xs">{cs.serviceType?.category}</Badge>
                        <Badge variant="info" size="xs">{cs.serviceType?.frequency}</Badge>
                      </div>
                      <div className="text-[11px] text-secondary mt-1">
                        Fee: {cs.feeAmount != null ? `₹${cs.feeAmount} (${cs.feeType})` : 'Standard'}
                        {cs.customDueRule?.offsetDays != null && ` · Due +${cs.customDueRule.offsetDays}d`}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await apiClient.removeClientService(cs.id);
                        await load360();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-status-danger-text" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subscribe Service</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubscribeService} className="space-y-3">
                <FormField label="Service Type" required>
                  <select
                    value={subServiceId}
                    onChange={(e) => setSubServiceId(e.target.value)}
                    className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-primary"
                  >
                    {allServices.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.frequency})</option>
                    ))}
                  </select>
                </FormField>
                <div className="grid grid-cols-2 gap-2">
                  <FormField label="Fee (INR)">
                    <Input type="number" value={subFeeAmount} onChange={(e) => setSubFeeAmount(e.target.value)} placeholder="5000" />
                  </FormField>
                  <FormField label="Fee Type">
                    <select
                      value={subFeeType}
                      onChange={(e) => setSubFeeType(e.target.value)}
                      className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-primary"
                    >
                      <option value="recurring">Recurring</option>
                      <option value="fixed">Fixed</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </FormField>
                </div>
                <FormField label="Override Due Offset (Days)">
                  <Input type="number" value={subDueOffset} onChange={(e) => setSubDueOffset(e.target.value)} placeholder="Default from service" />
                </FormField>
                <FormField label="Default Staff">
                  <select
                    value={subStaffId}
                    onChange={(e) => setSubStaffId(e.target.value)}
                    className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-primary"
                  >
                    <option value="">Unassigned</option>
                    {staff.map((s) => (
                      <option key={s.userId} value={s.userId}>{s.name}</option>
                    ))}
                  </select>
                </FormField>
                <Button type="submit" variant="primary" size="sm" className="w-full" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  Add Service Mapping
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CREDENTIALS VAULT */}
      {tab === 'CREDENTIALS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-brand-text" />
                Encrypted Portal Credentials Vault
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {credentials.length === 0 ? (
                <p className="text-xs text-muted py-6 text-center">No portal credentials saved yet.</p>
              ) : (
                credentials.map((c) => {
                  const revealed = revealedMap[c.id];
                  return (
                    <div key={c.id} className="p-3 rounded-xl border border-default bg-surface-sunken/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="brand" size="xs">{c.portalType}</Badge>
                          <span className="text-xs font-bold text-primary">{c.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button size="xs" variant="outline" onClick={() => handleRevealCredential(c.id)}>
                            <Eye className="h-3 w-3 mr-1" /> Reveal
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={async () => {
                              await apiClient.deleteClientCredential(c.id);
                              await load360();
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-status-danger-text" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted">Username: </span>
                          <span className="font-mono text-primary">{c.username}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted">Password: </span>
                          <span className="font-mono text-primary" data-testid={`cred-pass-${c.id}`}>
                            {revealed ?? c.passwordMasked}
                          </span>
                          {revealed && (
                            <button
                              type="button"
                              onClick={() => navigator.clipboard?.writeText(revealed)}
                              className="text-brand-text hover:underline"
                              title="Copy password"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {credAudit.length > 0 && (
                <div className="pt-3 border-t border-default">
                  <div className="text-[11px] font-bold uppercase text-muted mb-2">Recent Vault Audit Trail</div>
                  <div className="space-y-1">
                    {credAudit.slice(0, 5).map((a) => (
                      <div key={a.id} className="text-[11px] text-secondary flex justify-between">
                        <span>{a.action} · {a.payload?.label || ''} ({a.payload?.portalType || ''})</span>
                        <span className="font-mono text-muted">{new Date(a.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Portal Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCredential} className="space-y-3">
                <FormField label="Portal Type">
                  <select
                    value={credPortal}
                    onChange={(e) => setCredPortal(e.target.value)}
                    className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-primary"
                  >
                    <option value="GST">GST Portal</option>
                    <option value="INCOME_TAX">Income Tax (e-Filing)</option>
                    <option value="TRACES">TRACES / TDS</option>
                    <option value="MCA">MCA V3</option>
                    <option value="EPFO">EPFO</option>
                    <option value="ESIC">ESIC</option>
                    <option value="OTHER">Other</option>
                  </select>
                </FormField>
                <FormField label="Label" required>
                  <Input value={credLabel} onChange={(e) => setCredLabel(e.target.value)} placeholder="e.g. GSTN Primary Login" required />
                </FormField>
                <FormField label="Username" required>
                  <Input value={credUser} onChange={(e) => setCredUser(e.target.value)} placeholder="Username / PAN" required />
                </FormField>
                <FormField label="Password (AES-256 Encrypted)" required>
                  <Input type="password" value={credPass} onChange={(e) => setCredPass(e.target.value)} placeholder="••••••••" required />
                </FormField>
                <FormField label="Portal URL">
                  <Input value={credUrl} onChange={(e) => setCredUrl(e.target.value)} placeholder="https://services.gst.gov.in" />
                </FormField>
                <Button type="submit" variant="primary" size="sm" className="w-full" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  Save Encrypted Login
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PROFILE & CUSTOM FIELDS */}
      {tab === 'PROFILE' && data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entity Master &amp; Custom Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField label="Entity Type">
                  <select
                    value={profileForm.entityType}
                    onChange={(e) => setProfileForm({ ...profileForm, entityType: e.target.value })}
                    className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-primary"
                  >
                    <option value="Individual">Individual</option>
                    <option value="HUF">HUF</option>
                    <option value="Proprietorship">Proprietorship</option>
                    <option value="Partnership">Partnership</option>
                    <option value="LLP">LLP</option>
                    <option value="Pvt Ltd">Pvt Ltd</option>
                    <option value="Public Ltd">Public Ltd</option>
                    <option value="Trust">Trust / NGO</option>
                  </select>
                </FormField>
                <FormField label="CIN / LLPIN">
                  <Input value={profileForm.cin} onChange={(e) => setProfileForm({ ...profileForm, cin: e.target.value })} placeholder="U72900MH2020PTC..." />
                </FormField>
                <FormField label="TAN">
                  <Input value={profileForm.tan} onChange={(e) => setProfileForm({ ...profileForm, tan: e.target.value })} placeholder="MUMT12345A" />
                </FormField>
                <FormField label="Incorporation Date">
                  <Input type="date" value={profileForm.incorporationDate} onChange={(e) => setProfileForm({ ...profileForm, incorporationDate: e.target.value })} />
                </FormField>
                <FormField label="Aadhaar (auto-masked)">
                  <Input value={profileForm.aadhaarMasked} onChange={(e) => setProfileForm({ ...profileForm, aadhaarMasked: e.target.value })} placeholder="XXXX-XXXX-1234" />
                </FormField>
                <FormField label="FY Preference">
                  <select
                    value={profileForm.fyPreference}
                    onChange={(e) => setProfileForm({ ...profileForm, fyPreference: e.target.value })}
                    className="w-full rounded-xl border border-default bg-surface px-3 py-2 text-xs text-primary"
                  >
                    <option value="April-March">April - March (India)</option>
                    <option value="Jan-Dec">Jan - Dec</option>
                  </select>
                </FormField>
              </div>
              <FormField label="GSTINs (comma-separated)">
                <Input value={profileForm.gstinsCsv} onChange={(e) => setProfileForm({ ...profileForm, gstinsCsv: e.target.value })} placeholder="27AAACS1234A1Z5" />
              </FormField>
              <FormField label="Registered Address">
                <Input value={profileForm.registeredAddress} onChange={(e) => setProfileForm({ ...profileForm, registeredAddress: e.target.value })} />
              </FormField>

              <label className="flex items-center gap-2 text-xs font-medium text-primary cursor-pointer">
                <input
                  type="checkbox"
                  checked={profileForm.isVip}
                  onChange={(e) => setProfileForm({ ...profileForm, isVip: e.target.checked })}
                />
                Mark as VIP / Priority Client
              </label>

              {(data.customFieldsDef || []).length > 0 && (
                <div className="border-t border-default pt-3 space-y-2">
                  <div className="text-xs font-bold uppercase text-muted">Firm Custom Fields</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.customFieldsDef.map((cf: any) => (
                      <FormField key={cf.id} label={cf.label}>
                        <Input
                          value={String(profileForm.customFields?.[cf.fieldKey] ?? '')}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              customFields: { ...profileForm.customFields, [cf.fieldKey]: e.target.value },
                            })
                          }
                        />
                      </FormField>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" variant="primary" size="sm">Save Client Profile</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* JOBS */}
      {tab === 'JOBS' && data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Jobs &amp; Workflows</CardTitle>
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
              <CardTitle className="text-base">Client Contacts &amp; Signatories</CardTitle>
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
            <CardTitle className="text-base">Timeline &amp; Activity</CardTitle>
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
              <span>Time Tracking, WIP &amp; Engagement Billing</span>
              <Badge variant="info" size="xs">Phase 2 · Coming soon</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-secondary leading-relaxed">
              The underlying <code className="font-mono">practice_time_entries</code> schema is provisioned.
              In Phase 2 (see <code className="font-mono">docs/practice/PRACTICE_PLATFORM_V2_ROADMAP.md</code>),
              proposals, engagement letters, staff timers, WIP billing, and automated reminders will activate here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
