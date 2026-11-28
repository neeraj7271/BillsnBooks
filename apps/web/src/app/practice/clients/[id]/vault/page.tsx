'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@platform/ui';
import { BackButton } from '@/components/back-button';
import { DocumentVaultView } from '../../../documents/document-vault-view';

export default function ClientVaultPage() {
  const params = useParams();
  const clientId = String(params?.id || '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <BackButton variant="link" fallbackUrl={`/practice/clients/${clientId}`} label="Back to client" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-primary">Client Document Vault</h1>
              <Badge variant="brand" size="sm">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Encrypted & Versioned
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Statutory working papers, filed returns, bank statements, and immutable audit trail.
            </p>
          </div>
        </div>
      </div>

      {clientId && <DocumentVaultView clientId={clientId} />}
    </div>
  );
}
