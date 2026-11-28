'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, Button, Badge, Input } from '@platform/ui';
import { CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

export function ReviewInboxView() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getReviewInbox();
      setJobs(res || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (jobId: string) => {
    await apiClient.approveJobReview(jobId, { notes: notesMap[jobId] || 'Approved in Review Inbox', isFinalSignoff: true });
    setBanner('Job approved & signed off.');
    await loadData();
  };

  const handleReturn = async (jobId: string) => {
    const notes = notesMap[jobId]?.trim();
    if (!notes) {
      setBanner('Please enter rework notes before returning a job.');
      return;
    }
    await apiClient.returnJobForRework(jobId, notes);
    setBanner('Job returned to preparer with rework notes.');
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-brand-primary" />
          Awaiting My Review &amp; Sign-off
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Jobs at gated review stages awaiting maker-checker approval or partner sign-off.
        </p>
      </div>

      {banner && (
        <div className="p-3 rounded-xl bg-status-info-subtle border border-subtle shadow-card text-xs text-text-primary font-semibold">
          {banner}
        </div>
      )}

      <Card>
        <CardContent className="p-5 space-y-3">
          {loading ? (
            <div className="text-xs text-text-muted py-6 text-center">Loading review queue...</div>
          ) : jobs.length === 0 ? (
            <div className="text-xs text-text-muted py-6 text-center">No jobs awaiting review right now.</div>
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="p-4 rounded-xl bg-surface-sunken space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text-primary">{j.title}</span>
                      <Badge variant="warning" size="xs">{j.stage}</Badge>
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      {j.clientName} · Period {j.period} · Due {j.dueDate}
                    </div>
                  </div>
                  <Link href="/practice/jobs" className="text-xs text-brand-text hover:underline">Open in Pipeline →</Link>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="flex-1 min-w-[240px]"
                    value={notesMap[j.id] || ''}
                    onChange={(e) => setNotesMap({ ...notesMap, [j.id]: e.target.value })}
                    placeholder="Review remarks or required rework notes..."
                  />
                  <Button size="sm" variant="outline" onClick={() => handleReturn(j.id)}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Return for Rework
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => handleApprove(j.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve &amp; Sign Off
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
