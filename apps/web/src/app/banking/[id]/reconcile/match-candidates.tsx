import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, MoneyText, DateText } from '@platform/ui';
import { Sparkles, Link2, Unlink } from 'lucide-react';

interface MatchCandidatesProps {
  selectedTxn: any | null;
  suggestions: any[];
  loadingSuggestions: boolean;
  onMatch: (voucherId: string) => void;
  onUnmatch: () => void;
}

export function MatchCandidates({
  selectedTxn,
  suggestions,
  loadingSuggestions,
  onMatch,
  onUnmatch,
}: MatchCandidatesProps) {
  if (!selectedTxn) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-xs text-muted">
          Select a bank statement transaction to view matching ledger entries.
        </CardContent>
      </Card>
    );
  }

  const isMatched = selectedTxn.matchStatus === 'MATCHED';

  return (
    <Card>
      <CardHeader className="p-4 border-b border-subtle">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-sm">Reconciliation Workbench</CardTitle>
            <p className="text-xs text-muted mt-0.5">
              Matching for <span className="font-mono font-semibold">{selectedTxn.referenceNumber || selectedTxn.description}</span>
            </p>
          </div>
          {isMatched ? (
            <Button variant="danger" size="xs" onClick={onUnmatch} leftIcon={<Unlink className="h-3.5 w-3.5" />}>
              Unlink Match
            </Button>
          ) : (
            <Badge variant="brand" size="xs" dot>Awaiting Match</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {loadingSuggestions ? (
          <div className="p-8 text-center text-xs text-muted">
            Running 2-way fuzzy matching algorithm...
          </div>
        ) : suggestions.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted border border-dashed border-default rounded-xl">
            No automatic matches found. Check voucher date or amount variance.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-text" />
              Suggested Ledger Entries ({suggestions.length})
            </div>

            {suggestions.map((s) => (
              <div
                key={s.voucherId}
                className="p-4 rounded-xl bg-surface-sunken flex justify-between items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs font-mono">{s.voucherNumber}</span>
                    <Badge variant={s.confidenceScore > 85 ? 'success' : 'brand'} size="xs">
                      {s.confidenceScore}% match
                    </Badge>
                  </div>
                  <div className="text-xs text-secondary">{s.narration}</div>
                  <div className="text-[11px] text-muted">Date: <DateText date={s.date} /></div>
                </div>

                <div className="text-right space-y-2 shrink-0">
                  <div className="font-bold text-sm"><MoneyText amount={s.amount} /></div>
                  <Button variant="primary" size="xs" onClick={() => onMatch(s.voucherId)} leftIcon={<Link2 className="h-3 w-3" />}>
                    Match
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

