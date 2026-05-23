import { Module } from '@nestjs/common';
import { KafkaModule } from '@kafka/kafka.module';
import { ProcessCardUseCase } from './application/process-card.use-case';
import { CardRequestedConsumer } from './infrastructure/kafka/card-requested.consumer';
import { RedisCardRequestRepository } from './infrastructure/persistence/redis-card-request.repository';
import { KafkaEventPublisherAdapter } from './infrastructure/kafka/kafka-event-publisher.adapter';
import { CardIssuanceSimulator } from './infrastructure/external/card-issuance-simulator';
import { CARD_REQUEST_REPOSITORY } from './domain/card-request.repository.port';
import { EVENT_PUBLISHER } from './domain/event-publisher.port';

@Module({
  imports: [KafkaModule],
  providers: [
    ProcessCardUseCase,
    CardRequestedConsumer,
    CardIssuanceSimulator,
    {
      provide: CARD_REQUEST_REPOSITORY,
      useClass: RedisCardRequestRepository,
    },
    {
      provide: EVENT_PUBLISHER,
      useClass: KafkaEventPublisherAdapter,
    },
  ],
})
export class ProcessorModule {}
