import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';
import { ChartOfAccountsSeeder } from './coa-seeder.service';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { LedgerGroupOrmEntity } from '../../infrastructure/persistence/entities/ledger-group.orm-entity';
import { CompanyOrmEntity } from '../../infrastructure/persistence/entities/company.orm-entity';
import { JournalEntryOrmEntity } from '../../infrastructure/persistence/entities/journal-entry.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LedgerOrmEntity,
      LedgerGroupOrmEntity,
      CompanyOrmEntity,
      JournalEntryOrmEntity,
    ]),
  ],
  controllers: [LedgerController],
  providers: [LedgerService, ChartOfAccountsSeeder],
  exports: [LedgerService, ChartOfAccountsSeeder],
})
export class LedgerModule {}
