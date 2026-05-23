import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Consumer, EachMessagePayload, Kafka } from 'kafkajs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export type MessageHandler = (payload: EachMessagePayload) => Promise<void>;

@Injectable()
export class KafkaConsumerService implements OnModuleDestroy {
  private consumers: Consumer[] = [];

  constructor(
    @InjectPinoLogger(KafkaConsumerService.name)
    private readonly logger: PinoLogger,
  ) {}

  async subscribe(
    groupId: string,
    topics: string[],
    handler: MessageHandler,
  ): Promise<void> {
    const kafka = new Kafka({
      clientId: process.env.SERVICE_NAME ?? 'io-service',
      brokers: (process.env.KAFKA_BROKER ?? 'localhost:9092').split(','),
    });

    const consumer = kafka.consumer({ groupId });

    await consumer.connect();

    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }

    await consumer.run({
      eachMessage: async (payload) => {
        this.logger.info(
          { topic: payload.topic, offset: payload.message.offset },
          'Message received',
        );
        await handler(payload);
      },
    });

    this.consumers.push(consumer);
    this.logger.info({ groupId, topics }, 'Kafka consumer started');
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.consumers.map((c) => c.disconnect()));
    this.logger.info('Kafka consumers disconnected');
  }
}
