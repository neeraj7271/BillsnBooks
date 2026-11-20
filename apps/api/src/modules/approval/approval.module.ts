import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalRequestOrmEntity } from '../../infrastructure/persistence/entities/approval-request.orm-entity';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApprovalRequestOrmEntity]),
    forwardRef(() => InvoiceModule),
  ],
  controllers: [ApprovalController],
  providers: [ApprovalService],
  exports: [ApprovalService],
})
export class ApprovalModule {}

