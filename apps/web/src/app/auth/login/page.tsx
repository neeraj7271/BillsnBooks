'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button, Input, Card } from '@platform/ui';
import { apiClient } from '@/lib/api-client';

export default function LoginPage() {
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
        if (res.user?.tenantId) localStorage.setItem('antigravity_tenant_id', res.user.tenantId);
        if (res.user?.id) localStorage.setItem('antigravity_user_id', res.user.id);
        const fullName = `${res.user?.firstName || ''} ${res.user?.lastName || ''}`.trim() || email;
        localStorage.setItem('antigravity_user_name', fullName);
        localStorage.setItem('antigravity_user_email', res.user?.email || email);
        if (res.tokens?.accessToken) localStorage.setItem('antigravity_access_token', res.tokens.accessToken);
        if (res.tokens?.refreshToken) localStorage.setItem('antigravity_refresh_token', res.tokens.refreshToken);
      }

      window.location.href = '/settings/companies';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-inverse font-bold shadow-md mb-4">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-h1 text-primary">Sign In to Antigravity</h1>
        <p className="mt-2 text-body-sm text-secondary">
          Enter your registered administrator email to access your books.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="p-8">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-status-danger-subtle border border-status-danger text-xs font-medium text-status-danger-text">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="text-xs font-semibold text-secondary">
                Email Address
              </label>
              <div className="mt-1">
                <Input
                  id="login-email"
                  required
                  type="email"
                  placeholder="admin@firm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftAddon={<Mail className="h-4 w-4" />}
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="text-xs font-semibold text-secondary">
                Password
              </label>
              <div className="mt-1">
                <Input
                  id="login-password"
                  required
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftAddon={<Lock className="h-4 w-4" />}
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="w-full mt-6"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-subtle text-center text-xs text-muted">
            Need to setup a new tenant workspace?{' '}
            <Link href="/auth/signup" className="font-semibold text-brand-text hover:underline">
              Sign Up
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
