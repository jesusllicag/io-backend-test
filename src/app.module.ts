import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from 'nestjs-pino';
import {
  CORRELATION_ID_HEADER,
  CorrelationIdMiddleware,
} from './correlation-id/correlation-id.middleware';
import { Request } from 'express';

@Module({
  imports: [LoggerModule.forRoot({
    pinoHttp: {
      transport: {
        target: 'pino-pretty',
      },
      customProps: (req: Request) => {
        return {
          correlationId: req[CORRELATION_ID_HEADER],
        }
      },
      autoLogging: false,
      serializers: {
        req: () => undefined,
        res: () => undefined,
      }
    },
  })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
