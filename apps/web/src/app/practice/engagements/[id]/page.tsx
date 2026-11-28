'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, Button, Badge, Input, FormField } from '@platform/ui';
import { PenTool, CheckCircle2, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { BackButton } from '@/components/back-button';

export default function EngagementESignPage() {
  const params = useParams();
  const engagementId = String(params?.id || '');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [engagement, setEngagement] = useState<any>(null);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [signing, setSigning] = useState(false);
  const [provisionResult, setProvisionResult] = useState<any>(null);

  const loadData = async () => {
    if (!engagementId) return;
    const res = await apiClient.getEngagement(engagementId);
    setEngagement(res);
  };

  useEffect(() => {
    loadData();
  }, [engagementId]);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const handleClientSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim() || !consent) return;
    setSigning(true);
    try {
      const signatureDataUrl = canvasRef.current?.toDataURL('image/png');
      await apiClient.clientSignEngagement(engagementId, {
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        consentAccepted: consent,
        signatureDataUrl,
      });
      await loadData();
    } finally {
      setSigning(false);
    }
  };

  const handleFirmCountersign = async () => {
    setSigning(true);
    try {
      const res = await apiClient.firmCountersignEngagement(engagementId);
      setProvisionResult(res);
      await loadData();
    } finally {
      setSigning(false);
    }
  };

  if (!engagement) {
    return <div className="p-8 text-center text-sm text-text-muted">Loading engagement letter...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <BackButton variant="link" fallbackUrl="/practice/proposals" label="Back to proposals" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text-primary">{engagement.title}</h1>
              <Badge variant={engagement.status === 'ACTIVE' ? 'success' : engagement.status === 'SIGNED' ? 'warning' : 'info'}>
                {engagement.status}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary">
              SHA-256: <span className="font-mono">{engagement.documentSha256 || 'Pending'}</span>
            </p>
          </div>
        </div>
        {engagement.status === 'SIGNED' && (
          <Button variant="primary" size="sm" loading={signing} onClick={handleFirmCountersign}>
            <ShieldCheck className="h-4 w-4 mr-1.5" /> Firm Counter-Sign &amp; Activate Jobs
          </Button>
        )}
      </div>

      {provisionResult && (
        <div className="p-4 rounded-xl bg-status-success-subtle border border-subtle shadow-card text-xs text-status-success-text font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Engagement Activated! Auto-created {provisionResult.servicesCreated} client service subscription(s) and spawned {provisionResult.jobsSpawned} job(s).
          </span>
          <Link href="/practice/jobs" className="underline">View Jobs Pipeline →</Link>
        </div>
      )}

      <Card>
        <CardContent className="p-6 prose prose-sm max-w-none text-text-primary">
          <div dangerouslySetInnerHTML={{ __html: engagement.letterBody || '' }} />
        </CardContent>
      </Card>

      {engagement.status !== 'ACTIVE' && !engagement.signedByClientAt && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={handleClientSign} className="space-y-4">
              <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <PenTool className="h-4 w-4 text-brand-primary" />
                Client Electronic Signature
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Authorised Signatory Name" required>
                  <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Full Legal Name" required />
                </FormField>
                <FormField label="Signer Email">
                  <Input type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="director@client.in" />
                </FormField>
              </div>
              <div>
                <div className="text-xs font-medium text-text-secondary mb-1">Draw Signature (Optional)</div>
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={110}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  className="border border-default rounded-xl bg-surface cursor-crosshair"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
                I agree to sign this Engagement Letter electronically and accept the scope &amp; fee schedule.
              </label>
              <Button type="submit" variant="primary" loading={signing}>
                Sign Engagement Letter
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {engagement.signedByClientAt && (
        <Card>
          <CardContent className="p-4 text-xs space-y-1 bg-surface-muted">
            <div className="font-semibold text-text-primary">e-Signature Audit Certificate</div>
            <div>Client Signer: <strong>{engagement.signedByClientName}</strong> ({engagement.signedByClientEmail || '—'})</div>
            <div>Signed At: {new Date(engagement.signedByClientAt).toLocaleString()} · IP: {engagement.signedByClientIp}</div>
            {engagement.signedByFirmAt && (
              <div>Firm Counter-signed At: {new Date(engagement.signedByFirmAt).toLocaleString()}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
