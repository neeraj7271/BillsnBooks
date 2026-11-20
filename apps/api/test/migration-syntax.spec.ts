import { InitialSchemaAndInvariants1730300000000 } from '../src/infrastructure/persistence/migrations/1730300000000-InitialSchemaAndInvariants';

describe('Database Migration: InitialSchemaAndInvariants', () => {
  it('should generate all required tables and database triggers in up()', async () => {
    const migration = new InitialSchemaAndInvariants1730300000000();
    const executedQueries: string[] = [];

    const mockQueryRunner: any = {
      query: jest.fn().mockImplementation((sql: string) => {
        executedQueries.push(sql);
        return Promise.resolve();
      }),
    };

    await migration.up(mockQueryRunner);

    // Verify key tables are created
    expect(executedQueries.some((q) => q.includes('CREATE TABLE tenants'))).toBe(true);
    expect(executedQueries.some((q) => q.includes('CREATE TABLE vouchers'))).toBe(true);
    expect(executedQueries.some((q) => q.includes('CREATE TABLE journal_entries'))).toBe(true);
    expect(executedQueries.some((q) => q.includes('CREATE TABLE outbox'))).toBe(true);
    expect(executedQueries.some((q) => q.includes('CREATE TABLE audit_logs'))).toBe(true);

    // Verify raw SQL database invariant triggers are created
    expect(executedQueries.some((q) => q.includes('trg_verify_voucher_balance()'))).toBe(true);
    expect(executedQueries.some((q) => q.includes('trg_enforce_posted_immutability()'))).toBe(true);
    expect(executedQueries.some((q) => q.includes('trg_check_period_lock()'))).toBe(true);

    // Verify Row-Level Security policies are created
    expect(executedQueries.some((q) => q.includes('ENABLE ROW LEVEL SECURITY'))).toBe(true);
    expect(executedQueries.some((q) => q.includes('tenant_isolation_vouchers'))).toBe(true);
  });

  it('should cleanly drop all triggers, policies, and tables in down()', async () => {
    const migration = new InitialSchemaAndInvariants1730300000000();
    const executedQueries: string[] = [];

    const mockQueryRunner: any = {
      query: jest.fn().mockImplementation((sql: string) => {
        executedQueries.push(sql);
        return Promise.resolve();
      }),
    };

    await migration.down(mockQueryRunner);

    expect(executedQueries.some((q) => q.includes('DROP POLICY IF EXISTS tenant_isolation_vouchers'))).toBe(true);
    expect(executedQueries.some((q) => q.includes('DROP FUNCTION IF EXISTS trg_verify_voucher_balance'))).toBe(true);
    expect(executedQueries.some((q) => q.includes('DROP TABLE IF EXISTS vouchers CASCADE'))).toBe(true);
    expect(executedQueries.some((q) => q.includes('DROP TABLE IF EXISTS tenants CASCADE'))).toBe(true);
  });
});

