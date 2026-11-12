import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const port = Number(process.env.PORT ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const app = await NestFactory.create(AppModule);
  setupApp(app);
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  logger.log(`API: http://localhost:${port}`);
  logger.log(`Swagger: http://localhost:${port}/docs`);
}

void bootstrap().catch((error: unknown) => {
  logger.error(error);
  process.exitCode = 1;
});
