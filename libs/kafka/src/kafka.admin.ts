import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Admin } from 'kafkajs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { KafkaClientService } from './kafka.client';
import { ConfigService } from '@nestjs/config';
import { TOPICS } from './kafka.topics';

@Injectable()
export class KafkaAdminService implements OnModuleInit, OnModuleDestroy {
  private admin!: Admin;

  constructor(
    @InjectPinoLogger(KafkaAdminService.name)
    private readonly logger: PinoLogger,
    private readonly client: KafkaClientService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.admin = this.client.kafka.admin();
    await this.admin.connect();
    this.logger.info('Kafka admin connected');
    this.ensureTopics(Object.values(TOPICS)).catch((error) => {
      throw error;
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.admin.disconnect();
    this.logger.info('Kafka admin disconnected');
  }

  async ensureTopics(topics: string[]): Promise<void> {
    try {
      if (this.configService.get('NODE_ENV') !== 'production') {
        const created = await this.admin.createTopics({
          waitForLeaders: true,
          topics: topics.map((topic) => ({
            topic,
            numPartitions: 1,
            replicationFactor: 1,
          })),
        });
        this.logger.info(
          { topics, created },
          created ? 'Kafka topics created' : 'Kafka topics already exist',
        );
      }
    } catch (error: unknown) {
      this.logger.error({ error, topics }, 'Failed to ensure Kafka topics');
      throw error;
    }
  }
}
