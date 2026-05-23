import {
  ClassProvider,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import Redis from 'ioredis';
import { Card, CardStatusValue } from '@contracts/types/cloud-event.types';
import {
  CARD_REQUEST_REPOSITORY,
  CardRequestUpdatePort,
} from '../../domain/card-request.repository.port';

const KEY_PREFIX = 'card:request:';

@Injectable()
class RedisCardRequestRepository
  implements CardRequestUpdatePort, OnModuleInit, OnModuleDestroy
{
  private client: Redis;

  constructor(
    @InjectPinoLogger(RedisCardRequestRepository.name)
    private readonly logger: PinoLogger,
  ) {
    this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      lazyConnect: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.info('Redis connected (card-processor)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async updateStatus(
    requestId: string,
    status: CardStatusValue,
    card?: Card,
    errorMessage?: string,
  ): Promise<void> {
    const key = KEY_PREFIX + requestId;
    const raw = await this.client.get(key);

    if (!raw) {
      this.logger.warn({ requestId }, 'Card request not found for update');
      return;
    }

    const data = JSON.parse(raw);
    data.status = status;
    data.updatedAt = new Date().toISOString();

    if (card) data.card = card;
    if (errorMessage) data.errorMessage = errorMessage;

    const ttl = await this.client.ttl(key);
    await this.client.setex(key, ttl > 0 ? ttl : 86400, JSON.stringify(data));
  }
}

export const RedisRepositoryProvider: ClassProvider = {
  provide: CARD_REQUEST_REPOSITORY,
  useClass: RedisCardRequestRepository,
};
