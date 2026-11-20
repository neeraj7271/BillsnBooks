import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './infrastructure/persistence/data-source';
import { PersistenceModule } from './infrastructure/persistence/persistence.module';
import { AuthModule } from './modules/auth/auth.module';
import { VoucherModule } from './modules/voucher/voucher.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { ImportModule } from './modules/import/import.module';
import { TallyModule } from './modules/tally/tally.module';
import { BankingModule } from './modules/banking/banking.module';
import { CompanyModule } from './modules/company/company.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { PeriodModule } from './modules/period/period.module';
import { ReportsModule } from './modules/reports/reports.module';
import { PartyModule } from './modules/party/party.module';
import { ItemModule } from './modules/item/item.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PracticeModule } from './modules/practice/practice.module';
import { CollectionsModule } from './modules/collections/collections.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NumberingModule } from './modules/numbering/numbering.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot(AppDataSource.options),
    PersistenceModule,
    AuthModule,
    VoucherModule,
    IntelligenceModule,
    ImportModule,
    TallyModule,
    BankingModule,
    CompanyModule,
    LedgerModule,
    PeriodModule,
    ReportsModule,
    PartyModule,
    ItemModule,
    InvoiceModule,
    ApprovalModule,
    NotificationModule,
    PracticeModule,
    CollectionsModule,
    MetricsModule,
    SettingsModule,
    NumberingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
