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
      }

      window.location.href = '/settings/companies';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-bold shadow-lg shadow-blue-500/25 mb-4">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Sign In to Antigravity
          </h1>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Enter your registered administrator email to access your books.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-medium text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
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
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
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

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500">
            Need to setup a new tenant workspace?{' '}
            <Link href="/auth/signup" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
              Sign Up
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

