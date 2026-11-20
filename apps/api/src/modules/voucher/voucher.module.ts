import { Module } from '@nestjs/common';
import { VoucherController } from './voucher.controller';
import { VoucherService } from './voucher.service';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { TenantGuard } from '../../common/guards/tenant.guard';

@Module({
  controllers: [VoucherController],
  providers: [VoucherService, UnitOfWorkService, TenantGuard],
  exports: [VoucherService],
})
export class VoucherModule {}

