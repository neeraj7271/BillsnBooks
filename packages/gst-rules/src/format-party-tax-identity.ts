import { PartyRegistrationType } from '@platform/shared-types';

export interface FormattedPartyTaxIdentity {
  badgeLabel: string;
  badgeVariant: 'neutral' | 'brand' | 'success' | 'warning' | 'info' | 'danger';
  showGstin: boolean;
  gstinDisplay: string;
  summaryText: string;
}

/**
 * Standardized formatter for rendering party tax and registration identity.
 * Guarantee: Unregistered or Overseas parties NEVER output a GSTIN string.
 */
export function formatPartyTaxIdentity(
  registrationType?: PartyRegistrationType | string | null,
  gstin?: string | null,
): FormattedPartyTaxIdentity {
  const regType = (registrationType as PartyRegistrationType) || PartyRegistrationType.UNREGISTERED;

  switch (regType) {
    case PartyRegistrationType.UNREGISTERED:
      return {
        badgeLabel: 'Unregistered / Consumer',
        badgeVariant: 'neutral',
        showGstin: false,
        gstinDisplay: 'N/A (Unregistered)',
        summaryText: 'Unregistered Consumer (B2C)',
      };

    case PartyRegistrationType.OVERSEAS:
      return {
        badgeLabel: 'Overseas Client',
        badgeVariant: 'info',
        showGstin: false,
        gstinDisplay: 'N/A (Overseas)',
        summaryText: 'Cross-Border / Export Client',
      };

    case PartyRegistrationType.COMPOSITION:
      return {
        badgeLabel: 'Composition Scheme',
        badgeVariant: 'warning',
        showGstin: true,
        gstinDisplay: gstin ? `GSTIN: ${gstin}` : 'GSTIN Pending',
        summaryText: `Composition Dealer • ${gstin || 'No GSTIN'}`,
      };

    case PartyRegistrationType.SEZ_UNIT:
      return {
        badgeLabel: 'SEZ Unit',
        badgeVariant: 'brand',
        showGstin: true,
        gstinDisplay: gstin ? `GSTIN: ${gstin}` : 'GSTIN Pending',
        summaryText: `SEZ Unit (Deemed Inter-State) • ${gstin || 'No GSTIN'}`,
      };

    case PartyRegistrationType.SEZ_DEVELOPER:
      return {
        badgeLabel: 'SEZ Developer',
        badgeVariant: 'brand',
        showGstin: true,
        gstinDisplay: gstin ? `GSTIN: ${gstin}` : 'GSTIN Pending',
        summaryText: `SEZ Developer • ${gstin || 'No GSTIN'}`,
      };

    case PartyRegistrationType.DEEMED_EXPORT:
      return {
        badgeLabel: 'Deemed Export',
        badgeVariant: 'brand',
        showGstin: true,
        gstinDisplay: gstin ? `GSTIN: ${gstin}` : 'GSTIN Pending',
        summaryText: `Deemed Export (EOU/EPCG) • ${gstin || 'No GSTIN'}`,
      };

    case PartyRegistrationType.UIN_HOLDER:
      return {
        badgeLabel: 'UIN Entity',
        badgeVariant: 'brand',
        showGstin: true,
        gstinDisplay: gstin ? `UIN: ${gstin}` : 'UIN Pending',
        summaryText: `UIN Holder (Diplomatic/UN) • ${gstin || 'No UIN'}`,
      };

    case PartyRegistrationType.REGULAR:
    default:
      return {
        badgeLabel: 'Regular GST',
        badgeVariant: 'success',
        showGstin: true,
        gstinDisplay: gstin ? `GSTIN: ${gstin}` : 'GSTIN Missing',
        summaryText: `Regular GSTIN: ${gstin || 'None'}`,
      };
  }
}
