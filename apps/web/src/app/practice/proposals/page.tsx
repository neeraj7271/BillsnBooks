'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, Button, Badge } from '@platform/ui';
import { Plus, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export default function ProposalsListPage() {
  const router = useRouter();
  const [proposals, setProposals] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, e] = await Promise.all([
        apiClient.listProposals(),
        apiClient.listEngagements(),
      ]);
      setProposals(p || []);
      setEngagements(e || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownloadPdf = async (id: string) => {
    const blob = await apiClient.getProposalPdfBlob(id);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleConvertToEngagement = async (id: string) => {
    setConvertingId(id);
    try {
      const eng = await apiClient.convertProposalToEngagement(id);
      router.push(`/practice/engagements/${eng.id}`);
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Proposals &amp; Engagements</h1>
          <p className="text-sm text-text-secondary mt-1">
            Price firm services, generate branded proposal PDFs, and convert accepted proposals into e-signed engagement letters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/practice/settings/engagement-templates">
            <Button variant="outline" size="sm">Engagement Templates</Button>
          </Link>
          <Link href="/practice/proposals/new">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Proposal
            </Button>
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Proposals Pipeline</h2>
        {loading ? (
          <div className="text-xs text-text-muted py-6 text-center">Loading proposals...</div>
        ) : proposals.length === 0 ? (
          <div className="text-xs text-text-muted py-6 text-center rounded-xl bg-surface-sunken p-6">No proposals yet. Click New Proposal to create one.</div>
        ) : (
          <div className="space-y-2.5">
            {proposals.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-subtle bg-surface shadow-card hover:shadow-card-hover transition-shadow">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">{p.clientName}</span>
                    <Badge variant={p.status === 'ACCEPTED' ? 'success' : p.status === 'SENT' ? 'info' : 'neutral'}>
                      {p.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    {p.lines?.length || 0} service(s) · Subtotal ₹{Number(p.totalValue).toLocaleString('en-IN')} + GST ₹{Number(p.gstAmount).toLocaleString('en-IN')} · Valid until {p.validUntil}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleDownloadPdf(p.id)}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> Generate PDF
                  </Button>
                  {p.status !== 'ACCEPTED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await apiClient.updateProposalStatus(p.id, 'ACCEPTED');
                        await loadData();
                      }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Accepted
                    </Button>
                  )}
                  {p.clientId && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={convertingId === p.id}
                      onClick={() => handleConvertToEngagement(p.id)}
                    >
                      Convert to Engagement <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Engagement Letters &amp; e-Sign</h2>
        {engagements.length === 0 ? (
          <div className="text-xs text-text-muted py-4 text-center rounded-xl bg-surface-sunken p-6">No engagement letters generated yet.</div>
        ) : (
          <div className="space-y-2.5">
            {engagements.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-subtle bg-surface shadow-card hover:shadow-card-hover transition-shadow">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">{e.title}</span>
                    <Badge variant={e.status === 'ACTIVE' ? 'success' : e.status === 'SIGNED' ? 'warning' : 'info'}>
                      {e.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    Start: {e.startDate} · {(e.scopeOfServices || []).length} scoped service(s)
                    {e.signedByClientName && ` · Signed by ${e.signedByClientName}`}
                  </div>
                </div>
                <Link href={`/practice/engagements/${e.id}`}>
                  <Button size="sm" variant="primary">Open &amp; e-Sign</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
