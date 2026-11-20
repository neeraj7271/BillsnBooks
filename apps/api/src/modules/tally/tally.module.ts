import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TallyController } from './tally.controller';
import { TallyGatewayService } from './tally-gateway.service';
import { TallyConnectorOrmEntity } from '../../infrastructure/persistence/entities/tally-connector.orm-entity';
import { TallyMasterOrmEntity } from '../../infrastructure/persistence/entities/tally-master.orm-entity';
import { TallyPostingLogOrmEntity } from '../../infrastructure/persistence/entities/tally-posting-log.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TallyConnectorOrmEntity,
      TallyMasterOrmEntity,
      TallyPostingLogOrmEntity,
    ]),
  ],
  controllers: [TallyController],
  providers: [TallyGatewayService],
  exports: [TallyGatewayService],
})
export class TallyModule {}

