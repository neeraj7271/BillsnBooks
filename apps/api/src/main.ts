import * as fs from 'fs';
import * as path from 'path';

// Load environment variables before any configuration assertion
function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val.replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env'));
loadEnvFile(path.resolve(process.cwd(), 'apps/api/.env'));
loadEnvFile(path.resolve(__dirname, '../../.env'));
loadEnvFile(path.resolve(__dirname, '../.env'));

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/domain-exception.filter';
import { assertSecretsConfigured } from './common/config/secrets';

async function bootstrap() {
  const logger = new Logger('ApiBootstrap');

  // Fail fast if security-critical secrets are missing or weak.
  assertSecretsConfigured();

  const app = await NestFactory.create(AppModule);

  // Support high-resolution company logos, signatures, and document payloads (up to 25MB)
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));

  const cookieMiddleware = typeof cookieParser === 'function' ? cookieParser : (cookieParser as any).default;
  if (typeof cookieMiddleware === 'function') {
    app.use(cookieMiddleware());
  }
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser clients (curl, server-to-server) send no Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      // Localhost is permitted only outside production, for local development.
      if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger OpenAPI Setup
  const config = new DocumentBuilder()
    .setTitle('End-to-End Accounting Platform API')
    .setDescription('Authoritative Double-Entry Accounting, GST Compliance & Tally Integration API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('v1/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`Accounting API running on http://localhost:${port}`);
  logger.log(`OpenAPI documentation available on http://localhost:${port}/v1/docs`);
}

bootstrap().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});

