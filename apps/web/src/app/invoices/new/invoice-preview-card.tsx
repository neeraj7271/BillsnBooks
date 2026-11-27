'use client';

import React from 'react';
import { Button, cn } from '@platform/ui';
import { ArrowLeft, Printer } from 'lucide-react';
import {
  MinimalCompactTemplate,
  ModernBrandTemplate,
  TallyClassicTemplate,
} from '../[id]/templates';

export type TemplateStyle = 'Minimal' | 'Modern' | 'Tally';

interface InvoicePreviewCardProps {
  templateStyle: TemplateStyle;
  setTemplateStyle: (tpl: TemplateStyle) => void;
  previewModel: any;
  activeCompany: any;
  brandingSettings?: Record<string, any>;
  onBackToEdit?: () => void;
  showBackToEdit?: boolean;
}

export function InvoicePreviewCard({
  templateStyle,
  setTemplateStyle,
  previewModel,
  activeCompany,
  brandingSettings = {},
  onBackToEdit,
  showBackToEdit = false,
}: InvoicePreviewCardProps) {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const TemplateComponent = {
    Minimal: MinimalCompactTemplate,
    Modern: ModernBrandTemplate,
    Tally: TallyClassicTemplate,
  }[templateStyle] || ModernBrandTemplate;

  return (
    <div className="space-y-4" data-testid="invoice-live-preview">
      {/* Top Bar with Template Switcher & Actions - Hidden in Print */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-2xl border border-default shadow-xs print:hidden">
        <div className="flex items-center gap-2">
          {showBackToEdit && onBackToEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBackToEdit}
              leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
            >
              Back to Edit
            </Button>
          )}
          <span className="text-overline uppercase text-muted font-bold">
            Live GST Invoice Preview
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Template Style Selector */}
          <div className="inline-flex rounded-xl bg-surface-sunken p-0.5 border border-default">
            {(['Minimal', 'Modern', 'Tally'] as TemplateStyle[]).map((tpl) => (
              <button
                key={tpl}
                type="button"
                onClick={() => setTemplateStyle(tpl)}
                className={cn(
                  'px-3 py-1 text-xs font-semibold rounded-lg transition-all',
                  templateStyle === tpl
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-muted hover:text-primary'
                )}
              >
                {tpl}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="h-3.5 w-3.5" />}
          >
            Print / PDF
          </Button>
        </div>
      </div>

      {/* A4 1:1 Scaled Canvas Frame */}
      <div className="w-full flex flex-col items-center py-4 bg-canvas/30 rounded-2xl border border-subtle overflow-y-auto print:bg-white print:p-0 print:m-0 print:border-none print:block">
        <div
          id="printable-invoice"
          className="printable-document w-full max-w-[794px] aspect-[1/1.414] mx-auto bg-white text-black shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.08)] rounded-[2px] px-[12mm] py-[10mm] box-border transition-all print:p-0 print:m-0 print:max-w-none print:w-full print:min-h-0 print:shadow-none print:border-none print:rounded-none print:aspect-auto"
        >
          <TemplateComponent
            invoice={previewModel}
            company={activeCompany}
            settings={brandingSettings}
          />
        </div>

        {/* Footer Cue */}
        <div className="no-print w-full max-w-[210mm] mt-3 flex items-center justify-between text-[11px] text-muted print:hidden select-none px-1">
          <span>A4 Standard Portrait (210 × 297 mm)</span>
          <span className="font-mono text-[10px]">Exact Print Preview</span>
        </div>
      </div>
    </div>
  );
}
