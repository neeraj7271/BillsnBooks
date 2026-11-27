import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge, DataTable, ColumnDef } from '@platform/ui';
import { ArrowLeft, RotateCw, Sparkles, Users } from 'lucide-react';

interface Step3ValidationProps {
  validatedBatch: any;
  stagedRows: any[];
  activeTab: 'ALL' | 'GREEN' | 'YELLOW' | 'RED';
  fixing: boolean;
  missingMastersCount?: number;
  onTabChange: (tab: 'ALL' | 'GREEN' | 'YELLOW' | 'RED') => void;
  onAutoFix: () => void;
  onAutoFixGst?: () => void;
  onOpenMissingMasters?: () => void;
  onBack: () => void;
  onProceed: () => void;
}

export function Step3Validation({
  validatedBatch,
  stagedRows,
  activeTab,
  fixing,
  missingMastersCount = 0,
  onTabChange,
  onAutoFix,
  onAutoFixGst,
  onOpenMissingMasters,
  onBack,
  onProceed,
}: Step3ValidationProps) {
  const getStatus = (r: any) => r.validationState || r.validationStatus || 'GREEN';

  const filteredRows = stagedRows.filter((r) => {
    if (activeTab === 'ALL') return true;
    return getStatus(r) === activeTab;
  });

  const greenCount = stagedRows.filter((r) => getStatus(r) === 'GREEN').length;
  const yellowCount = stagedRows.filter((r) => getStatus(r) === 'YELLOW').length;
  const redCount = stagedRows.filter((r) => getStatus(r) === 'RED').length;

  const validationColumns: ColumnDef<any>[] = [
    {
      key: 'index',
      header: '#',
      width: '48px',
      cell: (_r, idx) => <span className="text-muted">{idx + 1}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      cell: (r) => (
        <Badge
          variant={getStatus(r) === 'GREEN' ? 'success' : getStatus(r) === 'YELLOW' ? 'warning' : 'danger'}
          size="xs"
          dot
        >
          {getStatus(r)}
        </Badge>
      ),
    },
    {
      key: 'ref',
      header: 'Invoice / Ref',
      cell: (r) => (
        <span className="font-mono font-semibold">
          {r.parsedData?.voucherNumber || r.parsedData?.invoiceNumber || '—'}
        </span>
      ),
    },
    {
      key: 'party',
      header: 'Party Name',
      cell: (r) => <span className="font-medium">{r.parsedData?.partyName || '—'}</span>,
    },
    {
      key: 'gstin',
      header: 'GSTIN',
      cell: (r) => (
        <span className="font-mono text-[11px]">
          {r.parsedData?.partyGstin || r.parsedData?.gstin || '—'}
        </span>
      ),
    },
    {
      key: 'errors',
      header: 'Errors / Rule Violations',
      cell: (r) => (
        <div className="text-[11px] text-muted space-y-0.5">
          {(r.errorReasons || r.errors || []).map((err: any, eIdx: number) => (
            <span key={eIdx} className="block text-status-danger-text font-medium">
              • {typeof err === 'string' ? err : err.message || JSON.stringify(err)}
            </span>
          ))}
          {(!r.errorReasons || r.errorReasons.length === 0) && (!r.errors || r.errors.length === 0) && (
            <span className="text-status-success-text">Passed audit</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Step 3: Traffic Light Rule & GST Validation</CardTitle>
            <CardDescription>
              Review staged rows evaluated against GSTIN checksums, Place of Supply rules, and double-entry arithmetic.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {missingMastersCount > 0 && onOpenMissingMasters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenMissingMasters}
                leftIcon={<Users className="h-3.5 w-3.5 text-brand-text" />}
              >
                Missing Masters ({missingMastersCount})
              </Button>
            )}

            {onAutoFixGst && (
              <Button
                variant="outline"
                size="sm"
                loading={fixing}
                onClick={onAutoFixGst}
                leftIcon={<Sparkles className="h-3.5 w-3.5 text-status-info-text" />}
              >
                Auto-Fix Tax Splits
              </Button>
            )}

            {yellowCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                loading={fixing}
                onClick={onAutoFix}
                leftIcon={<RotateCw className="h-3.5 w-3.5 text-status-warning-text" />}
              >
                Auto-Resolve Ambiguities ({yellowCount})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-sunken rounded-xl w-fit">
          <button
            onClick={() => onTabChange('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${activeTab === 'ALL' ? 'bg-surface text-primary shadow-xs' : 'text-muted'}`}
          >
            All Rows ({stagedRows.length})
          </button>
          <button
            onClick={() => onTabChange('GREEN')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${activeTab === 'GREEN' ? 'bg-surface text-status-success-text shadow-xs' : 'text-muted'}`}
          >
            <span className="h-2 w-2 rounded-full bg-status-success" />
            Clean ({greenCount})
          </button>
          <button
            onClick={() => onTabChange('YELLOW')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${activeTab === 'YELLOW' ? 'bg-surface text-status-warning-text shadow-xs' : 'text-muted'}`}
          >
            <span className="h-2 w-2 rounded-full bg-status-warning" />
            Warning ({yellowCount})
          </button>
          <button
            onClick={() => onTabChange('RED')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${activeTab === 'RED' ? 'bg-surface text-status-danger-text shadow-xs' : 'text-muted'}`}
          >
            <span className="h-2 w-2 rounded-full bg-status-danger" />
            Blocked ({redCount})
          </button>
        </div>

        {/* Rows DataTable */}
        <DataTable
          columns={validationColumns}
          data={filteredRows}
          density="compact"
          pageSize={20}
          emptyTitle="No staged rows match filter"
          emptyDescription="Switch tabs above to view rows with different validation statuses."
        />
      </CardContent>

      <CardFooter className="justify-between">
        <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
          Back to Mapping
        </Button>
        <Button
          variant="primary"
          size="md"
          disabled={greenCount === 0}
          onClick={onProceed}
        >
          Proceed to Post ({greenCount} Clean Records)
        </Button>
      </CardFooter>
    </Card>
  );
}

