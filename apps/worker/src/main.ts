import * as fs from 'fs';
import * as path from 'path';

for (const p of [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/api/.env'),
  path.resolve(__dirname, '../../../api/.env'),
]) {
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf-8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const idx = t.indexOf('=');
      if (idx > 0) {
        const k = t.slice(0, idx).trim();
        const v = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
}

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

