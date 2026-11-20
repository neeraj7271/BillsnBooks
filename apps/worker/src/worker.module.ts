import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { OutboxDispatcherService } from './processors/outbox.processor';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'accounting_user',
      password: process.env.DATABASE_PASSWORD || 'accounting_password',
      database: process.env.DATABASE_NAME || 'accounting_platform',
      synchronize: false,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
  ],
  providers: [OutboxDispatcherService],
  exports: [OutboxDispatcherService],
})
export class WorkerModule {}

