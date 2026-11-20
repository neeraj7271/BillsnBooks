import { Injectable } from '@nestjs/common';
import { AiProvider, ExtractedDocumentData } from './ai-provider.interface';

@Injectable()
export class MockAiProvider implements AiProvider {
  async extractDocument(buffer: Buffer, mimeType: string): Promise<ExtractedDocumentData> {
    // Deterministic mock document extractor for tests & initial phases
    return {
      documentType: 'TAX_INVOICE',
      invoiceNumber: { value: 'MOCK-INV-2026-001', confidence: 0.98 },
      invoiceDate: { value: '2026-05-10', confidence: 0.95 },
      supplierGstin: { value: '27AAPFU0939F1ZV', confidence: 0.99 },
      recipientGstin: { value: '29ABCDE1234F1Z5', confidence: 0.99 },
      placeOfSupply: { value: '29', confidence: 0.94 },
      totalTaxableValue: { value: '10000.00', confidence: 0.99 },
      totalTaxAmount: { value: '1800.00', confidence: 0.99 },
      totalAmount: { value: '11800.00', confidence: 0.99 },
      lineItems: [
        {
          description: { value: 'Consulting Services', confidence: 0.96 },
          hsnOrSac: { value: '998311', confidence: 0.95 },
          taxableAmount: { value: '10000.00', confidence: 0.99 },
          gstRate: { value: '18', confidence: 0.99 },
        },
      ],
    };
  }

  async classifyTransactionNarration(narration: string): Promise<{ category: string; confidence: number }> {
    const clean = narration.toUpperCase();
    if (clean.includes('SALARY') || clean.includes('PAYROLL')) {
      return { category: 'SALARY_EXPENSE', confidence: 0.92 };
    }
    if (clean.includes('GST') || clean.includes('TAX')) {
      return { category: 'STATUTORY_TAX', confidence: 0.95 };
    }
    if (clean.includes('INTEREST')) {
      return { category: 'BANK_INTEREST', confidence: 0.97 };
    }
    return { category: 'UNIDENTIFIED', confidence: 0.40 };
  }
}

