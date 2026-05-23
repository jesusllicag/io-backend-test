import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EachMessagePayload } from 'kafkajs';
import { KafkaConsumerService } from '@kafka/kafka.consumer';
import { TOPICS } from '@kafka/kafka.topics';
import { CloudEvent } from '@contracts/types/cloud-event.types';
import { CardRequestedData } from '@contracts/events/card-requested.event';
import { ProcessCardUseCase } from '../../application/process-card.use-case';

@Injectable()
export class CardRequestedConsumer implements OnModuleInit {
  constructor(
    private readonly consumer: KafkaConsumerService,
    private readonly processCard: ProcessCardUseCase,
    @InjectPinoLogger(CardRequestedConsumer.name)
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.consumer.subscribe(
      'card-processor-group',
      [TOPICS.CARD_REQUESTED],
      (payload) => this.handleMessage(payload),
    );
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const raw = payload.message.value?.toString();

    if (!raw) {
      this.logger.warn('Received empty message, skipping');
      return;
    }

    let event: CloudEvent<CardRequestedData>;

    try {
      event = JSON.parse(raw) as CloudEvent<CardRequestedData>;
    } catch {
      this.logger.error({ raw }, 'Failed to parse Kafka message');
      return;
    }

    this.logger.info(
      {
        requestId: event.data.requestId,
        event: event.type,
        id: event.id,
      },
      'Received card requested event',
    );

    await this.processCard.execute(event.data);
  }
}
