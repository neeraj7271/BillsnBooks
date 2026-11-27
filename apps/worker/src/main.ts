import './load-env';

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';
import { OutboxDispatcherService } from './processors/outbox.processor';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  const app = await NestFactory.createApplicationContext(WorkerModule);

  const outboxService = app.get(OutboxDispatcherService);
  logger.log('Background Worker started. Polling outbox queue...');

  // Periodic polling interval
  setInterval(async () => {
    await outboxService.dispatchPendingOutboxEvents();
  }, 1000);
}

bootstrap().catch((err) => {
  console.error('Fatal worker error:', err);
  process.exit(1);
});

