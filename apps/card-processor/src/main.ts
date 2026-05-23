import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { setAppInitialized } from '@logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);
  app.useLogger(logger);

  await app.init();

  logger.log('card-processor started - listening for Kafka events');
  setAppInitialized();
}

bootstrap();
