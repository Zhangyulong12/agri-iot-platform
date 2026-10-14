import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { Environment } from './config/environment.js';
import { setupApp } from './setup-app.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  const config = app.get(ConfigService<Environment, true>);
  const port = config.get('PORT', { infer: true });
  const host = config.get('HOST', { infer: true });
  await app.listen(port, host);
  Logger.log(`API listening on http://${host}:${port}/api/v1`, 'Bootstrap');
}

void bootstrap().catch(() => {
  Logger.error(
    'API startup failed. Check environment configuration and port availability.',
    'Bootstrap',
  );
  process.exitCode = 1;
});
