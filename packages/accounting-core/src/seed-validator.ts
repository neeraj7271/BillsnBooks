import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import {
  AccountNature,
  ReportType,
  NormalBalance,
  BusinessTemplate,
  GstTaxType,
} from '@platform/shared-types';

export {
  AccountNature,
  ReportType,
  NormalBalance,
  BusinessTemplate,
  GstTaxType,
};

export const SeedGroupSchema = z.object({
  systemKey: z.string().min(3),
  name: z.string().min(2),
  code: z.string().regex(/^\d{4}$/, 'Group code must be a 4-digit number'),
  nature: z.nativeEnum(AccountNature),
  report: z.nativeEnum(ReportType),
  normalBalance: z.nativeEnum(NormalBalance),
  affectsGrossProfit: z.boolean(),
  isLocked: z.boolean().default(true),
  parentGroupKey: z.string().nullable(),
  tallyGroupName: z.string().min(2),
  scheduleIiiMapping: z.string().nullable(),
  templates: z.array(z.nativeEnum(BusinessTemplate)).min(1),
});

export type SeedGroup = z.infer<typeof SeedGroupSchema>;

export const SeedLedgerSchema = z.object({
  systemKey: z.string().min(3),
  name: z.string().min(2),
  code: z.string().regex(/^\d{4}$/, 'Ledger code must be a 4-digit number'),
  groupKey: z.string().min(3),
  isBankOrCash: z.boolean().default(false),
  isLocked: z.boolean().default(false),
  tallyLedgerName: z.string().nullable(),
  gstTaxType: z.nativeEnum(GstTaxType).nullable().optional(),
  gstRate: z.number().nullable().optional(),
  scheduleIiiMapping: z.string().nullable(),
  templates: z.array(z.nativeEnum(BusinessTemplate)).min(1),
});

export type SeedLedger = z.infer<typeof SeedLedgerSchema>;

export const CoaCatalogueSchema = z.object({
  version: z.string().regex(/^v\d+(\.\d+)?$/, 'Version must follow v1 or v1.0 syntax'),
  groups: z.array(SeedGroupSchema).min(28, 'Must include at least all 28 Tally standard groups'),
  ledgers: z.array(SeedLedgerSchema).min(30, 'Must include standard statutory and common ledgers'),
}).superRefine((data, ctx) => {
  const groupKeys = new Set<string>();
  const groupCodes = new Set<string>();

  data.groups.forEach((g, i) => {
    if (groupKeys.has(g.systemKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate group systemKey: "${g.systemKey}"`,
        path: ['groups', i, 'systemKey'],
      });
    }
    groupKeys.add(g.systemKey);

    if (groupCodes.has(g.code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate group code: "${g.code}"`,
        path: ['groups', i, 'code'],
      });
    }
    groupCodes.add(g.code);
  });

  // Verify parent references and nature inheritance
  const groupMap = new Map<string, SeedGroup>();
  for (const g of data.groups) {
    groupMap.set(g.systemKey, g);
  }

  data.groups.forEach((g, i) => {
    if (g.parentGroupKey) {
      const parent = groupMap.get(g.parentGroupKey);
      if (!parent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Referenced parentGroupKey "${g.parentGroupKey}" not found in catalogue`,
          path: ['groups', i, 'parentGroupKey'],
        });
      } else if (parent.nature !== g.nature) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Group nature "${g.nature}" differs from parent group nature "${parent.nature}"`,
          path: ['groups', i, 'nature'],
        });
      }
    }
  });

  // Verify ledgers
  const ledgerKeys = new Set<string>();
  const ledgerCodes = new Set<string>();

  data.ledgers.forEach((l, i) => {
    if (ledgerKeys.has(l.systemKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate ledger systemKey: "${l.systemKey}"`,
        path: ['ledgers', i, 'systemKey'],
      });
    }
    ledgerKeys.add(l.systemKey);

    if (ledgerCodes.has(l.code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate ledger code: "${l.code}"`,
        path: ['ledgers', i, 'code'],
      });
    }
    ledgerCodes.add(l.code);

    if (!groupMap.has(l.groupKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Referenced groupKey "${l.groupKey}" not found in catalogue`,
        path: ['ledgers', i, 'groupKey'],
      });
    }
  });
});

export type CoaCatalogue = z.infer<typeof CoaCatalogueSchema>;

export function validateCoaCatalogue(json: unknown): CoaCatalogue {
  return CoaCatalogueSchema.parse(json);
}

export function loadStandardCoaCatalogue(): CoaCatalogue {
  const jsonPath = path.resolve(__dirname, '../seed-data/coa-v1.json');
  const fallbackPath = path.resolve(__dirname, '../../seed-data/coa-v1.json');
  const targetPath = fs.existsSync(jsonPath) ? jsonPath : fallbackPath;
  const content = fs.readFileSync(targetPath, 'utf-8');
  return validateCoaCatalogue(JSON.parse(content));
}
