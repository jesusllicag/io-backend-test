import { Injectable } from '@nestjs/common';
import { KafkaProducerService } from '@kafka/kafka.producer';
import { CloudEvent } from '@contracts/types/cloud-event.types';
import { EventPublisherPort } from '../../domain/event-publisher.port';

@Injectable()
export class KafkaEventPublisherAdapter implements EventPublisherPort {
  constructor(private readonly producer: KafkaProducerService) {}

  async publish<T>(topic: string, event: CloudEvent<T>): Promise<void> {
    await this.producer.publish(topic, event);
  }
}
