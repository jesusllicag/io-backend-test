import { Module } from '@nestjs/common';
import { AppLoggerModule } from '@logger/logger.module';
import { CardsModule } from './cards/cards.module';
import { ConfigModule } from '@nestjs/config';
import { LoggingInterceptorProvider } from './interceptors/logging.interceptor';

@Module({
  imports: [
    AppLoggerModule.forService('card-issuer'),
    CardsModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  providers: [LoggingInterceptorProvider],
})
export class AppModule {}
