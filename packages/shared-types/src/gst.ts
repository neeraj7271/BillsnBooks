export enum SupplyType {
  INTRA_STATE = 'INTRA_STATE',
  INTER_STATE = 'INTER_STATE',
  EXPORT = 'EXPORT',
  SEZ = 'SEZ',
  DEEMED_EXPORT = 'DEEMED_EXPORT',
  NIL_RATED = 'NIL_RATED',
  EXEMPT = 'EXEMPT',
  NON_GST = 'NON_GST',
}

export interface TaxComponentBreakup {
  taxableValue: string;
  cgstRate: string;
  cgstAmount: string;
  sgstRate: string;
  sgstAmount: string;
  igstRate: string;
  igstAmount: string;
  cessRate?: string;
  cessAmount?: string;
  totalTax: string;
  totalValue: string;
}

