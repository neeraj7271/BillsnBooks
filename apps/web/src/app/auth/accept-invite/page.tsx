'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, Button, Input, FormField, Badge } from '@platform/ui';
import { UserPlus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

function AcceptInviteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [info, setInfo] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiClient.getInviteInfo(token).then((res) => {
      setInfo(res);
      if (res?.name) {
        const parts = String(res.name).split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      }
    }).catch((err: any) => {
      setError(err?.message || 'Invalid or expired invitation.');
    });
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.acceptInvite({ token, firstName, lastName, password });
      if (res?.tokens?.accessToken) {
        localStorage.setItem('antigravity_access_token', res.tokens.accessToken);
        localStorage.setItem('antigravity_refresh_token', res.tokens.refreshToken);
        localStorage.setItem('antigravity_tenant_id', res.user.tenantId);
        localStorage.setItem('antigravity_user_id', res.user.id);
      }
      router.push('/practice');
    } catch (err: any) {
      setError(err?.message || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-sunken p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-brand-primary" />
            <h1 className="text-xl font-bold text-text-primary">Join Firm Workspace</h1>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-status-danger-subtle text-xs text-status-danger-text">
              {error}
            </div>
          )}

          {info && (
            <div className="p-3 rounded-xl bg-surface-muted border border-default text-xs space-y-1">
              <div>Firm: <strong>{info.firmName}</strong></div>
              <div>Email: <strong className="font-mono">{info.email}</strong></div>
              <div>Assigned Role: <Badge variant="brand" size="xs">{info.invitedRole}</Badge></div>
            </div>
          )}

          <form onSubmit={handleAccept} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FormField label="First Name" required>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </FormField>
              <FormField label="Last Name" required>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </FormField>
            </div>
            <FormField label="Create Password" required>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min 8 characters" />
            </FormField>
            <Button type="submit" variant="primary" className="w-full" loading={submitting} disabled={!info}>
              Accept Invite &amp; Join Firm
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-text-muted">Loading invitation...</div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
