import { Global, Module } from '@nestjs/common';
import { UnitOfWorkService } from './unit-of-work/unit-of-work.service';

@Global()
@Module({
  providers: [UnitOfWorkService],
  exports: [UnitOfWorkService],
})
export class PersistenceModule {}

