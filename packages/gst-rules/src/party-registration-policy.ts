import { PartyRegistrationType } from '@platform/shared-types';
import { validateGstin } from './gstin-validator.js';
import { isValidStateCode } from './state-codes.js';

export type GstinRequirement = 'REQUIRED' | 'FORBIDDEN' | 'OPTIONAL';

export interface RegistrationRule {
  type: PartyRegistrationType;
  label: string;
  gstinRequirement: GstinRequirement;
  stateRequired: boolean;
  countryRequired: boolean;
  panRequired: boolean;
  allowsB2BInvoice: boolean;
  allowsB2CInvoice: boolean;
  billOfSupplyOnly: boolean;
  rcmApplicability: 'NEVER' | 'CONDITIONAL_REVIEW' | 'MANDATORY';
  sezTreatment: boolean;
  exportTreatment: boolean;
  uinTreatment: boolean;
  tallyRegistrationType: string;
  description: string;
}

export const PARTY_REGISTRATION_RULES: Record<PartyRegistrationType, RegistrationRule> = {
  [PartyRegistrationType.UNREGISTERED]: {
    type: PartyRegistrationType.UNREGISTERED,
    label: 'Unregistered / Consumer',
    gstinRequirement: 'FORBIDDEN',
    stateRequired: true,
    countryRequired: true,
    panRequired: false,
    allowsB2BInvoice: false,
    allowsB2CInvoice: true,
    billOfSupplyOnly: false,
    rcmApplicability: 'CONDITIONAL_REVIEW',
    sezTreatment: false,
    exportTreatment: false,
    uinTreatment: false,
    tallyRegistrationType: 'Consumer',
    description: 'Retail consumers and businesses below statutory GST threshold. GSTIN is strictly forbidden.',
  },
  [PartyRegistrationType.REGULAR]: {
    type: PartyRegistrationType.REGULAR,
    label: 'Regular Taxpayer',
    gstinRequirement: 'REQUIRED',
    stateRequired: true,
    countryRequired: true,
    panRequired: false, // Embedded in GSTIN
    allowsB2BInvoice: true,
    allowsB2CInvoice: false,
    billOfSupplyOnly: false,
    rcmApplicability: 'NEVER',
    sezTreatment: false,
    exportTreatment: false,
    uinTreatment: false,
    tallyRegistrationType: 'Regular',
    description: 'Standard B2B entity registered under normal GST provisions. Valid 15-character GSTIN mandatory.',
  },
  [PartyRegistrationType.COMPOSITION]: {
    type: PartyRegistrationType.COMPOSITION,
    label: 'Composition Dealer',
    gstinRequirement: 'REQUIRED',
    stateRequired: true,
    countryRequired: true,
    panRequired: false,
    allowsB2BInvoice: true,
    allowsB2CInvoice: false,
    billOfSupplyOnly: true,
    rcmApplicability: 'NEVER',
    sezTreatment: false,
    exportTreatment: false,
    uinTreatment: false,
    tallyRegistrationType: 'Composition',
    description: 'Registered under Section 10 Composition Scheme. Bill of Supply only; no tax credit charged.',
  },
  [PartyRegistrationType.SEZ_UNIT]: {
    type: PartyRegistrationType.SEZ_UNIT,
    label: 'SEZ Unit',
    gstinRequirement: 'REQUIRED',
    stateRequired: true,
    countryRequired: true,
    panRequired: false,
    allowsB2BInvoice: true,
    allowsB2CInvoice: false,
    billOfSupplyOnly: false,
    rcmApplicability: 'NEVER',
    sezTreatment: true,
    exportTreatment: false,
    uinTreatment: false,
    tallyRegistrationType: 'Regular',
    description: 'Special Economic Zone unit. Supplies treated as deemed inter-state under Section 7(5)(b) IGST Act.',
  },
  [PartyRegistrationType.SEZ_DEVELOPER]: {
    type: PartyRegistrationType.SEZ_DEVELOPER,
    label: 'SEZ Developer',
    gstinRequirement: 'REQUIRED',
    stateRequired: true,
    countryRequired: true,
    panRequired: false,
    allowsB2BInvoice: true,
    allowsB2CInvoice: false,
    billOfSupplyOnly: false,
    rcmApplicability: 'NEVER',
    sezTreatment: true,
    exportTreatment: false,
    uinTreatment: false,
    tallyRegistrationType: 'Regular',
    description: 'Special Economic Zone developer. Deemed inter-state treatment under Section 7(5)(b) IGST Act.',
  },
  [PartyRegistrationType.DEEMED_EXPORT]: {
    type: PartyRegistrationType.DEEMED_EXPORT,
    label: 'Deemed Export',
    gstinRequirement: 'REQUIRED',
    stateRequired: true,
    countryRequired: true,
    panRequired: false,
    allowsB2BInvoice: true,
    allowsB2CInvoice: false,
    billOfSupplyOnly: false,
    rcmApplicability: 'NEVER',
    sezTreatment: false,
    exportTreatment: false,
    uinTreatment: false,
    tallyRegistrationType: 'Regular',
    description: 'Supplies notified under Section 147 of the CGST Act (EOU/EPCG).',
  },
  [PartyRegistrationType.OVERSEAS]: {
    type: PartyRegistrationType.OVERSEAS,
    label: 'Overseas / Foreign Party',
    gstinRequirement: 'FORBIDDEN',
    stateRequired: false,
    countryRequired: true,
    panRequired: false,
    allowsB2BInvoice: true,
    allowsB2CInvoice: true,
    billOfSupplyOnly: false,
    rcmApplicability: 'NEVER',
    sezTreatment: false,
    exportTreatment: true,
    uinTreatment: false,
    tallyRegistrationType: 'Unregistered',
    description: 'Foreign entity outside India. Cross-border zero-rated export or import; GSTIN is forbidden.',
  },
  [PartyRegistrationType.UIN_HOLDER]: {
    type: PartyRegistrationType.UIN_HOLDER,
    label: 'UIN Holder (Embassy / UN Body)',
    gstinRequirement: 'REQUIRED',
    stateRequired: true,
    countryRequired: true,
    panRequired: false,
    allowsB2BInvoice: true,
    allowsB2CInvoice: false,
    billOfSupplyOnly: false,
    rcmApplicability: 'NEVER',
    sezTreatment: false,
    exportTreatment: false,
    uinTreatment: true,
    tallyRegistrationType: 'Regular',
    description: 'Entities granted Unique Identity Number under Section 25(9) of the CGST Act (UN bodies, embassies).',
  },
};

