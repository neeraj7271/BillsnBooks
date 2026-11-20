import { Injectable } from '@nestjs/common';
import { UnitOfWorkService } from '../../infrastructure/persistence/unit-of-work/unit-of-work.service';
import { NotificationOrmEntity } from '../../infrastructure/persistence/entities/notification.orm-entity';
import { AppNotificationDto } from '@platform/shared-types';

@Injectable()
export class NotificationService {
  constructor(private readonly uow: UnitOfWorkService) {}

  async listNotifications(
    tenantId: string,
    userId: string,
    limit = 20,
  ): Promise<AppNotificationDto[]> {
    return this.uow.executeInTransaction(async (qr) => {
      const entities = await qr.manager.find(NotificationOrmEntity, {
        where: { tenantId, userId },
        order: { createdAt: 'DESC' },
        take: limit,
      });

      return entities.map((n) => ({
        id: n.id,
        tenantId: n.tenantId,
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type,
        entityType: n.entityType,
        entityId: n.entityId,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      }));
    });
  }

  async markAsRead(tenantId: string, notificationId: string): Promise<void> {
    await this.uow.executeInTransaction(async (qr) => {
      await qr.manager.update(
        NotificationOrmEntity,
        { id: notificationId, tenantId },
        { isRead: true },
      );
    });
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<void> {
    await this.uow.executeInTransaction(async (qr) => {
      await qr.manager.update(
        NotificationOrmEntity,
        { tenantId, userId, isRead: false },
        { isRead: true },
      );
    });
  }
}

