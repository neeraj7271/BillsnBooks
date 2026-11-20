import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { FileParserService } from './file-parser.service';
import { ImportValidationService } from './import-validation.service';
import { ExcelTemplateService } from './excel-template.service';
import { ImportMastersService } from './import-masters.service';
import { ImportBatchOrmEntity } from '../../infrastructure/persistence/entities/import-batch.orm-entity';
import { ImportRowOrmEntity } from '../../infrastructure/persistence/entities/import-row.orm-entity';
import { CompanyOrmEntity } from '../../infrastructure/persistence/entities/company.orm-entity';
import { BranchOrmEntity } from '../../infrastructure/persistence/entities/branch.orm-entity';
import { FinancialYearOrmEntity } from '../../infrastructure/persistence/entities/financial-year.orm-entity';
import { LedgerOrmEntity } from '../../infrastructure/persistence/entities/ledger.orm-entity';
import { PartyOrmEntity } from '../../infrastructure/persistence/entities/party.orm-entity';
import { ItemOrmEntity } from '../../infrastructure/persistence/entities/item.orm-entity';
import { VoucherModule } from '../voucher/voucher.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportBatchOrmEntity,
      ImportRowOrmEntity,
      CompanyOrmEntity,
      BranchOrmEntity,
      FinancialYearOrmEntity,
      LedgerOrmEntity,
      PartyOrmEntity,
      ItemOrmEntity,
    ]),
    VoucherModule,
  ],
  controllers: [ImportController],
  providers: [
    ImportService,
    FileParserService,
    ImportValidationService,
    ExcelTemplateService,
    ImportMastersService,
  ],
  exports: [
    ImportService,
    FileParserService,
    ImportValidationService,
    ExcelTemplateService,
    ImportMastersService,
  ],
})
export class ImportModule {}

