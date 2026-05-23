import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CardRequestedData } from '@contracts/events/card-requested.event';
import { CardIssuedData } from '@contracts/events/card-issued.event';
import { CardDlqData } from '@contracts/events/card-dlq.event';
import { CloudEvent } from '@contracts/types/cloud-event.types';
import { generateCard, sleep } from '@common/utils/card.utils';
import { nextEventId } from '@common/utils/id.utils';
import { TOPICS } from '@kafka/kafka.topics';
import {
  CARD_REQUEST_REPOSITORY,
  CardRequestUpdatePort,
} from '../domain/card-request.repository.port';
import {
  EVENT_PUBLISHER,
  EventPublisherPort,
} from '../domain/event-publisher.port';
import { CardIssuanceSimulator } from '../infrastructure/external/card-issuance-simulator';

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

@Injectable()
export class ProcessCardUseCase {
  constructor(
    @Inject(CARD_REQUEST_REPOSITORY)
    private readonly repository: CardRequestUpdatePort,
    @Inject(EVENT_PUBLISHER)
    private readonly publisher: EventPublisherPort,
    private readonly simulator: CardIssuanceSimulator,
    @InjectPinoLogger(ProcessCardUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(data: CardRequestedData): Promise<void> {
    const { requestId, forceError } = data;

    this.logger.info(
      { requestId, event: TOPICS.CARD_REQUESTED },
      'Starting card issuance',
    );

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        const result = await this.simulator.simulate(forceError);

        if (!result.success) {
          throw new Error(
            `External service failed after ${result.durationMs}ms`,
          );
        }

        const card = generateCard();

        await this.repository.updateStatus(requestId, 'ISSUED', card);

        const event: CloudEvent<CardIssuedData> = {
          id: nextEventId(),
          source: requestId,
          type: TOPICS.CARD_ISSUED,
          data: {
            requestId,
            card,
            customer: data.customer,
            product: data.product,
            status: 'ISSUED',
          },
        };

        await this.publisher.publish(TOPICS.CARD_ISSUED, event);

        this.logger.info(
          { requestId, cardId: card.id, attempt },
          'Card issued successfully',
        );

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt <= MAX_RETRIES) {
          const delayMs = RETRY_DELAYS_MS[attempt - 1];
          this.logger.warn(
            { requestId, attempt, delayMs, error: lastError.message },
            'Retrying card issuance',
          );
          await sleep(delayMs);
        }
      }
    }

    await this.repository.updateStatus(
      requestId,
      'FAILED',
      undefined,
      lastError!.message,
    );

    const dlqEvent: CloudEvent<CardDlqData> = {
      id: nextEventId(),
      source: requestId,
      type: TOPICS.CARD_REQUESTED_DLQ,
      data: {
        requestId,
        attempts: MAX_RETRIES + 1,
        reason: lastError!.message,
        error: { message: lastError!.message },
        originalPayload: data,
        status: 'FAILED',
      },
    };

    await this.publisher.publish(TOPICS.CARD_REQUESTED_DLQ, dlqEvent);

    this.logger.error(
      {
        requestId,
        attempts: MAX_RETRIES + 1,
        error: lastError!.message,
      },
      'Max retries exceeded — published to DLQ',
    );
  }
}
