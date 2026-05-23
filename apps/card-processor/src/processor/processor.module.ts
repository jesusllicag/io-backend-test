import { Module } from '@nestjs/common';
import { KafkaModule } from '@kafka/kafka.module';
import { ProcessCardUseCase } from './application/process-card.use-case';
import { CardRequestedConsumer } from './infrastructure/kafka/card-requested.consumer';
import { RedisRepositoryProvider } from './infrastructure/persistence/redis-card-request.repository';
import { KafkaEventPublisherProvider } from './infrastructure/kafka/kafka-event-publisher.adapter';
import { CardIssuanceSimulator } from './infrastructure/external/card-issuance-simulator';

@Module({
  imports: [KafkaModule],
  providers: [
    ProcessCardUseCase,
    CardRequestedConsumer,
    CardIssuanceSimulator,
    RedisRepositoryProvider,
    KafkaEventPublisherProvider,
  ],
})
export class ProcessorModule {}
