import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NumberingSeriesOrmEntity } from '../../infrastructure/persistence/entities/numbering-series.orm-entity';
import { NumberAllocationOrmEntity } from '../../infrastructure/persistence/entities/number-allocation.orm-entity';
import { NumberingService } from './numbering.service';
import { NumberingController } from './numbering.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NumberingSeriesOrmEntity,
      NumberAllocationOrmEntity,
    ]),
  ],
  providers: [NumberingService],
  controllers: [NumberingController],
  exports: [NumberingService],
})
export class NumberingModule {}

