'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button, Input, Card, Badge } from '@platform/ui';
import { apiClient } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.login({ email, password });

      if (typeof window !== 'undefined') {
        if (res.user?.tenantId) {
          localStorage.setItem('antigravity_tenant_id', res.user.tenantId);
        }
        if (res.user?.id) {
          localStorage.setItem('antigravity_user_id', res.user.id);
        }
        const fullName = `${res.user?.firstName || ''} ${res.user?.lastName || ''}`.trim() || email;
        localStorage.setItem('antigravity_user_name', fullName);
        localStorage.setItem('antigravity_user_email', res.user?.email || email);
        if (res.tokens?.accessToken) {
          localStorage.setItem('antigravity_access_token', res.tokens.accessToken);
        }
        if (res.tokens?.refreshToken) {
          localStorage.setItem('antigravity_refresh_token', res.tokens.refreshToken);
        }
      }

      window.location.href = '/settings/companies';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas bg-surface flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand via-brand to-brand text-white font-bold shadow-lg shadow-blue-500/25 mb-4">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-primary dark:text-white">
            Sign In to Antigravity
          </h1>
        </div>
        <p className="mt-2 text-sm text-secondary text-muted">
          Enter your registered administrator email to access your books.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="p-8 bg-white bg-surface border border border-strong rounded-2xl shadow-xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-status-danger-subtle bg-status-danger border border-status-danger border-status-danger text-xs font-medium text-status-danger-text text-status-danger-text">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-secondary text-muted">
                Email Address
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted text-muted" />
                <Input
                  required
                  type="email"
                  placeholder="admin@firm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-secondary text-muted">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted text-muted" />
                <Input
                  required
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full mt-6 flex justify-center items-center gap-2"
            >
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-subtle border-strong text-center text-xs text-muted">
            Need to setup a new tenant workspace?{' '}
            <Link href="/auth/signup" className="font-semibold text-brand-text text-brand hover:underline">
              Sign Up
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

