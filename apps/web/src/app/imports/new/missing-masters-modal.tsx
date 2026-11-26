import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
} from '@platform/ui';
import { Users, Package, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface MissingMastersModalProps {
  open: boolean;
  companyId?: string;
  batchId: string;
  scanData: {
    hasMissingMasters: boolean;
    missingParties: any[];
    missingItems: any[];
    unmappedUnits: any[];
  } | null;
  onOpenChange: (open: boolean) => void;
  onResolved: (result: any) => void;
}

export function MissingMastersModal({
  open,
  companyId,
  batchId,
  scanData,
  onOpenChange,
  onResolved,
}: MissingMastersModalProps) {
  const [resolving, setResolving] = useState(false);
  const [activeTab, setActiveTab] = useState<'PARTIES' | 'ITEMS'>('PARTIES');

  if (!scanData || !scanData.hasMissingMasters) return null;

  const handleQuickCreateAll = async () => {
    try {
      setResolving(true);
      const payload = {
        parties: scanData.missingParties.map((p) => ({
          name: p.name,
          partyType: p.partyType,
          gstin: p.gstin,
          pan: p.pan,
          stateCode: p.stateCode || '27',
          registrationType: p.registrationType,
        })),
        items: scanData.missingItems.map((i) => ({
          name: i.name,
          itemType: i.itemType,
          hsnSac: i.hsnSac,
          uqc: i.uqc || 'NOS',
          taxRate: i.taxRate || 18,
          price: i.price,
        })),
      };

      const result = await apiClient.resolveImportMasters(companyId, batchId, payload);
      onResolved(result);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to resolve missing masters', err);
    } finally {
      setResolving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-status-warning-subtle text-status-warning-text flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Missing Master Records Detected</DialogTitle>
              <DialogDescription>
                We found new customers, vendors, or items in your file that do not yet exist in your database.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary Badges */}
          <div className="flex items-center gap-2 p-3 bg-surface-sunken rounded-xl border border-default text-xs">
            <span className="font-semibold text-secondary">To be created:</span>
            <Badge variant="warning">{scanData.missingParties.length} New Parties</Badge>
            <Badge variant="brand">{scanData.missingItems.length} New Products/Services</Badge>
            {scanData.unmappedUnits.length > 0 && (
              <Badge variant="neutral">{scanData.unmappedUnits.length} Units Mapped</Badge>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-default text-xs">
            <button
              type="button"
              className={`pb-2 px-3 font-semibold border-b-2 flex items-center gap-1.5 ${
                activeTab === 'PARTIES'
                  ? 'border-brand text-brand-text'
                  : 'border-transparent text-muted hover:text-primary'
              }`}
              onClick={() => setActiveTab('PARTIES')}
            >
              <Users className="h-3.5 w-3.5" />
              Parties ({scanData.missingParties.length})
            </button>
            <button
              type="button"
              className={`pb-2 px-3 font-semibold border-b-2 flex items-center gap-1.5 ${
                activeTab === 'ITEMS'
                  ? 'border-brand text-brand-text'
                  : 'border-transparent text-muted hover:text-primary'
              }`}
              onClick={() => setActiveTab('ITEMS')}
            >
              <Package className="h-3.5 w-3.5" />
              Products / Items ({scanData.missingItems.length})
            </button>
          </div>

          {/* Tab 1: Parties */}
          {activeTab === 'PARTIES' && (
            <div className="max-h-60 overflow-y-auto rounded-xl border border-default divide-y divide-subtle text-xs">
              {scanData.missingParties.map((p, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between hover:bg-row-hover">
                  <div>
                    <p className="font-semibold text-primary">{p.name}</p>
                    <p className="text-[11px] text-muted">
                      GSTIN: {p.gstin || 'Unregistered'} • State: {p.stateCode || '27'}
                    </p>
                  </div>
                  <Badge variant="neutral">{p.partyType}</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Items */}
          {activeTab === 'ITEMS' && (
            <div className="max-h-60 overflow-y-auto rounded-xl border border-default divide-y divide-subtle text-xs">
              {scanData.missingItems.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between hover:bg-row-hover">
                  <div>
                    <p className="font-semibold text-primary">{item.name}</p>
                    <p className="text-[11px] text-muted">
                      HSN: {item.hsnSac || 'Standard'} • UOM: {item.uqc} • Tax Rate: {item.taxRate}%
                    </p>
                  </div>
                  <Badge variant="neutral">{item.itemType}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="justify-between items-center">
          <p className="text-[11px] text-muted">
            Masters will be created with standard GST accounts automatically.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Skip & Review
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={resolving}
              onClick={handleQuickCreateAll}
              leftIcon={<CheckCircle className="h-3.5 w-3.5" />}
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              1-Click Create All with Defaults
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