export function getPartyRegistrationRule(type: PartyRegistrationType): RegistrationRule {
  const rule = PARTY_REGISTRATION_RULES[type];
  if (!rule) {
    throw new Error(`Unknown PartyRegistrationType: ${type}`);
  }
  return rule;
}

export interface PartyRegistrationValidationResult {
  isValid: boolean;
  errors: string[];
  normalizedGstin?: string | null;
  stateCode?: string;
  pan?: string;
}

export function validatePartyRegistrationData(params: {
  registrationType: PartyRegistrationType;
  gstin?: string | null;
  stateCode?: string | null;
  pan?: string | null;
  country?: string | null;
}): PartyRegistrationValidationResult {
  const rule = getPartyRegistrationRule(params.registrationType);
  const errors: string[] = [];
  const cleanGstin = params.gstin?.trim().toUpperCase() || null;
  const providedStateCode = params.stateCode?.trim();
  let derivedStateCode = providedStateCode;
  let derivedPan = params.pan?.trim().toUpperCase();

  // 1. GSTIN Presence Check
  if (rule.gstinRequirement === 'FORBIDDEN') {
    if (cleanGstin) {
      errors.push(
        `GSTIN is strictly forbidden for ${rule.label}. Unregistered or overseas parties must not carry a GSTIN.`,
      );
    }
  } else if (rule.gstinRequirement === 'REQUIRED') {
    if (!cleanGstin) {
      errors.push(`GSTIN is mandatory for ${rule.label}.`);
    } else {
      const gstinRes = validateGstin(cleanGstin);
      if (!gstinRes.isValid) {
        errors.push(`Invalid GSTIN: ${gstinRes.error}`);
      } else {
        derivedStateCode = providedStateCode || gstinRes.stateCode;
        derivedPan = gstinRes.pan;
      }
    }
  }

  // 2. State Code Check
  if (rule.stateRequired) {
    if (!derivedStateCode) {
      errors.push(`Operating State Code is required for ${rule.label}.`);
    } else if (!isValidStateCode(derivedStateCode)) {
      errors.push(`Invalid State Code '${derivedStateCode}'.`);
    }
  }

  // 3. GSTIN State Code cross-check
  if (cleanGstin && providedStateCode) {
    const gstinPrefix = cleanGstin.substring(0, 2);
    if (gstinPrefix !== providedStateCode) {
      errors.push(
        `State code mismatch: GSTIN starts with '${gstinPrefix}' but operating state is '${providedStateCode}'.`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedGstin: cleanGstin,
    stateCode: derivedStateCode,
    pan: derivedPan,
  };
}
