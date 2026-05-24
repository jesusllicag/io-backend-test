import {
  ClassProvider,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import Redis from 'ioredis';
import {
  Card,
  CardStatusValue,
  Customer,
  Product,
} from '@contracts/types/cloud-event.types';
import {
  CARD_REQUEST_REPOSITORY,
  CardRequestUpdatePort,
} from '../../domain/card-request.repository.port';
import { ConfigService } from '@nestjs/config';

@Injectable()
class RedisCardRequestRepository
  implements CardRequestUpdatePort, OnModuleInit, OnModuleDestroy
{
  private client: Redis;
  private readonly keyPrefix: string;

  constructor(
    @InjectPinoLogger(RedisCardRequestRepository.name)
    private readonly logger: PinoLogger,
    private readonly env: ConfigService,
  ) {
    this.client = new Redis(
      this.env.get('REDIS_URL', 'redis://localhost:6379'),
      {
        lazyConnect: true,
      },
    );
    this.keyPrefix = this.env.get('KEY_PREFIX', 'card:request:');
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
    const key = this.keyPrefix + requestId;
    const raw = await this.client.get(key);

    if (!raw) {
      this.logger.warn({ requestId }, 'Card request not found for update');
      return;
    }

    const data = JSON.parse(raw) as {
      requestId: string;
      customer: Customer;
      product: Product;
      forceError: boolean;
      status: CardStatusValue;
      card?: Card;
      errorMessage?: string;
      createdAt: string;
      updatedAt: string;
    };
    data.status = status;
    data.updatedAt = new Date().toISOString();

    if (card) data.card = card;
    if (errorMessage) data.errorMessage = errorMessage;

    const ttl = await this.client.ttl(key);
    await this.client.setex(key, ttl > 0 ? ttl : 86400, JSON.stringify(data));
  }

  async deleteByRequestId(requestId: string): Promise<void> {
    await this.client.del(this.keyPrefix + requestId);
    this.logger.info({ requestId }, 'Card request deleted from Redis');
  }
}

export const RedisRepositoryProvider: ClassProvider = {
  provide: CARD_REQUEST_REPOSITORY,
  useClass: RedisCardRequestRepository,
};
