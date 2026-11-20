import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { AccountingPeriodOrmEntity } from '../../infrastructure/persistence/entities/accounting-period.orm-entity';
import { FinancialYearOrmEntity } from '../../infrastructure/persistence/entities/financial-year.orm-entity';

@Injectable()
export class PeriodService {
  constructor(private readonly uow: UnitOfWorkService) {}

  async listPeriods(
    tenantId: string,
    companyId: string,
    financialYearId?: string,
  ): Promise<AccountingPeriodOrmEntity[]> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const qb = qr.manager
        .getRepository(AccountingPeriodOrmEntity)
        .createQueryBuilder('period')
        .where('period.tenant_id = :tenantId', { tenantId })
        .andWhere('period.company_id = :companyId', { companyId })
        .orderBy('period.start_date', 'ASC');

      if (financialYearId) {
        qb.andWhere('period.financial_year_id = :financialYearId', { financialYearId });
      }

      let periods = await qb.getMany();

      // If no periods exist yet for this financial year, generate them automatically
      if (periods.length === 0) {
        let fyId = financialYearId;
        if (!fyId) {
          const fy = await qr.manager.findOne(FinancialYearOrmEntity, {
            where: { tenantId, companyId, isClosed: false },
            order: { startDate: 'DESC' },
          });
          if (fy) fyId = fy.id;
        }

        if (fyId) {
          await this.generateMonthlyPeriods(qr, tenantId, companyId, fyId);
          periods = await qb.getMany();
        }
      }

      return periods;
    });
  }

  async lockPeriod(
    tenantId: string,
    companyId: string,
    periodId: string,
    userId: string,
  ): Promise<AccountingPeriodOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const period = await qr.manager.findOne(AccountingPeriodOrmEntity, {
        where: { id: periodId, tenantId, companyId },
      });

      if (!period) {
        throw new NotFoundException(`Accounting period ${periodId} not found.`);
      }

      period.isLocked = true;
      period.lockedAt = new Date();
      period.lockedBy = userId;

      return await qr.manager.save(AccountingPeriodOrmEntity, period);
    });
  }

  async unlockPeriod(
    tenantId: string,
    companyId: string,
    periodId: string,
  ): Promise<AccountingPeriodOrmEntity> {
    return this.uow.executeInTransaction(async (qr: QueryRunner) => {
      const period = await qr.manager.findOne(AccountingPeriodOrmEntity, {
        where: { id: periodId, tenantId, companyId },
      });

      if (!period) {
        throw new NotFoundException(`Accounting period ${periodId} not found.`);
      }

      period.isLocked = false;
      period.lockedAt = null;
      period.lockedBy = null;

      return await qr.manager.save(AccountingPeriodOrmEntity, period);
    });
  }

  async isDateLocked(
    qr: QueryRunner,
    tenantId: string,
    companyId: string,
    dateStr: string,
  ): Promise<boolean> {
    const lockedPeriod = await qr.manager
      .createQueryBuilder(AccountingPeriodOrmEntity, 'period')
      .where('period.tenant_id = :tenantId', { tenantId })
      .andWhere('period.company_id = :companyId', { companyId })
      .andWhere('period.is_locked = true')
      .andWhere(':date BETWEEN period.start_date AND period.end_date', { date: dateStr })
      .getOne();

    return !!lockedPeriod;
  }

  private async generateMonthlyPeriods(
    qr: QueryRunner,
    tenantId: string,
    companyId: string,
    financialYearId: string,
  ): Promise<void> {
    const fy = await qr.manager.findOne(FinancialYearOrmEntity, {
      where: { id: financialYearId, tenantId, companyId },
    });

    if (!fy) return;

    const startYear = parseInt(fy.startDate.split('-')[0], 10);
    const months = [
      { name: 'Apr', start: `${startYear}-04-01`, end: `${startYear}-04-30` },
      { name: 'May', start: `${startYear}-05-01`, end: `${startYear}-05-31` },
      { name: 'Jun', start: `${startYear}-06-01`, end: `${startYear}-06-30` },
      { name: 'Jul', start: `${startYear}-07-01`, end: `${startYear}-07-31` },
      { name: 'Aug', start: `${startYear}-08-01`, end: `${startYear}-08-31` },
      { name: 'Sep', start: `${startYear}-09-01`, end: `${startYear}-09-30` },
      { name: 'Oct', start: `${startYear}-10-01`, end: `${startYear}-10-31` },
      { name: 'Nov', start: `${startYear}-11-01`, end: `${startYear}-11-30` },
      { name: 'Dec', start: `${startYear}-12-01`, end: `${startYear}-12-31` },
      { name: 'Jan', start: `${startYear + 1}-01-01`, end: `${startYear + 1}-01-31` },
      { name: 'Feb', start: `${startYear + 1}-02-01`, end: `${startYear + 1}-02-28` },
      { name: 'Mar', start: `${startYear + 1}-03-01`, end: `${startYear + 1}-03-31` },
    ];

    const entities = months.map((m) =>
      qr.manager.create(AccountingPeriodOrmEntity, {
        tenantId,
        companyId,
        financialYearId,
        periodName: `${m.name} ${m.start.slice(0, 4)}`,
        startDate: m.start,
        endDate: m.end,
        isLocked: false,
      }),
    );

    await qr.manager.save(AccountingPeriodOrmEntity, entities);
  }
}

