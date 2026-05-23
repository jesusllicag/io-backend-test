import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka } from 'kafkajs';

@Injectable()
export class KafkaClientService {
  public readonly kafka: Kafka;

  constructor(private readonly configService: ConfigService) {
    this.kafka = new Kafka({
      clientId: this.configService.get<string>('SERVICE_NAME', 'io-service'),
      brokers: this.configService
        .get<string>('KAFKA_BROKER', 'localhost:9092')
        .split(','),
      retry: { retries: 5 },
    });
  }
}
