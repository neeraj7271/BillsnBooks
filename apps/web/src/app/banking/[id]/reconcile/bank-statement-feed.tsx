import React from 'react';
import { Badge, MoneyText, DateText } from '@platform/ui';

interface BankStatementFeedProps {
  transactions: any[];
  selectedTxnId: string | null;
  filter: 'UNMATCHED' | 'MATCHED' | 'ALL';
  onFilterChange: (f: 'UNMATCHED' | 'MATCHED' | 'ALL') => void;
  onSelectTxn: (txn: any) => void;
}

export function BankStatementFeed({
  transactions,
  selectedTxnId,
  filter,
  onFilterChange,
  onSelectTxn,
}: BankStatementFeedProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-secondary">
          Statement Feed ({transactions.length})
        </h3>
        <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-xl">
          {(['UNMATCHED', 'MATCHED', 'ALL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                filter === f
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted border border-dashed border-default rounded-xl">
            No transactions found for filter.
          </div>
        ) : (
          transactions.map((tx) => {
            const isSelected = tx.id === selectedTxnId;
            return (
              <div
                key={tx.id}
                onClick={() => onSelectTxn(tx)}
                className={`p-3.5 rounded-xl border shadow-card hover:shadow-card-hover transition-all cursor-pointer ${
                  isSelected
                    ? 'border-focus bg-brand-subtle ring-1 ring-focus-ring'
                    : 'border-subtle bg-surface hover:border-strong'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-primary">
                      {tx.description}
                    </div>
                    <div className="text-[11px] text-muted">
                      <DateText date={tx.transactionDate} />
                      {tx.referenceNumber && ` • Ref: ${tx.referenceNumber}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <MoneyText
                      amount={tx.amount}
                      className={`text-xs font-bold ${
                        tx.type === 'CREDIT' ? 'text-status-success-text' : 'text-primary'
                      }`}
                    />
                    <div>
                      <Badge variant={tx.matchStatus === 'MATCHED' ? 'success' : 'warning'} size="xs" dot>
                        {tx.matchStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

