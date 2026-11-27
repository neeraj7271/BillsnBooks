import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Switch } from '@platform/ui';
import { CheckCircle2, ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';

interface Step4PostProps {
  greenCount: number;
  approved: boolean;
  posting: boolean;
  postResult: any | null;
  onApprovedChange: (checked: boolean) => void;
  onPost: () => void;
  onBack: () => void;
}

export function Step4Post({
  greenCount,
  approved,
  posting,
  postResult,
  onApprovedChange,
  onPost,
  onBack,
}: Step4PostProps) {
  if (postResult) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-status-success-subtle text-status-success-text flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-primary">Batch Ingestion Complete</h2>
          <p className="text-xs text-muted max-w-md mx-auto">
            Successfully posted {postResult.postedCount || greenCount} verified vouchers directly to the canonical general ledger.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/vouchers">View General Ledger</Link>
            </Button>
            <Button variant="primary" size="sm" asChild>
              <Link href="/imports">Back to Imports</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4: Statutory Maker-Checker Commitment</CardTitle>
        <CardDescription>
          Final authorization before creating immutable double-entry ledger vouchers.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="p-4 rounded-xl bg-brand-subtle border border-default flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-brand-text shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-primary">
              Double-Entry Immutability Guarantee
            </div>
            <p className="text-secondary">
              Posting will generate sequential voucher numbers and update general ledger balances for {greenCount} clean entries.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-default">
          <Switch
            id="maker-checker-confirm"
            checked={approved}
            onCheckedChange={onApprovedChange}
            label="I confirm that these transactions have been reviewed and comply with statutory GST guidelines."
            description="Audit trail will log your user identity and timestamp as maker."
          />
        </div>
      </CardContent>

      <CardFooter className="justify-between">
        <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
          Back to Validation
        </Button>
        <Button
          variant="primary"
          size="md"
          disabled={!approved}
          loading={posting}
          onClick={onPost}
          leftIcon={<CheckCircle2 className="h-4 w-4" />}
        >
          Post {greenCount} Vouchers to Ledger
        </Button>
      </CardFooter>
    </Card>
  );
}

