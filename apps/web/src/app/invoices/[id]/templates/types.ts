export type InvoiceTemplateId = 'TALLY_CLASSIC' | 'MODERN_BRAND' | 'MINIMAL_COMPACT';

export interface InvoiceTemplateOption {
  id: InvoiceTemplateId;
  name: string;
  tagline: string;
  description: string;
  badge?: string;
}

export const INVOICE_TEMPLATES: InvoiceTemplateOption[] = [
  {
    id: 'TALLY_CLASSIC',
    name: 'Tally Classic GST',
    tagline: 'Standard Indian Boxed Layout (Rule 46)',
    description: 'Traditional TallyPrime / ERP-9 layout with boxed consignee grid, HSN analysis, and statutory declaration.',
    badge: 'Statutory Standard',
  },
  {
    id: 'MODERN_BRAND',
    name: 'Modern Corporate',
    tagline: 'Contemporary Brand Identity',
    description: 'Sleek executive layout with clean card sections, subtle accents, and streamlined financial summary.',
    badge: 'Popular',
  },
  {
    id: 'MINIMAL_COMPACT',
    name: 'Minimalist Compact',
    tagline: 'High-Density 1-Page Layout',
    description: 'Space-optimized hairline layout designed for compact paper-saving single-sheet printing.',
  },
];

export interface InvoiceTemplateProps {
  invoice: any;
  company?: any;
  settings?: Record<string, any>;
}

