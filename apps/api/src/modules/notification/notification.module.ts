import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationOrmEntity } from '../../infrastructure/persistence/entities/notification.orm-entity';
import { NotificationSettingOrmEntity } from '../../infrastructure/persistence/entities/notification-setting.orm-entity';
import { NotificationDispatchLogOrmEntity } from '../../infrastructure/persistence/entities/notification-dispatch-log.orm-entity';
import { NotificationService } from './notification.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationController } from './notification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationOrmEntity,
      NotificationSettingOrmEntity,
      NotificationDispatchLogOrmEntity,
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationSettingsService,
    NotificationSchedulerService,
  ],
  exports: [
    NotificationService,
    NotificationSettingsService,
    NotificationSchedulerService,
  ],
})
export class NotificationModule {}
