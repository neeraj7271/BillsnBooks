import { AccountingIntelligencePipeline } from '../src/modules/intelligence/pipeline';
import { MockAiProvider } from '../src/modules/intelligence/mock-ai.provider';
import { RiskApprovalState } from '@platform/shared-types';

describe('Accounting Intelligence Pipeline (AIE)', () => {
  let pipeline: AccountingIntelligencePipeline;
  let mockAi: MockAiProvider;

  beforeEach(() => {
    mockAi = new MockAiProvider();
    pipeline = new AccountingIntelligencePipeline(mockAi);
  });

  it('should process a valid tax invoice document and mark it GREEN', async () => {
    const dummyBuffer = Buffer.from('dummy-invoice-content');
    const result = await pipeline.processDocument('tenant-1', 'comp-1', dummyBuffer, 'application/pdf');

    expect(result.riskState).toBe(RiskApprovalState.GREEN);
    expect(result.extracted).toBeDefined();
    expect(result.extracted.invoiceNumber.value).toBe('MOCK-INV-2026-001');
    expect(result.gstValidation).toBeDefined();
    expect(result.reasons).toHaveLength(0);
  });

  it('should block document and transition to RED if buffer is empty', async () => {
    const emptyBuffer = Buffer.alloc(0);
    const result = await pipeline.processDocument('tenant-1', 'comp-1', emptyBuffer, 'application/pdf');

    expect(result.riskState).toBe(RiskApprovalState.RED);
    expect(result.reasons).toContain('Ingest failed: empty document buffer');
  });

  it('should escalate to YELLOW if extracted fields have low confidence', async () => {
    jest.spyOn(mockAi, 'extractDocument').mockResolvedValueOnce({
      documentType: 'TAX_INVOICE',
      invoiceNumber: { value: 'LOW-CONF-001', confidence: 0.65 }, // < 0.85
      supplierGstin: { value: '27AAPFU0939F1ZV', confidence: 0.99 },
      placeOfSupply: { value: '27', confidence: 0.99 },
      lineItems: [],
    });

    const buffer = Buffer.from('content');
    const result = await pipeline.processDocument('tenant-1', 'comp-1', buffer, 'application/pdf');

    expect(result.riskState).toBe(RiskApprovalState.YELLOW);
    expect(result.reasons.some((r) => r.includes('Low confidence extraction detected'))).toBe(true);
  });

  it('should transition to RED if supplier GSTIN is malformed', async () => {
    jest.spyOn(mockAi, 'extractDocument').mockResolvedValueOnce({
      documentType: 'TAX_INVOICE',
      supplierGstin: { value: 'INVALID_GSTIN_123', confidence: 0.99 },
      lineItems: [],
    });

    const buffer = Buffer.from('content');
    const result = await pipeline.processDocument('tenant-1', 'comp-1', buffer, 'application/pdf');

    expect(result.riskState).toBe(RiskApprovalState.RED);
    expect(result.reasons.some((r) => r.includes('Invalid supplier GSTIN'))).toBe(true);
  });
});

