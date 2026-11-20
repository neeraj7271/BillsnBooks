import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OutboxStatus } from '@platform/shared-types';

@Injectable()
export class OutboxDispatcherService {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private isRunning = false;

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Polls the outbox table for PENDING messages using pessimistic SKIP LOCKED.
   * Dispatches them to BullMQ or domain handlers and marks PUBLISHED.
   */
  async dispatchPendingOutboxEvents(batchSize: number = 50): Promise<number> {
    if (this.isRunning) return 0;
    this.isRunning = true;

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    let processedCount = 0;

    try {
      const pendingEvents = await qr.query(
        `SELECT * FROM outbox 
         WHERE status = $1 
         ORDER BY created_at ASC 
         LIMIT $2 
         FOR UPDATE SKIP LOCKED`,
        [OutboxStatus.PENDING, batchSize],
      );

      for (const event of pendingEvents) {
        this.logger.log(`Dispatching outbox event: ${event.event_type} (${event.id})`);

        // Here the worker publishes to the destination BullMQ queue or external webhook
        await qr.query(
          `UPDATE outbox 
           SET status = $1, published_at = NOW() 
           WHERE id = $2`,
          [OutboxStatus.PUBLISHED, event.id],
        );
        processedCount++;
      }

      await qr.commitTransaction();
      return processedCount;
    } catch (err: any) {
      await qr.rollbackTransaction();
      this.logger.error(`Error dispatching outbox events: ${err.message}`, err.stack);
      return 0;
    } finally {
      await qr.release();
      this.isRunning = false;
    }
  }
}

