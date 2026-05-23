import { Module } from '@nestjs/common';
import { KafkaProducerService } from './kafka.producer';
import { KafkaConsumerService } from './kafka.consumer';
import { KafkaAdminService } from './kafka.admin';
import { KafkaClientService } from './kafka.client';
import { AppLoggerModule } from '@logger';

@Module({
  imports: [AppLoggerModule.forService('kafka')],
  providers: [
    KafkaClientService,
    KafkaAdminService,
    KafkaProducerService,
    KafkaConsumerService,
  ],
  exports: [KafkaProducerService, KafkaConsumerService],
})
export class KafkaModule {}
