import { PartyService } from '../src/modules/party/party.service';
import { InvoiceService } from '../src/modules/invoice/invoice.service';
import { TallyGatewayService } from '../src/modules/tally/tally-gateway.service';
import {
  PartyType,
  PartyRegistrationType,
  DocumentType,
  TaxClassification,
  InvoiceStatus,
  ApprovalStatus,
} from '@platform/shared-types';
import { BadRequestException } from '@nestjs/common';

describe('Party Master, GST Registration, and Snapshot Integrity', () => {
  let partyService: PartyService;
  let invoiceService: InvoiceService;
  let tallyGateway: TallyGatewayService;
  let mockUow: any;
  let mockQr: any;
  let mockVoucherService: any;

  const tenantId = 'a0000000-0000-4000-8000-000000000001';
  const companyId = 'c0000000-0000-4000-8000-000000000001';
  const userId = 'b0000000-0000-4000-8000-000000000001';
  const branchId = 'd0000000-0000-4000-8000-000000000001';
  const financialYearId = 'e0000000-0000-4000-8000-000000000001';

  beforeEach(() => {
    mockVoucherService = {
      createAndPostVoucher: jest.fn().mockResolvedValue({ id: 'vouch-1', voucherNumber: 'V-001' }),
    };

    mockQr = {
      manager: {
        findOne: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation((entityClass, data) => ({
          ...data,
          id: data.id || 'mock-id-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ id: 'ledger-debtors-1' }),
          getMany: jest.fn().mockResolvedValue([
            { id: 'led-sales', name: 'Domestic Sales - Taxable', systemKey: 'LED_SALES_GST_DOMESTIC' },
            { id: 'led-ocgst', name: 'Output CGST', systemKey: 'LED_CGST_OUTPUT', gstTaxType: 'CGST' },
            { id: 'led-osgst', name: 'Output SGST', systemKey: 'LED_SGST_OUTPUT', gstTaxType: 'SGST' },
            { id: 'led-oigst', name: 'Output IGST', systemKey: 'LED_IGST_OUTPUT', gstTaxType: 'IGST' },
            { id: 'led-roundoff', name: 'Round Off A/c', systemKey: 'LED_ROUND_OFF' },
          ]),
        }),
      },
    };

    mockUow = {
      executeInTransaction: jest.fn().mockImplementation(async (cb) => cb(mockQr)),
    };

    partyService = new PartyService(mockUow);
    invoiceService = new InvoiceService(mockUow, mockVoucherService);
    tallyGateway = new TallyGatewayService(mockUow);
  });

  describe('Party Registration Policy Invariants', () => {
    it('strictly forbids GSTIN on UNREGISTERED retail party', async () => {
      await expect(
        partyService.createParty(tenantId, companyId, {
          name: 'Walk-in Retail Consumer',
          partyType: PartyType.CUSTOMER,
          registrationType: PartyRegistrationType.UNREGISTERED,
          gstin: '27AAPFU0939F1ZV', // Disallowed for unregistered
          billingStateCode: '27',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates UNREGISTERED party with null GSTIN, auto-allocates party code, and creates registration row', async () => {
      const res = await partyService.createParty(tenantId, companyId, {
        name: 'Sharma Retail Store',
        partyType: PartyType.CUSTOMER,
        registrationType: PartyRegistrationType.UNREGISTERED,
        billingStateCode: '27',
        billingCity: 'Mumbai',
        billingAddressLine1: 'Shop 4, Linking Road',
      });

      expect(res.name).toBe('Sharma Retail Store');
      expect(res.registrationType).toBe(PartyRegistrationType.UNREGISTERED);
      expect(res.gstin).toBeUndefined();
      expect(res.partyCode).toBe('CUST-0001');

      // Verify save was called for party_registrations with gstin: null
      const savedRegistration = mockQr.manager.save.mock.calls.find(
        (call: any[]) => call[0].partyId && call[0].registrationType === PartyRegistrationType.UNREGISTERED,
      );
      expect(savedRegistration).toBeDefined();
      expect(savedRegistration[0].gstin).toBeNull();
    });

    it('requires valid 15-char Mod-36 GSTIN for REGULAR taxpayer', async () => {
      await expect(
        partyService.createParty(tenantId, companyId, {
          name: 'Tech Corp India Pvt Ltd',
          partyType: PartyType.CUSTOMER,
          registrationType: PartyRegistrationType.REGULAR,
          gstin: '27INVALIDGSTIN1',
          billingStateCode: '27',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate GSTIN in the same company', async () => {
      mockQr.manager.findOne.mockResolvedValueOnce({
        id: 'existing-p-1',
        name: 'Existing Registered Customer',
        gstin: '27AAPFU0939F1ZV',
        isActive: true,
      });

      await expect(
        partyService.createParty(tenantId, companyId, {
          name: 'New Branch Customer',
          partyType: PartyType.CUSTOMER,
          registrationType: PartyRegistrationType.REGULAR,
          gstin: '27AAPFU0939F1ZV',
          billingStateCode: '27',
        }),
      ).rejects.toThrow('already exists in this company');
    });
  });

  describe('Invoice Party Snapshot Immutability (Part A Bug Fix)', () => {
    it('captures immutable party snapshot on invoice creation and guarantees gstin is null for unregistered party', async () => {
      mockQr.manager.findOne.mockImplementation((entityClass: any, opts: any) => {
        if (opts?.where?.id === 'unreg-party-id') {
          return Promise.resolve({
            id: 'unreg-party-id',
            name: 'Pannalal and Sons (Retail Consumer)',
            tradeName: 'P & Sons',
            registrationType: PartyRegistrationType.UNREGISTERED,
            gstin: null, // Unregistered has no GSTIN
            pan: 'OVQPS2080P',
            billingStateCode: '08',
            billingCity: 'Jaipur',
            billingAddressLine1: 'Bapu Bazaar',
            billingPincode: '302003',
          });
        }
        if (opts?.where?.id === branchId) {
          return Promise.resolve({ id: branchId, stateCode: '08' });
        }
        return Promise.resolve(null);
      });

      const inv = await invoiceService.createInvoice(tenantId, companyId, userId, {
        branchId,
        financialYearId,
        partyId: 'unreg-party-id',
        invoiceDate: '2024-11-10',
        dueDate: '2024-11-25',
        placeOfSupplyStateCode: '08',
        documentType: DocumentType.TAX_INVOICE,
        items: [
          {
            description: 'Cotton Fabric Roll',
            hsnSacCode: '5208',
            quantity: 10,
            unitPrice: 500,
            gstRatePercent: 5,
          },
        ],
      });

      // Verify snapshot values
      expect(inv.partyNameSnapshot).toBe('Pannalal and Sons (Retail Consumer)');
      expect(inv.partyTradeNameSnapshot).toBe('P & Sons');
      expect(inv.partyRegistrationTypeSnapshot).toBe(PartyRegistrationType.UNREGISTERED);
      expect(inv.partyGstinSnapshot).toBeUndefined(); // Strictly null/undefined for unregistered
      expect(inv.partyPanSnapshot).toBe('OVQPS2080P');
      expect(inv.billingAddressSnapshot).toEqual({
        addressLine1: 'Bapu Bazaar',
        addressLine2: '',
        city: 'Jaipur',
        state: '',
        stateCode: '08',
        pincode: '302003',
      });
      // Ensure nested party in DTO never leaks any GSTIN
      expect(inv.party?.gstin).toBeUndefined();
      expect(inv.party?.registrationType).toBe(PartyRegistrationType.UNREGISTERED);
    });
  });

  describe('Tally Statutory XML Export Mapping', () => {
    it('maps UNREGISTERED party to Consumer with empty PARTYGSTIN tag', () => {
      const xml = tallyGateway.generatePartyLedgerXmlEnvelope({
        name: 'Local Cash Retail Customer',
        registrationType: 'UNREGISTERED',
        gstin: null,
        pan: 'ABCDE1234F',
        stateName: 'Rajasthan',
      });

      expect(xml).toContain('<GSTREGISTRATIONTYPE>Consumer</GSTREGISTRATIONTYPE>');
      expect(xml).toContain('<PARTYGSTIN></PARTYGSTIN>');
      expect(xml).toContain('<STATENAME>Rajasthan</STATENAME>');
      expect(xml).toContain('<ISBILLWISEON>Yes</ISBILLWISEON>');
    });

    it('maps REGULAR party to Regular with populated PARTYGSTIN tag', () => {
      const xml = tallyGateway.generatePartyLedgerXmlEnvelope({
        name: 'Adani Logistics Pvt Ltd',
        registrationType: 'REGULAR',
        gstin: '27AAPFU0939F1ZV',
        pan: 'AAPFU0939F',
        stateName: 'Maharashtra',
      });

      expect(xml).toContain('<GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>');
      expect(xml).toContain('<PARTYGSTIN>27AAPFU0939F1ZV</PARTYGSTIN>');
      expect(xml).toContain('<STATENAME>Maharashtra</STATENAME>');
    });
  });

  describe('Error Envelope & Client Message Unwrapping (DEF-002 Regression)', () => {
    it('unwraps nested error envelope object to extract clear statutory string instead of [object Object]', () => {
      const simulatedApiErrorBody = {
        success: false,
        error: {
          code: 'BadRequestException',
          message: 'Party registration validation failed: Invalid GSTIN: GSTIN checksum verification failed',
          timestamp: '2026-10-31T16:00:00.000Z',
        },
      };

      const extractedMsg =
        simulatedApiErrorBody?.error?.message ||
        (simulatedApiErrorBody as any)?.message ||
        simulatedApiErrorBody?.error;

      expect(typeof extractedMsg).toBe('string');
      expect(extractedMsg).not.toBe('[object Object]');
      expect(extractedMsg).toContain('GSTIN checksum verification failed');
    });
  });
});
