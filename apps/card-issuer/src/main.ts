import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { setAppInitialized } from '@logger/logger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);

  app.useLogger(logger);
  app.use(helmet());
  app.use(compression());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logger.log(`card-issuer running on port ${port}`, 'Bootstrap');
  setAppInitialized();
}

bootstrap();
