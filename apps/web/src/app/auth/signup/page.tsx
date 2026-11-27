'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  ArrowRight,
  Briefcase,
  Building,
} from 'lucide-react';
import { Button, Input, Card, Badge } from '@platform/ui';
import { apiClient } from '@/lib/api-client';

export default function SignUpPage() {
  const [accountType, setAccountType] = useState<'CA' | 'BUSINESS' | 'ACCOUNTANT'>('CA');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in your name, email, and password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.register({
        firstName,
        lastName,
        email,
        password,
        accountType,
      });

      if (typeof window !== 'undefined') {
        if (res.user?.tenantId) localStorage.setItem('antigravity_tenant_id', res.user.tenantId);
        if (res.user?.id) localStorage.setItem('antigravity_user_id', res.user.id);
        const fullName = `${res.user?.firstName || firstName} ${res.user?.lastName || lastName}`;
        localStorage.setItem('antigravity_user_name', fullName);
        localStorage.setItem('antigravity_user_email', res.user?.email || email);
        if (res.tokens?.accessToken) localStorage.setItem('antigravity_access_token', res.tokens.accessToken);
        if (res.tokens?.refreshToken) localStorage.setItem('antigravity_refresh_token', res.tokens.refreshToken);
        localStorage.removeItem('antigravity_active_company_id');
      }

      window.location.href = '/settings/companies?welcome=true';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Account creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-inverse font-bold shadow-md mb-4">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-h1 text-primary">Antigravity Books</h1>
          <Badge variant="brand" size="xs">Professional</Badge>
        </div>
        <p className="mt-2 text-body-sm text-secondary">
          Create your practitioner or owner account to manage firms, client entities, and books.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <Card className="p-8">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-status-danger-subtle border border-status-danger text-xs font-medium text-status-danger-text">
              {error}
            </div>
          )}

          <div className="mb-6">
            <span className="text-xs font-semibold text-secondary block mb-2">
              Select Your Profile Role
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'CA' as const, label: 'CA / Practitioner', Icon: Briefcase },
                { key: 'BUSINESS' as const, label: 'Business Owner', Icon: Building },
                { key: 'ACCOUNTANT' as const, label: 'Firm Staff', Icon: User },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAccountType(key)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-colors ${
                    accountType === key
                      ? 'border-focus bg-brand-subtle text-brand-text font-semibold'
                      : 'border-default text-secondary hover:border-strong hover:text-primary'
                  }`}
                >
                  <Icon className="h-4 w-4 mb-1.5" />
                  <span className="text-[11px] leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="signup-fn" className="text-xs font-semibold text-secondary">
                  First Name
                </label>
                <div className="mt-1">
                  <Input
                    id="signup-fn"
                    required
                    placeholder="e.g. Rajesh"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    leftAddon={<User className="h-4 w-4" />}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="signup-ln" className="text-xs font-semibold text-secondary">
                  Last Name
                </label>
                <div className="mt-1">
                  <Input
                    id="signup-ln"
                    required
                    placeholder="e.g. Kothari"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="signup-email" className="text-xs font-semibold text-secondary">
                Email Address
              </label>
              <div className="mt-1">
                <Input
                  id="signup-email"
                  required
                  type="email"
                  placeholder="rajesh@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftAddon={<Mail className="h-4 w-4" />}
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-pw" className="text-xs font-semibold text-secondary">
                Account Password (8+ characters)
              </label>
              <div className="mt-1">
                <Input
                  id="signup-pw"
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
              Create My Account
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-subtle text-center text-xs text-muted">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-brand-text hover:underline">
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
