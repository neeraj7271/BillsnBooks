import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecurringScheduleOrmEntity } from '../../infrastructure/persistence/entities/recurring-schedule.orm-entity';
import { PaymentLinkOrmEntity } from '../../infrastructure/persistence/entities/payment-link.orm-entity';
import { GatewaySettlementOrmEntity } from '../../infrastructure/persistence/entities/gateway-settlement.orm-entity';
import { CollectionReminderOrmEntity } from '../../infrastructure/persistence/entities/collection-reminder.orm-entity';
import { InvoiceOrmEntity } from '../../infrastructure/persistence/entities/invoice.orm-entity';
import { PartyOrmEntity } from '../../infrastructure/persistence/entities/party.orm-entity';
import { BranchOrmEntity } from '../../infrastructure/persistence/entities/branch.orm-entity';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { LedgerGroupOrmEntity } from '../../infrastructure/persistence/entities/ledger-group.orm-entity';
import { FinancialYearOrmEntity } from '../../infrastructure/persistence/entities/financial-year.orm-entity';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import { VoucherModule } from '../voucher/voucher.module';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecurringScheduleOrmEntity,
      PaymentLinkOrmEntity,
      GatewaySettlementOrmEntity,
      CollectionReminderOrmEntity,
      InvoiceOrmEntity,
      PartyOrmEntity,
      BranchOrmEntity,
      LedgerOrmEntity,
      LedgerGroupOrmEntity,
      FinancialYearOrmEntity,
    ]),
    VoucherModule,
    InvoiceModule,
  ],
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}

