import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Consumer, EachMessagePayload } from 'kafkajs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { KafkaClientService } from './kafka.client';

export type MessageHandler = (payload: EachMessagePayload) => Promise<void>;

@Injectable()
export class KafkaConsumerService implements OnModuleDestroy {
  private readonly consumers = new Map<string, Consumer>();

  constructor(
    @InjectPinoLogger(KafkaConsumerService.name)
    private readonly logger: PinoLogger,
    private readonly client: KafkaClientService,
  ) {}

  async subscribe(
    groupId: string,
    topics: string[],
    handler: MessageHandler,
  ): Promise<void> {
    const consumer = this.client.kafka.consumer({ groupId });
    await consumer.connect();

    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }

    await consumer.run({
      eachMessage: async (payload) => {
        try {
          await this.handleMessage(payload, handler);
        } catch (error: unknown) {
          this.handleErrorMessage(payload, error);
          throw error;
        }
      },
    });

    if (this.consumers.has(groupId)) {
      throw new Error(`Consumer group ${groupId} already exists`);
    }
    this.consumers.set(groupId, consumer);
    this.logger.info({ groupId, topics }, 'Kafka consumer started');
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      Array.from(this.consumers.values()).map((c) => c.disconnect()),
    );
    this.logger.info('Kafka consumers disconnected');
  }

  private async handleMessage(
    payload: EachMessagePayload,
    handler: MessageHandler,
  ): Promise<void> {
    this.logger.info(
      {
        topic: payload.topic,
        offset: payload.message.offset,
      },
      'Message received',
    );
    await handler(payload);
  }

  private handleErrorMessage(
    payload: EachMessagePayload,
    error: unknown,
  ): void {
    this.logger.error(
      {
        error,
        topic: payload.topic,
        offset: payload.message.offset,
      },
      'Message processing failed',
    );
  }
}
