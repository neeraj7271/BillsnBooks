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
  CheckCircle2,
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

      // Store active session in localStorage
      if (typeof window !== 'undefined') {
        if (res.user?.tenantId) {
          localStorage.setItem('antigravity_tenant_id', res.user.tenantId);
        }
        if (res.user?.id) {
          localStorage.setItem('antigravity_user_id', res.user.id);
        }
        const fullName = `${res.user?.firstName || firstName} ${res.user?.lastName || lastName}`;
        localStorage.setItem('antigravity_user_name', fullName);
        localStorage.setItem('antigravity_user_email', res.user?.email || email);
        if (res.tokens?.accessToken) {
          localStorage.setItem('antigravity_access_token', res.tokens.accessToken);
        }
        if (res.tokens?.refreshToken) {
          localStorage.setItem('antigravity_refresh_token', res.tokens.refreshToken);
        }
        // Clear old demo active company so user starts fresh
        localStorage.removeItem('antigravity_active_company_id');
      }

      // Route directly into the Company & Client Onboarding Directory
      window.location.href = '/settings/companies?welcome=true';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Account creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas bg-surface flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand via-brand to-brand text-white font-bold shadow-lg shadow-blue-500/25 mb-4">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-primary">
            Antigravity Books
          </h1>
          <Badge variant="brand" size="xs">Professional Edition</Badge>
        </div>
        <p className="mt-2 text-sm text-secondary text-muted">
          Create your practitioner or owner account. Manage all your firms, client entities, and companies from one central dashboard.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <Card className="p-8 bg-white bg-surface border border border-strong rounded-2xl shadow-xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-status-danger-subtle bg-status-danger border border-status-danger border-status-danger text-xs font-medium text-status-danger-text text-status-danger-text">
              {error}
            </div>
          )}

          {/* Account Profile Persona Selector */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-secondary text-muted block mb-2">
              Select Your Profile Role:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAccountType('CA')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  accountType === 'CA'
                    ? 'border-focus bg-brand-subtle/50 bg-brand/30 text-brand-text text-brand font-bold'
                    : 'border border-strong text-secondary text-muted hover:border hover:border-strong'
                }`}
              >
                <Briefcase className="h-4 w-4 mb-1.5" />
                <span className="text-[11px] leading-tight">CA / Tax Practitioner</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountType('BUSINESS')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  accountType === 'BUSINESS'
                    ? 'border-focus bg-brand-subtle/50 bg-brand/30 text-brand-text text-brand font-bold'
                    : 'border border-strong text-secondary text-muted hover:border hover:border-strong'
                }`}
              >
                <Building className="h-4 w-4 mb-1.5" />
                <span className="text-[11px] leading-tight">Business Owner</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountType('ACCOUNTANT')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                  accountType === 'ACCOUNTANT'
                    ? 'border-focus bg-brand-subtle/50 bg-brand/30 text-brand-text text-brand font-bold'
                    : 'border border-strong text-secondary text-muted hover:border hover:border-strong'
                }`}
              >
                <User className="h-4 w-4 mb-1.5" />
                <span className="text-[11px] leading-tight">Accountant / Firm Staff</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Person's First and Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-secondary text-muted">
                  First Name
                </label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted text-muted" />
                  <Input
                    required
                    placeholder="e.g. Rajesh"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-secondary text-muted">
                  Last Name
                </label>
                <Input
                  required
                  placeholder="e.g. Kothari"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="text-xs font-semibold text-secondary text-muted">
                Email Address
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted text-muted" />
                <Input
                  required
                  type="email"
                  placeholder="rajesh@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-secondary text-muted">
                Account Password (8+ characters)
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
              <span>Create My Account</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-subtle border-strong text-center text-xs text-muted">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-brand-text text-brand hover:underline">
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
