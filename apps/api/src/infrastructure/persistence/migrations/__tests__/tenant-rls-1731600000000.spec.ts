import { QueryRunner } from 'typeorm';
import { TenantRlsCollectionsAndRemainingTables1731600000000 } from '../1731600000000-TenantRlsCollectionsAndRemainingTables';

describe('Migration 1731600000000 (up -> down -> up)', () => {
  it('applies, reverts, and re-applies RLS policies and token resolver cleanly', async () => {
    const migration = new TenantRlsCollectionsAndRemainingTables1731600000000();
    const executedSql: string[] = [];
    const mockQr = {
      query: jest.fn(async (sql: string) => {
        executedSql.push(sql);
        return [];
      }),
    } as unknown as QueryRunner;

    // 1. UP
    await migration.up(mockQr);
    expect(executedSql.some((s) => s.includes('ALTER TABLE "payment_links" ENABLE ROW LEVEL SECURITY'))).toBe(true);
    expect(executedSql.some((s) => s.includes('ALTER TABLE "report_shares" FORCE ROW LEVEL SECURITY'))).toBe(true);
    expect(executedSql.some((s) => s.includes('resolve_shared_report_by_token'))).toBe(true);
    const upCount = executedSql.length;

    // 2. DOWN
    executedSql.length = 0;
    await migration.down(mockQr);
    expect(executedSql.some((s) => s.includes('DROP FUNCTION IF EXISTS resolve_shared_report_by_token'))).toBe(true);
    expect(executedSql.some((s) => s.includes('ALTER TABLE "payment_links" DISABLE ROW LEVEL SECURITY'))).toBe(true);
    expect(executedSql.some((s) => s.includes('ALTER TABLE "report_shares" DISABLE ROW LEVEL SECURITY'))).toBe(true);

    // 3. RE-UP
    executedSql.length = 0;
    await migration.up(mockQr);
    expect(executedSql.length).toBe(upCount);
  });
});
