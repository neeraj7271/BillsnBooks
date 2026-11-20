import { PartyRegistrationType } from '@platform/shared-types';
import {
  getPartyRegistrationRule,
  validatePartyRegistrationData,
  formatPartyTaxIdentity,
  resolveTaxRate,
} from '../src/index.js';

describe('Party Registration Policy & Tax Identity', () => {
  describe('validatePartyRegistrationData', () => {
    it('strictly forbids GSTIN on UNREGISTERED parties', () => {
      const res = validatePartyRegistrationData({
        registrationType: PartyRegistrationType.UNREGISTERED,
        gstin: '27AABCA1234F1Z5',
        stateCode: '27',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain('GSTIN is strictly forbidden for Unregistered / Consumer');
    });

    it('passes for UNREGISTERED parties when GSTIN is omitted', () => {
      const res = validatePartyRegistrationData({
        registrationType: PartyRegistrationType.UNREGISTERED,
        gstin: null,
        stateCode: '27',
      });
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('requires a valid 15-character GSTIN for REGULAR parties', () => {
      const missingRes = validatePartyRegistrationData({
        registrationType: PartyRegistrationType.REGULAR,
        gstin: null,
        stateCode: '27',
      });
      expect(missingRes.isValid).toBe(false);
      expect(missingRes.errors[0]).toContain('GSTIN is mandatory for Regular Taxpayer');

      const validRes = validatePartyRegistrationData({
        registrationType: PartyRegistrationType.REGULAR,
        gstin: '27AAPFU0939F1ZV',
        stateCode: '27',
      });
      expect(validRes.isValid).toBe(true);
      expect(validRes.pan).toBe('AAPFU0939F');
    });

    it('rejects GSTIN with mismatched state code', () => {
      const mismatchRes = validatePartyRegistrationData({
        registrationType: PartyRegistrationType.REGULAR,
        gstin: '27AAPFU0939F1ZV',
        stateCode: '08', // Rajasthan instead of Maharashtra 27
      });
      expect(mismatchRes.isValid).toBe(false);
      expect(mismatchRes.errors.some((e) => e.includes('State code mismatch'))).toBe(true);
    });

    it('strictly forbids GSTIN for OVERSEAS parties', () => {
      const overseasRes = validatePartyRegistrationData({
        registrationType: PartyRegistrationType.OVERSEAS,
        gstin: '27AABCA1234F1Z5',
        country: 'USA',
      });
      expect(overseasRes.isValid).toBe(false);
      expect(overseasRes.errors[0]).toContain('GSTIN is strictly forbidden for Overseas / Foreign Party');
    });
  });

  describe('formatPartyTaxIdentity Guarantee', () => {
    it('guarantees that UNREGISTERED never outputs GSTIN or renders showGstin true', () => {
      const identity = formatPartyTaxIdentity(
        PartyRegistrationType.UNREGISTERED,
        '27AABCA1234F1Z5', // Even if an errant string is passed
      );
      expect(identity.showGstin).toBe(false);
      expect(identity.badgeLabel).toBe('Unregistered / Consumer');
      expect(identity.badgeVariant).toBe('neutral');
      expect(identity.gstinDisplay).toBe('N/A (Unregistered)');
    });

    it('formats REGULAR party with valid GSTIN badge', () => {
      const identity = formatPartyTaxIdentity(
        PartyRegistrationType.REGULAR,
        '27AABCA1234F1Z5',
      );
      expect(identity.showGstin).toBe(true);
      expect(identity.badgeLabel).toBe('Regular GST');
      expect(identity.gstinDisplay).toBe('GSTIN: 27AABCA1234F1Z5');
    });
  });

  describe('resolveTaxRate Precedence', () => {
    it('uses item master HSN rate by default', () => {
      const res = resolveTaxRate({
        itemHsnGstRatePercent: 12.0,
      });
      expect(res.resolvedRatePercent).toBe(12.0);
      expect(res.source).toBe('ITEM_MASTER');
      expect(res.requiresReview).toBe(false);
    });

    it('applies party override when specified', () => {
      const res = resolveTaxRate({
        itemHsnGstRatePercent: 18.0,
        partyGstRateOverridePercent: 5.0,
        partyOverrideReason: 'Concessional export rate notification 41/2017',
      });
      expect(res.resolvedRatePercent).toBe(5.0);
      expect(res.source).toBe('PARTY_OVERRIDE');
      expect(res.reason).toContain('Concessional export rate');
      expect(res.requiresReview).toBe(false);
    });

    it('triggers maker-checker review when manual line override is used', () => {
      const res = resolveTaxRate({
        itemHsnGstRatePercent: 18.0,
        manualOverrideRatePercent: 0.0,
        manualOverrideReason: 'Special exemption order by tax authority',
      });
      expect(res.resolvedRatePercent).toBe(0.0);
      expect(res.source).toBe('MANUAL_OVERRIDE');
      expect(res.requiresReview).toBe(true);
      expect(res.reviewMessage).toContain('Manual tax rate override');
    });

    it('throws error if manual override has no reason', () => {
      expect(() => {
        resolveTaxRate({
          itemHsnGstRatePercent: 18.0,
          manualOverrideRatePercent: 5.0,
          manualOverrideReason: '',
        });
      }).toThrow('A valid business justification is required for manual GST rate overrides.');
    });
  });
});
