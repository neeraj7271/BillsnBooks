'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  FormField,
  Badge,
  QrCode,
} from '@platform/ui';
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
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface InvoiceCustomizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  initialSettings?: Record<string, any>;
  onSaved: () => void;
}

const DEFAULT_TERMS = `1. Goods once sold will not be taken back or exchanged.
2. Interest @ 18% p.a. will be charged on overdue accounts after 30 days.
3. All disputes are subject to registered state jurisdiction only.`;

// Helper to safely optimize and encode uploaded images for crisp A4 print
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

export function InvoiceCustomizerDialog({
  open,
  onOpenChange,
  companyId,
  initialSettings = {},
  onSaved,
}: InvoiceCustomizerDialogProps) {
  const [activeTab, setActiveTab] = useState<'branding' | 'signature' | 'payment_qr' | 'terms'>('branding');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Sync initial settings on open
  useEffect(() => {
    if (!open) return;
    setError(null);

    setLogoUrl(initialSettings['branding.logo_url'] || '');
    setShowSignature(initialSettings['document.show_signature'] !== false);
    setSignatureType(initialSettings['branding.signature_type'] || 'IMAGE');
    setSignatureUrl(initialSettings['branding.signature_url'] || '');
    setDscSignerName(initialSettings['branding.dsc_signer_name'] || '');
    setDscDesignation(initialSettings['branding.dsc_designation'] || 'Authorised Signatory');
    setDscCertDetails(initialSettings['branding.dsc_cert_details'] || 'Class-3 Digital Signature Certificate');
    setSignatoryTitle(initialSettings['document.authorized_signatory_title'] || 'Authorised Signatory');

    setShowQrCode(initialSettings['document.show_qr_code'] !== false);
    setUpiId(initialSettings['document.upi_id'] || 'acme@hdfcbank');

    setTerms(initialSettings['document.terms_and_conditions'] || DEFAULT_TERMS);
  }, [open, initialSettings]);

  // Handle Logo file upload
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
      setError('Failed to process image file');
    }
  };

  // Handle Signature file upload
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates = [
        apiClient.updateCompanySetting(companyId, 'branding.logo_url', logoUrl || null),
        apiClient.updateCompanySetting(companyId, 'document.show_signature', showSignature),
        apiClient.updateCompanySetting(companyId, 'branding.signature_type', signatureType),
        apiClient.updateCompanySetting(companyId, 'branding.signature_url', signatureUrl || null),
        apiClient.updateCompanySetting(companyId, 'branding.dsc_signer_name', dscSignerName || null),
        apiClient.updateCompanySetting(companyId, 'branding.dsc_designation', dscDesignation || null),
        apiClient.updateCompanySetting(companyId, 'branding.dsc_cert_details', dscCertDetails || null),
        apiClient.updateCompanySetting(companyId, 'document.authorized_signatory_title', signatoryTitle || 'Authorised Signatory'),
        apiClient.updateCompanySetting(companyId, 'document.show_qr_code', showQrCode),
        apiClient.updateCompanySetting(companyId, 'document.upi_id', upiId || null),
        apiClient.updateCompanySetting(companyId, 'document.terms_and_conditions', terms),
      ];

      await Promise.all(updates);
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update invoice settings';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const demoUpiUri = `upi://pay?pa=${encodeURIComponent(upiId || 'merchant@upi')}&pn=Tax%20Invoice&am=59000.00&cu=INR&tn=Invoice%20Payment`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Invoice Branding & Output Customizer
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Configure your company logo, signature / DSC stamp, UPI payment QR code, and custom terms & conditions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-medium">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'branding'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            Company Logo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signature')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'signature'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSignature className="h-4 w-4" />
            Signature & DSC
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payment_qr')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'payment_qr'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <QrIcon className="h-4 w-4" />
            Payment QR Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'terms'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            Terms & Conditions
          </button>
        </div>

        {/* Tab 1: Company Logo */}
        {activeTab === 'branding' && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="h-28 w-28 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0 relative group">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Company Logo Preview"
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px]">No Logo</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Company Header Logo
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload a high-resolution logo (transparent PNG or SVG recommended, max 10MB). This logo will appear on all generated invoices and print PDFs.
                </p>

                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                />

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    leftIcon={<Upload className="h-3.5 w-3.5" />}
                  >
                    Upload Logo Image
                  </Button>
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLogoUrl('')}
                      leftIcon={<Trash2 className="h-3.5 w-3.5 text-rose-500" />}
                      className="text-rose-600 dark:text-rose-400"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <FormField label="Or Provide Direct Image URL">
              <Input
                value={logoUrl.startsWith('data:') ? '' : logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://yourcompany.com/assets/logo.png"
                className="text-xs font-mono"
              />
            </FormField>
          </div>
        )}

        {/* Tab 2: Signature & DSC */}
        {activeTab === 'signature' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Print Signature Block
                </div>
                <div className="text-[11px] text-slate-500">
                  Enable or disable the signature / DSC block on invoices.
                </div>
              </div>
              <input
                type="checkbox"
                checked={showSignature}
                onChange={(e) => setShowSignature(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 border-slate-300 cursor-pointer"
              />
            </div>

            {showSignature && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSignatureType('IMAGE')}
                    className={`p-3 rounded-xl border text-left transition ${
                      signatureType === 'IMAGE'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-950 dark:text-blue-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <FileSignature className="h-4 w-4 text-blue-600" />
                      Handwritten Image / Stamp
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Upload transparent PNG of physical signature or company seal stamp.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignatureType('DSC')}
                    className={`p-3 rounded-xl border text-left transition ${
                      signatureType === 'DSC'
                        ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Digital Signature (DSC / e-Sign)
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Statutory Class-3 / eMudhra verified cryptographic signature box.
                    </div>
                  </button>
                </div>

                {signatureType === 'IMAGE' && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-36 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 flex items-center justify-center p-2 shrink-0">
                        {signatureUrl ? (
                          <img
                            src={signatureUrl}
                            alt="Signature Preview"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400">No Signature</span>
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Physical Sign / Stamp Upload
                        </div>
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
                            Choose File
                          </Button>
                          {signatureUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSignatureUrl('')}
                              className="text-rose-500"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {signatureType === 'DSC' && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>DSC Certificate Credentials</span>
                      <Badge variant="success" size="xs">
                        IT Act 2000 Compliant
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FormField label="Signer Full Name">
                        <Input
                          value={dscSignerName}
                          onChange={(e) => setDscSignerName(e.target.value)}
                          placeholder="e.g. Rajesh Kumar"
                          className="text-xs"
                        />
                      </FormField>

                      <FormField label="Signer Designation">
                        <Input
                          value={dscDesignation}
                          onChange={(e) => setDscDesignation(e.target.value)}
                          placeholder="e.g. Managing Director / Partner"
                          className="text-xs"
                        />
                      </FormField>
                    </div>

                    <FormField label="DSC Authority / Serial Reference">
                      <Input
                        value={dscCertDetails}
                        onChange={(e) => setDscCertDetails(e.target.value)}
                        placeholder="e.g. eMudhra Class-3 CA • Valid 2026-2028"
                        className="text-xs"
                      />
                    </FormField>

                    {/* Live DSC Preview Stamp */}
                    <div className="pt-2">
                      <div className="text-[11px] font-semibold text-slate-500 mb-1">
                        DSC Stamp Preview on Invoices:
                      </div>
                      <div className="inline-flex items-center gap-2 p-2 px-3 rounded-lg border border-emerald-600 bg-emerald-50/70 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 text-xs">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold">
                            Digitally Signed by {dscSignerName || 'Authorized Signatory'}
                          </div>
                          <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-mono">
                            {dscDesignation || 'Authorised Signatory'} • {dscCertDetails}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <FormField label="Signatory Block Undertext Label">
                  <Input
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    placeholder="Authorised Signatory"
                    className="text-xs"
                  />
                </FormField>
              </>
            )}
          </div>
        )}

        {/* Tab 3: Payment QR Code */}
        {activeTab === 'payment_qr' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Dynamic UPI Payment QR Code
                </div>
                <div className="text-[11px] text-slate-500">
                  Prints an NPCI-compliant UPI QR code on customer invoices for instant payments via GPay, PhonePe, Paytm, or BHIM.
                </div>
              </div>
              <input
                type="checkbox"
                checked={showQrCode}
                onChange={(e) => setShowQrCode(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 border-slate-300 cursor-pointer"
              />
            </div>

            {showQrCode && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <FormField label="Merchant UPI ID / VPA">
                  <Input
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. acme@hdfcbank or 9876543210@paytm"
                    className="text-xs font-mono"
                  />
                </FormField>

                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="p-2 bg-white rounded-lg shadow-2xs border border-slate-200 shrink-0">
                    <QrCode value={demoUpiUri} size={80} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                      Dynamic Amount & Ref QR
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      When a customer scans this QR code from their phone, their UPI app automatically prefills your VPA (<span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{upiId || 'merchant@upi'}</span>), the exact payable invoice amount, and the invoice reference number.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Terms & Conditions */}
        {activeTab === 'terms' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Statutory Terms & Conditions
                </div>
                <div className="text-[11px] text-slate-500">
                  These terms are printed on the invoice document and statutory declarations.
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

            <textarea
              rows={5}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Enter company terms and conditions..."
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-right text-[10px] text-slate-400">
              {terms.length} / 2000 characters
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Save & Apply to Invoices
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

