'use client';
import { logger } from '@/lib/logger';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@platform/ui';
import { BackButton } from '@/components/back-button';
import { apiClient } from '@/lib/api-client';
import { useCompany } from '@/lib/company-context';
import { Step1Upload } from './step1-upload';
import { Step2Mapping } from './step2-mapping';

export default function NewImportWizardPage() {
  const router = useRouter();
  const { activeCompanyId } = useCompany();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Upload
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<string>('SALES_REGISTER');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Batch data & Step 2: Mapping
  const [batchData, setBatchData] = useState<any | null>(null);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappingSaving, setMappingSaving] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    if (!activeCompanyId) {
      setUploadError('No active company selected — pick a company first.');
      return;
    }
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
      logger.error('Import upload failed:', err);
      const msg = err instanceof Error ? err.message : 'File upload failed';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMapping = async () => {
    if (!batchData?.id) return;
    setMappingSaving(true);
    setMappingError(null);
    try {
      const apiMapping: Record<string, string> = {};
      for (const [k, v] of Object.entries(mapping)) {
        if (v) apiMapping[v] = k;
      }
      await apiClient.applyMapping(activeCompanyId, batchData.id, apiMapping);
      router.push(`/imports/${batchData.id}/review`);
    } catch (err: unknown) {
      logger.error('Failed to apply column mapping:', err);
      setMappingError(err instanceof Error ? err.message : 'Failed to apply column mapping');
    } finally {
      setMappingSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <BackButton variant="link" fallbackUrl="/imports" label="Back to imports" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-primary">
                Bulk Ingestion Engine
              </h1>
              <Badge variant="brand" size="sm">Step {currentStep} of 2</Badge>
            </div>
            <p className="text-xs text-muted">
              Upload your spreadsheet and map columns, then review exceptions and post in the Batch Resolution screen.
            </p>
          </div>
        </div>
      </div>

      {mappingError && currentStep === 2 && (
        <div role="alert" className="p-3 rounded-xl bg-status-danger-subtle border border-status-danger text-xs text-status-danger-text font-medium">
          {mappingError}
        </div>
      )}

      {currentStep === 1 && (
        <Step1Upload
          activeCompanyId={activeCompanyId}
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
    </div>
  );
}
