import { Module } from '@nestjs/common';
import { KafkaModule } from '@kafka/kafka.module';
import { CardsController } from './infrastructure/http/cards.controller';
import { IssueCardUseCase } from './application/issue-card.use-case';
import { RedisCardRequestRepository } from './infrastructure/persistence/redis-card-request.repository';
import { KafkaEventPublisherAdapter } from './infrastructure/kafka/kafka-event-publisher.adapter';
import { CARD_REQUEST_REPOSITORY } from './domain/card-request.repository.port';
import { EVENT_PUBLISHER } from './domain/event-publisher.port';

@Module({
  imports: [KafkaModule],
  controllers: [CardsController],
  providers: [
    IssueCardUseCase,
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
export class CardsModule {}
