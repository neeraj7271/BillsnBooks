import * as fs from 'fs';
import * as path from 'path';
import { validateCoaCatalogue, BusinessTemplate } from '../src/seed-validator';

describe('Chart of Accounts Seed Catalogue (coa-v1.json)', () => {
  const cataloguePath = path.resolve(__dirname, '../seed-data/coa-v1.json');

  it('exists on disk and contains valid JSON', () => {
    expect(fs.existsSync(cataloguePath)).toBe(true);
    const raw = fs.readFileSync(cataloguePath, 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('passes strict Zod validation with 0 errors', () => {
    const raw = fs.readFileSync(cataloguePath, 'utf-8');
    const json = JSON.parse(raw);
    const catalogue = validateCoaCatalogue(json);

    expect(catalogue.version).toBe('v1.0');
    expect(catalogue.groups.length).toBeGreaterThanOrEqual(28);
    expect(catalogue.ledgers.length).toBeGreaterThanOrEqual(30);
  });

  it('guarantees unique 4-digit codes across all groups and ledgers', () => {
    const raw = fs.readFileSync(cataloguePath, 'utf-8');
    const catalogue = validateCoaCatalogue(JSON.parse(raw));

    const groupCodes = catalogue.groups.map((g) => g.code);
    expect(new Set(groupCodes).size).toBe(groupCodes.length);

    const ledgerCodes = catalogue.ledgers.map((l) => l.code);
    expect(new Set(ledgerCodes).size).toBe(ledgerCodes.length);
  });

  it('guarantees parent-nature consistency on all sub-groups', () => {
    const raw = fs.readFileSync(cataloguePath, 'utf-8');
    const catalogue = validateCoaCatalogue(JSON.parse(raw));

    const groupMap = new Map(catalogue.groups.map((g) => [g.systemKey, g]));

    for (const group of catalogue.groups) {
      if (group.parentGroupKey) {
        const parent = groupMap.get(group.parentGroupKey);
        expect(parent).toBeDefined();
        expect(group.nature).toBe(parent!.nature);
      }
    }
  });

  it('includes mandatory locked platform accounts (Cash, Profit & Loss, Round Off)', () => {
    const raw = fs.readFileSync(cataloguePath, 'utf-8');
    const catalogue = validateCoaCatalogue(JSON.parse(raw));

    const cash = catalogue.ledgers.find((l) => l.systemKey === 'LED_CASH');
    expect(cash).toBeDefined();
    expect(cash!.isLocked).toBe(true);
    expect(cash!.isBankOrCash).toBe(true);

    const pl = catalogue.ledgers.find((l) => l.systemKey === 'LED_PROFIT_LOSS');
    expect(pl).toBeDefined();
    expect(pl!.isLocked).toBe(true);

    const roundOff = catalogue.ledgers.find((l) => l.systemKey === 'LED_ROUND_OFF');
    expect(roundOff).toBeDefined();
    expect(roundOff!.isLocked).toBe(true);
  });

  it('filters cleanly by BusinessTemplate without dangling group references', () => {
    const raw = fs.readFileSync(cataloguePath, 'utf-8');
    const catalogue = validateCoaCatalogue(JSON.parse(raw));

    for (const template of Object.values(BusinessTemplate)) {
      const groupsForTemplate = catalogue.groups.filter((g) => g.templates.includes(template));
      const groupKeySet = new Set(groupsForTemplate.map((g) => g.systemKey));

      const ledgersForTemplate = catalogue.ledgers.filter((l) => l.templates.includes(template));

      for (const ledger of ledgersForTemplate) {
        expect(groupKeySet.has(ledger.groupKey)).toBe(true);
      }
    }
  });
});

