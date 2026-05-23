import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { setAppInitialized } from '@logger/logger.config';
import { ConfigService } from '@nestjs/config';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = app.get(Logger);

  app.useLogger(logger);
  app.use(helmet());
  app.use(compression());

  const port = Number(config.get('PORT') ?? 3000);
  await app.listen(port);

  logger.log(`card-issuer running on port ${port}`, 'Bootstrap');
  setAppInitialized();
};

bootstrap().catch((error) => {
  console.error('Failed to start card-issuer', error);
  process.exit(1);
});
