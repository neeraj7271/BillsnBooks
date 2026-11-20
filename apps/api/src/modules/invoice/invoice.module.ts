import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceOrmEntity } from '../../infrastructure/persistence/entities/invoice.orm-entity';
import { InvoiceItemOrmEntity } from '../../infrastructure/persistence/entities/invoice-item.orm-entity';
import { PartyOrmEntity } from '../../infrastructure/persistence/entities/party.orm-entity';
import { ItemOrmEntity } from '../../infrastructure/persistence/entities/item.orm-entity';
import { BranchOrmEntity } from '../../infrastructure/persistence/entities/branch.orm-entity';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { ApprovalRequestOrmEntity } from '../../infrastructure/persistence/entities/approval-request.orm-entity';
import { NotificationOrmEntity } from '../../infrastructure/persistence/entities/notification.orm-entity';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { VoucherModule } from '../voucher/voucher.module';
import { NumberingModule } from '../numbering/numbering.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvoiceOrmEntity,
      InvoiceItemOrmEntity,
      PartyOrmEntity,
      ItemOrmEntity,
      BranchOrmEntity,
      LedgerOrmEntity,
      ApprovalRequestOrmEntity,
      NotificationOrmEntity,
    ]),
    VoucherModule,
    NumberingModule,
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}

