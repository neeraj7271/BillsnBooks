import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeriodController } from './period.controller';
import { PeriodService } from './period.service';
import { AccountingPeriodOrmEntity } from '../../infrastructure/persistence/entities/accounting-period.orm-entity';
import { FinancialYearOrmEntity } from '../../infrastructure/persistence/entities/financial-year.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountingPeriodOrmEntity,
      FinancialYearOrmEntity,
    ]),
  ],
  controllers: [PeriodController],
  providers: [PeriodService],
  exports: [PeriodService],
})
export class PeriodModule {}

