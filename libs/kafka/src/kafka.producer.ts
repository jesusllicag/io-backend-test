import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CloudEvent } from '@contracts/types/cloud-event.types';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private producer: Producer;

  constructor(
    @InjectPinoLogger(KafkaProducerService.name)
    private readonly logger: PinoLogger,
  ) {
    const kafka = new Kafka({
      clientId: process.env.SERVICE_NAME ?? 'io-service',
      brokers: (process.env.KAFKA_BROKER ?? 'localhost:9092').split(','),
      retry: { retries: 5 },
    });

    this.producer = kafka.producer();
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
    this.logger.info('Kafka producer connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
    this.logger.info('Kafka producer disconnected');
  }

  async publish<T>(topic: string, event: CloudEvent<T>): Promise<void> {
    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key: event.source,
          value: JSON.stringify(event),
        },
      ],
    };

    await this.producer.send(record);

    this.logger.info(
      { event: event.type, source: event.source, id: event.id },
      'Event published',
    );
  }
}
