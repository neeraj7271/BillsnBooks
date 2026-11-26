'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button, Badge } from '@platform/ui';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { Step1Upload } from './step1-upload';
import { Step2Mapping } from './step2-mapping';
import { Step3Validation } from './step3-validation';
import { Step4Post } from './step4-post';
import { MissingMastersModal } from './missing-masters-modal';

export default function NewImportWizardPage() {
  const router = useRouter();
  const { activeCompanyId } = useCompany();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Upload
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<string>('SALES_REGISTER');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Batch data
  const [batchData, setBatchData] = useState<any | null>(null);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);

  // Step 2: Mapping
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappingSaving, setMappingSaving] = useState(false);

  // Missing Masters Detection & Modal
  const [scanData, setScanData] = useState<any | null>(null);
  const [missingMastersOpen, setMissingMastersOpen] = useState(false);

  // Step 3: Staged Rows & Resolution
  const [validatedBatch, setValidatedBatch] = useState<any | null>(null);
  const [stagedRows, setStagedRows] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'GREEN' | 'YELLOW' | 'RED'>('ALL');
  const [fixing, setFixing] = useState(false);

  // Step 4: Post
  const [approved, setApproved] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<any | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await apiClient.uploadImportFile(activeCompanyId, file, importType);
      setBatchData(res.batch);
      setDetectedHeaders(res.detectedHeaders || []);
      const initialUiMapping: Record<string, string> = {};
      if (res.recommendedMapping) {
        for (const [canon, hdr] of Object.entries(res.recommendedMapping)) {
          if (hdr) initialUiMapping[hdr as string] = canon;
        }
      }
      setMapping(initialUiMapping);
      setCurrentStep(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'File upload failed';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMapping = async () => {
    if (!batchData?.id) return;
    setMappingSaving(true);
    try {
      const apiMapping: Record<string, string> = {};
      for (const [k, v] of Object.entries(mapping)) {
        if (v) apiMapping[v] = k;
      }
      await apiClient.applyMapping(activeCompanyId, batchData.id, apiMapping);
      const rowsRes = await apiClient.getImportRows(activeCompanyId, batchData.id);
      setValidatedBatch(batchData);
      setStagedRows(rowsRes?.rows || []);

      // Pre-flight scan for missing masters
      try {
        const scan = await apiClient.scanImportMasters(activeCompanyId, batchData.id);
        setScanData(scan);
        if (scan?.hasMissingMasters) {
          setMissingMastersOpen(true);
        }
      } catch (scanErr) {
        console.warn('Pre-flight master scan error:', scanErr);
      }

      setCurrentStep(3);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setMappingSaving(false);
    }
  };

  const handleAutoFix = async () => {
    if (!batchData?.id) return;
    setFixing(true);
    try {
      await apiClient.bulkFixRows(activeCompanyId, batchData.id, {
        targetField: 'matchedLedgerId',
        fixValue: '10000000-0000-4000-8000-000000000005',
      });
      const rowsRes = await apiClient.getImportRows(activeCompanyId, batchData.id);
      setStagedRows(rowsRes?.rows || []);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setFixing(false);
    }
  };

  const handleAutoFixGst = async () => {
    if (!batchData?.id) return;
    setFixing(true);
    try {
      await apiClient.autoFixImportGst(activeCompanyId, batchData.id);
      const rowsRes = await apiClient.getImportRows(activeCompanyId, batchData.id);
      setStagedRows(rowsRes?.rows || []);
    } catch (err: unknown) {
      console.error('Failed to auto-fix GST tax splits:', err);
    } finally {
      setFixing(false);
    }
  };

  const handleMastersResolved = async () => {
    if (!batchData?.id) return;
    try {
      const rowsRes = await apiClient.getImportRows(activeCompanyId, batchData.id);
      setStagedRows(rowsRes?.rows || []);
      const scan = await apiClient.scanImportMasters(activeCompanyId, batchData.id);
      setScanData(scan);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePost = async () => {
    if (!batchData?.id) return;
    setPosting(true);
    try {
      await apiClient.approveBatch(activeCompanyId, batchData.id);
      const res = await apiClient.postBatchToLedger(activeCompanyId, batchData.id);
      setPostResult(res);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const greenCount = stagedRows.filter((r) => (r.validationState || r.validationStatus) === 'GREEN').length;
  const missingMastersCount =
    (scanData?.missingParties?.length || 0) + (scanData?.missingItems?.length || 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon-sm" asChild aria-label="Back to imports">
            <Link href="/imports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-primary dark:text-white">
                Bulk Ingestion Engine
              </h1>
              <Badge variant="brand" size="sm">Step {currentStep} of 4</Badge>
            </div>
            <p className="text-xs text-muted text-muted">
              CSV/Excel bank and invoice import with statutory GST checks and missing master resolution.
            </p>
          </div>
        </div>
      </div>

      {currentStep === 1 && (
        <Step1Upload
          file={file}
          uploading={uploading}
          uploadError={uploadError}
          importType={importType}
          onImportTypeChange={setImportType}
          onFileChange={(e) => {
            if (e.target.files?.[0]) setFile(e.target.files[0]);
          }}
          onUpload={handleUpload}
        />
      )}

      {currentStep === 2 && (
        <Step2Mapping
          detectedHeaders={detectedHeaders}
          mapping={mapping}
          mappingSaving={mappingSaving}
          onMappingChange={(h, f) => setMapping((prev) => ({ ...prev, [h]: f }))}
          onBack={() => setCurrentStep(1)}
          onSaveMapping={handleSaveMapping}
        />
      )}

      {currentStep === 3 && (
        <>
          <Step3Validation
            validatedBatch={validatedBatch}
            stagedRows={stagedRows}
            activeTab={activeTab}
            fixing={fixing}
            missingMastersCount={missingMastersCount}
            onTabChange={setActiveTab}
            onAutoFix={handleAutoFix}
            onAutoFixGst={handleAutoFixGst}
            onOpenMissingMasters={() => setMissingMastersOpen(true)}
            onBack={() => setCurrentStep(2)}
            onProceed={() => setCurrentStep(4)}
          />

          <MissingMastersModal
            open={missingMastersOpen}
            companyId={activeCompanyId}
            batchId={batchData?.id || ''}
            scanData={scanData}
            onOpenChange={setMissingMastersOpen}
            onResolved={handleMastersResolved}
          />
        </>
      )}

      {currentStep === 4 && (
        <Step4Post
          greenCount={greenCount}
          approved={approved}
          posting={posting}
          postResult={postResult}
          onApprovedChange={setApproved}
          onPost={handlePost}
          onBack={() => setCurrentStep(3)}
        />
      )}
    </div>
  );
}
