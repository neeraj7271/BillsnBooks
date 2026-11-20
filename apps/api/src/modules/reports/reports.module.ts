import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportExportService } from './report-export.service';
import { ReportShareService } from './report-share.service';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { LedgerGroupOrmEntity } from '../../infrastructure/persistence/entities/ledger-group.orm-entity';
import { VoucherOrmEntity } from '../../infrastructure/persistence/entities/voucher.orm-entity';
import { JournalEntryOrmEntity } from '../../infrastructure/persistence/entities/journal-entry.orm-entity';
import { UserFavoriteReportOrmEntity } from '../../infrastructure/persistence/entities/user-favorite-report.orm-entity';
import { ReportShareOrmEntity } from '../../infrastructure/persistence/entities/report-share.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LedgerOrmEntity,
      LedgerGroupOrmEntity,
      VoucherOrmEntity,
      JournalEntryOrmEntity,
      UserFavoriteReportOrmEntity,
      ReportShareOrmEntity,
    ]),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportExportService,
    ReportShareService,
  ],
  exports: [
    ReportsService,
    ReportExportService,
    ReportShareService,
  ],
})
export class ReportsModule {}
