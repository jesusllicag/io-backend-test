import { Module } from '@nestjs/common';
import { AppLoggerModule } from '@logger/logger.module';
import { ProcessorModule } from './processor/processor.module';

@Module({
  imports: [AppLoggerModule.forService('card-processor'), ProcessorModule],
})
export class AppModule {}
