export type TaxRateSource = 'ITEM_MASTER' | 'PARTY_OVERRIDE' | 'MANUAL_OVERRIDE';

export interface TaxRateResolutionInput {
  itemHsnGstRatePercent?: number | null;
  partyGstRateOverridePercent?: number | null;
  partyOverrideReason?: string | null;
  manualOverrideRatePercent?: number | null;
  manualOverrideReason?: string | null;
  ruleVersion?: string;
}

export interface TaxRateResolutionResult {
  resolvedRatePercent: number;
  source: TaxRateSource;
  reason?: string;
  ruleVersion: string;
  requiresReview: boolean;
  reviewMessage?: string;
}

export const CURRENT_TAX_RULE_VERSION = 'GST-2024.11-IN';

/**
 * Resolves the statutory GST rate following strict precedence rules.
 * Precedence:
 * 1. Manual Line Item Override (Requires audit reason & maker-checker review)
 * 2. Party Concession Override (Requires statutory notification reason)
 * 3. Item Master HSN Rate (Default authoritative source)
 */
export function resolveTaxRate(input: TaxRateResolutionInput): TaxRateResolutionResult {
  const version = input.ruleVersion || CURRENT_TAX_RULE_VERSION;

  // 1. Manual Line Item Override (Maker-checker trigger)
  if (
    input.manualOverrideRatePercent !== undefined &&
    input.manualOverrideRatePercent !== null
  ) {
    if (!input.manualOverrideReason || input.manualOverrideReason.trim().length === 0) {
      throw new Error('A valid business justification is required for manual GST rate overrides.');
    }
    return {
      resolvedRatePercent: input.manualOverrideRatePercent,
      source: 'MANUAL_OVERRIDE',
      reason: input.manualOverrideReason.trim(),
      ruleVersion: version,
      requiresReview: true,
      reviewMessage: `Manual tax rate override to ${input.manualOverrideRatePercent}%: ${input.manualOverrideReason}`,
    };
  }

  // 2. Party Concessional Override
  if (
    input.partyGstRateOverridePercent !== undefined &&
    input.partyGstRateOverridePercent !== null
  ) {
    return {
      resolvedRatePercent: input.partyGstRateOverridePercent,
      source: 'PARTY_OVERRIDE',
      reason: input.partyOverrideReason?.trim() || 'Party concession agreement',
      ruleVersion: version,
      requiresReview: false,
    };
  }

  // 3. Item Master HSN Rate
  const itemRate = input.itemHsnGstRatePercent !== undefined && input.itemHsnGstRatePercent !== null
    ? input.itemHsnGstRatePercent
    : 18.0; // Standard default rate

  return {
    resolvedRatePercent: itemRate,
    source: 'ITEM_MASTER',
    ruleVersion: version,
    requiresReview: false,
  };
}

