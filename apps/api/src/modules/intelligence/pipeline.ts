import { Injectable, Inject } from '@nestjs/common';
import { RiskApprovalState } from '@platform/shared-types';
import { AiProvider } from './ai-provider.interface';
import { validateGstin, resolvePlaceOfSupply, calculateLineGst } from '@platform/gst-rules';

export interface PipelineContext {
  tenantId: string;
  companyId: string;
  rawBuffer?: Buffer;
  mimeType?: string;
  extracted?: any;
  matchedMasters?: Record<string, string>;
  gstValidation?: any;
  accountingValidation?: any;
  riskState: RiskApprovalState;
  reasons: string[];
  isVerified?: boolean;
}

@Injectable()
export class AccountingIntelligencePipeline {
  constructor(@Inject('AiProvider') private readonly aiProvider: AiProvider) {}

  async processDocument(tenantId: string, companyId: string, buffer: Buffer, mimeType: string): Promise<PipelineContext> {
    const ctx: PipelineContext = {
      tenantId,
      companyId,
      rawBuffer: buffer,
      mimeType,
      riskState: RiskApprovalState.GREEN,
      reasons: [],
    };

    // Stage 1: Ingest
    if (!buffer || buffer.length === 0) {
      ctx.riskState = RiskApprovalState.RED;
      ctx.reasons.push('Ingest failed: empty document buffer');
      return ctx;
    }

    // Stage 2: Extract (via pluggable AiProvider)
    const extracted = await this.aiProvider.extractDocument(buffer, mimeType);
    ctx.extracted = extracted;

    // Stage 3: Master Data Match
    // Verify GSTINs
    if (extracted.supplierGstin?.value) {
      const gstinVal = validateGstin(extracted.supplierGstin.value);
      if (!gstinVal.isValid) {
        ctx.riskState = RiskApprovalState.RED;
        ctx.reasons.push(`Invalid supplier GSTIN: ${gstinVal.error}`);
      }
    }

    // Stage 4: GST Rules Validation
    if (extracted.supplierGstin?.value && extracted.placeOfSupply?.value) {
      try {
        const supplierState = extracted.supplierGstin.value.substring(0, 2);
        const posResult = resolvePlaceOfSupply({
          supplierStateCode: supplierState,
          placeOfSupplyStateCode: extracted.placeOfSupply.value,
        });

        // Test line calculations
        for (const item of extracted.lineItems) {
          const calc = calculateLineGst({
            taxableValue: item.taxableAmount.value,
            gstRatePercent: item.gstRate.value,
            posResult,
          });
          ctx.gstValidation = { posResult, calc };
        }
      } catch (err: any) {
        ctx.riskState = RiskApprovalState.RED;
        ctx.reasons.push(`GST Rules validation error: ${err.message}`);
      }
    }

    // Stage 5 & 6: Accounting Validation & Risk State
    if (ctx.reasons.length > 0) {
      ctx.riskState = RiskApprovalState.RED;
    } else {
      // If confidence on any mandatory field is below 0.85, escalate to YELLOW
      if (
        (extracted.invoiceNumber && extracted.invoiceNumber.confidence < 0.85) ||
        (extracted.totalAmount && extracted.totalAmount.confidence < 0.85)
      ) {
        ctx.riskState = RiskApprovalState.YELLOW;
        ctx.reasons.push('Low confidence extraction detected; human clarification required.');
      }
    }

    return ctx;
  }
}

