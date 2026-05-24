import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { KafkaClientService } from './kafka.client';

@Injectable()
export class KafkaAdminService {
  constructor(
    @InjectPinoLogger(KafkaAdminService.name)
    private readonly logger: PinoLogger,
    private readonly client: KafkaClientService,
  ) {}

  async ensureTopics(topics: string[]): Promise<void> {
    const admin = this.client.kafka.admin();
    await admin.connect();

    try {
      const created = await admin.createTopics({
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
    } finally {
      await admin.disconnect();
    }
  }
}
