import { Module } from '@nestjs/common';
import { AppLoggerModule } from '@logger/logger.module';
import { CardsModule } from './cards/cards.module';

@Module({
  imports: [
    AppLoggerModule.forService('card-issuer'),
    CardsModule,
  ],
})
export class AppModule {}
