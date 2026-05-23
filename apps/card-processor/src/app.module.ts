import { Module } from '@nestjs/common';
import { AppLoggerModule } from '@logger/logger.module';
import { ProcessorModule } from './processor/processor.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    AppLoggerModule.forService('card-processor'),
    ProcessorModule,
    ConfigModule.forRoot(),
  ],
})
export class AppModule {}
