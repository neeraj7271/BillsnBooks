import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingValueOrmEntity } from '../../infrastructure/persistence/entities/setting-value.orm-entity';
import { SettingHistoryOrmEntity } from '../../infrastructure/persistence/entities/setting-history.orm-entity';
import { DocumentSnapshotOrmEntity } from '../../infrastructure/persistence/entities/document-snapshot.orm-entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SettingValueOrmEntity,
      SettingHistoryOrmEntity,
      DocumentSnapshotOrmEntity,
    ]),
  ],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}

