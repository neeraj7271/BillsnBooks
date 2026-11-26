'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sliders,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  QrCode as QrIcon,
  FileSignature,
  ShieldCheck,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Building2,
  Check,
} from 'lucide-react';
import {
  Button,
  Input,
  FormField,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  QrCode,
  LoadingState,
} from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';

const DEFAULT_TERMS = `1. Goods once sold will not be taken back or exchanged.
2. Interest @ 18% p.a. will be charged on overdue accounts after 30 days.
3. All disputes are subject to registered state jurisdiction only.`;

function processImageFile(file: File, maxDim = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const format = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
        resolve(canvas.toDataURL(format, 0.92));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function InvoiceBrandingSettingsPage() {
  const { activeCompanyId } = useCompany();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Logo State
  const [logoUrl, setLogoUrl] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Signature & DSC State
  const [showSignature, setShowSignature] = useState<boolean>(true);
  const [signatureType, setSignatureType] = useState<'IMAGE' | 'DSC'>('IMAGE');
  const [signatureUrl, setSignatureUrl] = useState<string>('');
  const [dscSignerName, setDscSignerName] = useState<string>('');
  const [dscDesignation, setDscDesignation] = useState<string>('Authorised Signatory');
  const [dscCertDetails, setDscCertDetails] = useState<string>('Class-3 Digital Signature Certificate');
  const [signatoryTitle, setSignatoryTitle] = useState<string>('Authorised Signatory');
  const signInputRef = useRef<HTMLInputElement>(null);

  // Payment QR State
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [upiId, setUpiId] = useState<string>('');

  // Terms State
  const [terms, setTerms] = useState<string>(DEFAULT_TERMS);

  useEffect(() => {
    loadSettings();
  }, [activeCompanyId]);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await apiClient.getCompanySettings(activeCompanyId);
      setLogoUrl(s['branding.logo_url'] || '');
      setShowSignature(s['document.show_signature'] !== false);
      setSignatureType(s['branding.signature_type'] || 'IMAGE');
      setSignatureUrl(s['branding.signature_url'] || '');
      setDscSignerName(s['branding.dsc_signer_name'] || '');
      setDscDesignation(s['branding.dsc_designation'] || 'Authorised Signatory');
      setDscCertDetails(s['branding.dsc_cert_details'] || 'Class-3 Digital Signature Certificate');
      setSignatoryTitle(s['document.authorized_signatory_title'] || 'Authorised Signatory');

      setShowQrCode(s['document.show_qr_code'] !== false);
      setUpiId(s['document.upi_id'] || 'acme@hdfcbank');

      setTerms(s['document.terms_and_conditions'] || DEFAULT_TERMS);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load company settings';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Logo file size must be less than 10 MB');
      return;
    }

    try {
      setError(null);
      const dataUri = await processImageFile(file, 1200);
      setLogoUrl(dataUri);
    } catch {
      setError('Failed to process logo image file');
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Signature image size must be less than 10 MB');
      return;
    }

    try {
      setError(null);
      const dataUri = await processImageFile(file, 800);
      setSignatureUrl(dataUri);
    } catch {
      setError('Failed to process signature image');
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    setSavedSuccess(false);
    try {
      const updates = [
        apiClient.updateCompanySetting(activeCompanyId, 'branding.logo_url', logoUrl || null),
        apiClient.updateCompanySetting(activeCompanyId, 'document.show_signature', showSignature),
        apiClient.updateCompanySetting(activeCompanyId, 'branding.signature_type', signatureType),
        apiClient.updateCompanySetting(activeCompanyId, 'branding.signature_url', signatureUrl || null),
        apiClient.updateCompanySetting(activeCompanyId, 'branding.dsc_signer_name', dscSignerName || null),
        apiClient.updateCompanySetting(activeCompanyId, 'branding.dsc_designation', dscDesignation || null),
        apiClient.updateCompanySetting(activeCompanyId, 'branding.dsc_cert_details', dscCertDetails || null),
        apiClient.updateCompanySetting(activeCompanyId, 'document.authorized_signatory_title', signatoryTitle || 'Authorised Signatory'),
        apiClient.updateCompanySetting(activeCompanyId, 'document.show_qr_code', showQrCode),
        apiClient.updateCompanySetting(activeCompanyId, 'document.upi_id', upiId || null),
        apiClient.updateCompanySetting(activeCompanyId, 'document.terms_and_conditions', terms),
      ];

      await Promise.all(updates);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const demoUpiUri = `upi://pay?pa=${encodeURIComponent(upiId || 'merchant@upi')}&pn=Tax%20Invoice&am=59000.00&cu=INR&tn=Invoice%20Payment`;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16 pt-4">
        <LoadingState variant="form" rows={8} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            aria-label="Back to Invoices"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-default bg-surface text-secondary hover:text-primary transition shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-primary flex items-center gap-2">
              <span>Invoice Branding & Print Settings</span>
              <Badge variant="info" size="xs">
                Statutory Config
              </Badge>
            </h1>
            <p className="text-xs text-secondary">
              Configure company logos, signature & DSC seals, UPI QR codes, and custom terms & conditions for generated invoices.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs font-semibold text-status-success-text flex items-center gap-1">
              <Check className="h-4 w-4" />
              Settings Saved
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAll}
            loading={saving}
            className="bg-brand hover:bg-brand-hover text-inverse font-semibold shadow-xs"
          >
            Save All Settings
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-status-danger-subtle border border-default text-xs text-status-danger-text font-medium">
          {error}
        </div>
      )}

      {/* 1. Company Logo Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-status-info-subtle border border-default text-status-info-text">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold">Company Logo</CardTitle>
              <CardDescription className="text-xs">
                Printed on invoice headers, credit notes, and customer statements.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="h-24 w-28 rounded-xl border-2 border-dashed border-strong bg-surface-sunken flex items-center justify-center p-2 shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-[10px] text-muted">No Logo</span>
              )}
            </div>

            <div className="space-y-2 flex-1">
              <p className="text-xs text-secondary leading-relaxed">
                Upload a transparent PNG, SVG, or high-res JPG (up to 2MB).
              </p>
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoUpload}
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  leftIcon={<Upload className="h-3.5 w-3.5" />}
                >
                  Upload Logo File
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLogoUrl('')}
                    leftIcon={<Trash2 className="h-3.5 w-3.5 text-status-danger-text" />}
                    className="text-status-danger-text"
                  >
                    Remove Logo
                  </Button>
                )}
              </div>
            </div>
          </div>

          <FormField label="Or Enter Logo Web URL">
            <Input
              value={logoUrl.startsWith('data:') ? '' : logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://acme.com/logo.png"
              className="text-xs font-mono"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* 2. Signature & DSC Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand-subtle border border-default text-brand-text">
                <FileSignature className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Authorized Signatory & DSC</CardTitle>
                <CardDescription className="text-xs">
                  Upload handwritten signatures or configure statutory Class-3 Digital Signature Certificate (DSC) e-Sign.
                </CardDescription>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-primary">
              <input
                type="checkbox"
                checked={showSignature}
                onChange={(e) => setShowSignature(e.target.checked)}
                className="h-4 w-4 rounded text-brand-text"
              />
              <span>Enable on Invoices</span>
            </label>
          </div>
        </CardHeader>

        {showSignature && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSignatureType('IMAGE')}
                className={`p-3 rounded-xl border text-left transition ${
                  signatureType === 'IMAGE'
                    ? 'border-focus bg-brand-subtle text-primary'
                    : 'border-default hover:bg-surface-sunken'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <FileSignature className="h-4 w-4 text-brand-text" />
                  Physical Handwritten Image / Stamp
                </div>
                <div className="text-[10px] text-secondary mt-0.5">
                  Upload scanned signature or official seal stamp.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSignatureType('DSC')}
                className={`p-3 rounded-xl border text-left transition ${
                  signatureType === 'DSC'
                    ? 'border-status-success bg-status-success-subtle text-primary'
                    : 'border-default hover:bg-surface-sunken'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-status-success-text" />
                  Digital Signature Certificate (DSC)
                </div>
                <div className="text-[10px] text-secondary mt-0.5">
                  Statutory cryptographic verification block (IT Act 2000).
                </div>
              </button>
            </div>

            {signatureType === 'IMAGE' && (
              <div className="flex items-center gap-4 p-3 rounded-xl border border-default bg-surface-sunken">
                <div className="h-16 w-32 rounded border border-strong bg-surface flex items-center justify-center p-1.5 shrink-0">
                  {signatureUrl ? (
                    <img
                      src={signatureUrl}
                      alt="Signature"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-muted">No Image</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <input
                    type="file"
                    ref={signInputRef}
                    onChange={handleSignatureUpload}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => signInputRef.current?.click()}
                      leftIcon={<Upload className="h-3.5 w-3.5" />}
                    >
                      Upload Signature Image
                    </Button>
                    {signatureUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSignatureUrl('')}
                        className="text-status-danger-text"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {signatureType === 'DSC' && (
              <div className="space-y-3 p-3 rounded-xl border border-default bg-surface-sunken">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Certificate Signer Full Name">
                    <Input
                      value={dscSignerName}
                      onChange={(e) => setDscSignerName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="text-xs"
                    />
                  </FormField>
                  <FormField label="Signer Official Designation">
                    <Input
                      value={dscDesignation}
                      onChange={(e) => setDscDesignation(e.target.value)}
                      placeholder="e.g. Managing Director / Partner"
                      className="text-xs"
                    />
                  </FormField>
                </div>

                <FormField label="Certificate Authority & Serial Reference">
                  <Input
                    value={dscCertDetails}
                    onChange={(e) => setDscCertDetails(e.target.value)}
                    placeholder="e.g. eMudhra Class 3 CA • Valid 2026-2028"
                    className="text-xs"
                  />
                </FormField>

                <div className="pt-1">
                  <div className="text-[11px] font-semibold text-secondary mb-1">
                    Invoice DSC Verification Stamp Preview:
                  </div>
                  <div className="inline-flex items-center gap-2 p-2 px-3 rounded-lg border border-status-success bg-status-success-subtle text-status-success-text text-xs">
                    <CheckCircle2 className="h-4 w-4 text-status-success-text shrink-0" />
                    <div>
                      <div className="font-bold">
                        Digitally Signed by {dscSignerName || 'Authorized Signatory'}
                      </div>
                      <div className="text-[10px] text-status-success-text font-mono">
                        {dscDesignation || 'Authorised Signatory'} • {dscCertDetails}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <FormField label="Signatory Undertext Title">
              <Input
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                placeholder="Authorised Signatory"
                className="text-xs"
              />
            </FormField>
          </CardContent>
        )}
      </Card>

      {/* 3. Payment QR Code Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-status-success-subtle border border-default text-status-success-text">
                <QrIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Dynamic UPI Payment QR Code</CardTitle>
                <CardDescription className="text-xs">
                  Generate instant-scan UPI QR codes with prefilled invoice amounts and invoice numbers.
                </CardDescription>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-primary">
              <input
                type="checkbox"
                checked={showQrCode}
                onChange={(e) => setShowQrCode(e.target.checked)}
                className="h-4 w-4 rounded text-brand-text"
              />
              <span>Enable UPI QR</span>
            </label>
          </div>
        </CardHeader>

        {showQrCode && (
          <CardContent className="space-y-4">
            <FormField label="Merchant UPI ID / Virtual Payment Address (VPA)">
              <Input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. acme@hdfcbank or 9876543210@paytm"
                className="text-xs font-mono"
              />
            </FormField>

            <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-sunken border border-default">
              <div className="p-2 bg-white rounded-lg shadow-2xs border border-default shrink-0">
                <QrCode value={demoUpiUri} size={84} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand-text" />
                  Dynamic Invoice-Linked QR Code
                </div>
                <p className="text-[11px] text-secondary leading-relaxed">
                  When customers scan this code using Google Pay, PhonePe, Paytm, or BHIM, the app automatically fills your UPI ID, recipient name, exact invoice total, and invoice number.
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 4. Terms & Conditions Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-status-warning-subtle border border-default text-status-warning-text">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Company Terms & Conditions</CardTitle>
                <CardDescription className="text-xs">
                  Statutory terms printed at the bottom of tax invoices and bills of supply.
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTerms(DEFAULT_TERMS)}
              leftIcon={<RotateCcw className="h-3 w-3" />}
              className="text-[11px] h-7"
            >
              Reset Default
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            rows={5}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Enter custom terms and conditions..."
            className="w-full text-xs font-mono p-3 rounded-xl border border-default bg-surface text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring"
          />
          <div className="text-right text-[10px] text-muted">
            {terms.length} / 2000 characters
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save Bar */}
      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          size="md"
          onClick={handleSaveAll}
          loading={saving}
          className="bg-brand hover:bg-brand-hover text-inverse font-semibold shadow-xs px-6"
        >
          Save All Settings
        </Button>
      </div>
    </div>
  );
}

