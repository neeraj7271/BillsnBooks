import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankingController } from './banking.controller';
import { BankingService } from './banking.service';
import { BankParserService } from './bank-parser.service';
import { NarrationTokenizerService } from './narration-tokenizer.service';
import { ReconciliationService } from './reconciliation.service';
import { SalesDiscoveryService } from './sales-discovery.service';
import { BankAccountOrmEntity } from '../../infrastructure/persistence/entities/bank-account.orm-entity';
import { BankStatementOrmEntity } from '../../infrastructure/persistence/entities/bank-statement.orm-entity';
import { BankTransactionOrmEntity } from '../../infrastructure/persistence/entities/bank-transaction.orm-entity';
import { BankReconciliationItemOrmEntity } from '../../infrastructure/persistence/entities/bank-reconciliation-item.orm-entity';
import { SalesDiscoveryTicketOrmEntity } from '../../infrastructure/persistence/entities/sales-discovery-ticket.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BankAccountOrmEntity,
      BankStatementOrmEntity,
      BankTransactionOrmEntity,
      BankReconciliationItemOrmEntity,
      SalesDiscoveryTicketOrmEntity,
    ]),
  ],
  controllers: [BankingController],
  providers: [
    BankingService,
    BankParserService,
    NarrationTokenizerService,
    ReconciliationService,
    SalesDiscoveryService,
  ],
  exports: [BankingService, ReconciliationService, SalesDiscoveryService],
})
export class BankingModule {}
