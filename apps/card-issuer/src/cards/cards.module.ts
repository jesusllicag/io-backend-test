import { Module } from '@nestjs/common';
import { KafkaModule } from '@kafka/kafka.module';
import { CardsController } from './infrastructure/http/cards.controller';
import { IssueCardUseCase } from './application/issue-card.use-case';
import { RedisProvider } from './infrastructure/persistence/redis-card-request.repository';
import { KafkaEventPublisherProvider } from './infrastructure/kafka/kafka-event-publisher.adapter';

@Module({
  imports: [KafkaModule],
  controllers: [CardsController],
  providers: [IssueCardUseCase, RedisProvider, KafkaEventPublisherProvider],
})
export class CardsModule {}
