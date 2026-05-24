import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Producer, ProducerRecord } from 'kafkajs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CloudEvent } from '@contracts/types/cloud-event.types';
import { KafkaClientService } from './kafka.client';
import { KafkaAdminService } from './kafka.admin';
import { TOPICS } from './kafka.topics';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private producer: Producer;

  constructor(
    private readonly client: KafkaClientService,
    private readonly admin: KafkaAdminService,
    @InjectPinoLogger(KafkaProducerService.name)
    private readonly logger: PinoLogger,
  ) {
    this.producer = this.client.kafka.producer();
  }

  async onModuleInit(): Promise<void> {
    await this.admin.ensureTopics(Object.values(TOPICS));
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
      messages: [{ key: event.source, value: JSON.stringify(event) }],
    };

    await this.producer.send(record);

    this.logger.info(
      { event: event.type, source: event.source, id: event.id },
      'Event published',
    );
  }
}
