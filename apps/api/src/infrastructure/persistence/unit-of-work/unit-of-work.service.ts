import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  companyId?: string;
  roles?: string[];
}

@Injectable()
export class UnitOfWorkService {
  private static asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

  constructor(private readonly dataSource: DataSource) {}

  public static runWithContext<R>(context: TenantContext, fn: () => Promise<R>): Promise<R> {
    return this.asyncLocalStorage.run(context, fn);
  }

  public static getContext(): TenantContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Executes a callback within a managed transaction that enforces RLS
   * by calling set_config('app.tenant_id', :tenantId, true).
   */
  async executeInTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const context = UnitOfWorkService.getContext();

    try {
      if (context?.tenantId) {
        // Enforce PostgreSQL Row-Level Security inside transaction using set_config (safe parameterized SET LOCAL)
        await queryRunner.query(`SELECT set_config('app.tenant_id', $1, true)`, [context.tenantId]);
      }

      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

