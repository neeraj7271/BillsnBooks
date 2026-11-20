export interface ExtractedField<T> {
  value: T;
  confidence: number; // 0.00 to 1.00
  sourceBoundingBox?: number[];
}

export interface ExtractedDocumentData {
  documentType: string;
  invoiceNumber?: ExtractedField<string>;
  invoiceDate?: ExtractedField<string>;
  supplierGstin?: ExtractedField<string>;
  recipientGstin?: ExtractedField<string>;
  placeOfSupply?: ExtractedField<string>;
  totalTaxableValue?: ExtractedField<string>;
  totalTaxAmount?: ExtractedField<string>;
  totalAmount?: ExtractedField<string>;
  lineItems: Array<{
    description: ExtractedField<string>;
    hsnOrSac?: ExtractedField<string>;
    quantity?: ExtractedField<number>;
    rate?: ExtractedField<string>;
    taxableAmount: ExtractedField<string>;
    gstRate: ExtractedField<string>;
  }>;
}

export interface AiProvider {
  extractDocument(buffer: Buffer, mimeType: string): Promise<ExtractedDocumentData>;
  classifyTransactionNarration(narration: string): Promise<{ category: string; confidence: number }>;
}

