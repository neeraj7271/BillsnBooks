import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge } from '@platform/ui';
import { ArrowLeft, CheckCircle2, RotateCw, AlertTriangle, XCircle, Sparkles, Users } from 'lucide-react';

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
                leftIcon={<Users className="h-3.5 w-3.5 text-blue-500" />}
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
                leftIcon={<Sparkles className="h-3.5 w-3.5 text-indigo-500" />}
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
                leftIcon={<RotateCw className="h-3.5 w-3.5 text-amber-500" />}
              >
                Auto-Resolve Ambiguities ({yellowCount})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          <button
            onClick={() => onTabChange('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${activeTab === 'ALL' ? 'bg-white dark:bg-slate-900 shadow-xs' : 'text-slate-500'}`}
          >
            All Rows ({stagedRows.length})
          </button>
          <button
            onClick={() => onTabChange('GREEN')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${activeTab === 'GREEN' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs' : 'text-slate-500'}`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Clean ({greenCount})
          </button>
          <button
            onClick={() => onTabChange('YELLOW')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${activeTab === 'YELLOW' ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs' : 'text-slate-500'}`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Warning ({yellowCount})
          </button>
          <button
            onClick={() => onTabChange('RED')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${activeTab === 'RED' ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-xs' : 'text-slate-500'}`}
          >
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Blocked ({redCount})
          </button>
        </div>

        {/* Rows Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500 sticky top-0">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Invoice / Ref</th>
                <th className="py-2.5 px-3">Party Name</th>
                <th className="py-2.5 px-3">GSTIN</th>
                <th className="py-2.5 px-3">Errors / Rule Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((r, idx) => (
                <tr key={r.id || idx}>
                  <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <Badge
                      variant={getStatus(r) === 'GREEN' ? 'success' : getStatus(r) === 'YELLOW' ? 'warning' : 'danger'}
                      size="xs"
                      dot
                    >
                      {getStatus(r)}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 font-mono font-semibold">{r.parsedData?.voucherNumber || r.parsedData?.invoiceNumber || '—'}</td>
                  <td className="py-2 px-3 font-medium">{r.parsedData?.partyName || '—'}</td>
                  <td className="py-2 px-3 font-mono text-[11px]">{r.parsedData?.partyGstin || r.parsedData?.gstin || '—'}</td>
                  <td className="py-2 px-3 text-[11px] text-slate-500">
                    {(r.errorReasons || r.errors || []).map((err: any, eIdx: number) => (
                      <span key={eIdx} className="block text-rose-600 dark:text-rose-400 font-medium">
                        • {typeof err === 'string' ? err : err.message || JSON.stringify(err)}
                      </span>
                    ))}
                    {(!r.errorReasons || r.errorReasons.length === 0) && (!r.errors || r.errors.length === 0) && (
                      <span className="text-emerald-600">Passed audit</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

