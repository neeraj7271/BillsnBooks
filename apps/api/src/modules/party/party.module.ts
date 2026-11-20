import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartyOrmEntity } from '../../infrastructure/persistence/entities/party.orm-entity';
import { PartyRegistrationOrmEntity } from '../../infrastructure/persistence/entities/party-registration.orm-entity';
import { PartyAddressOrmEntity } from '../../infrastructure/persistence/entities/party-address.orm-entity';
import { PartyLedgerLinkOrmEntity } from '../../infrastructure/persistence/entities/party-ledger-link.orm-entity';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { NumberingModule } from '../numbering/numbering.module';
import { PartyService } from './party.service';
import { PartyController } from './party.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PartyOrmEntity,
      PartyRegistrationOrmEntity,
      PartyAddressOrmEntity,
      PartyLedgerLinkOrmEntity,
      LedgerOrmEntity,
    ]),
    NumberingModule,
  ],
  controllers: [PartyController],
  providers: [PartyService],
  exports: [PartyService],
})
export class PartyModule {}
