import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CardRequestedData } from '@contracts/events/card-requested.event';
import { CardIssuedData } from '@contracts/events/card-issued.event';
import { CardDlqData } from '@contracts/events/card-dlq.event';
import { CloudEvent, ErrorDetails } from '@contracts/types/cloud-event.types';
import { generateCard, sleep } from '@common/utils/card.utils';
import { getEventId } from '@common/utils/id.utils';
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
const BASE_RETRY_DELAY_MS = 1000;

const getRetryDelay = (attempt: number): number => {
  return BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
};

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
    const errors: Error[] = [];

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        this.logger.info(
          `Attempt ${attempt} to issue card for request ${requestId}`,
        );

        await this.simulator.eval(forceError);

        const card = generateCard();

        await this.repository.updateStatus(requestId, 'ISSUED', card);

        const event: CloudEvent<CardIssuedData> = {
          id: getEventId(),
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

        if (errors.length > 0) {
          event.errors = this.buildIssuranceErrors(errors);
        }

        await this.publisher.publish(TOPICS.CARD_ISSUED, event);

        this.logger.info(
          { requestId, cardId: card.id, attempt },
          'Card issued successfully',
        );

        return;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        errors.push(lastError);

        if (attempt <= MAX_RETRIES) {
          const delayMs = getRetryDelay(attempt);
          this.logger.warn(
            { requestId, attempt, delayMs, error: lastError.message },
            `The attempt ${attempt} to issue the card failed, will retry after ${delayMs} ms`,
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
      id: getEventId(),
      source: requestId,
      type: TOPICS.CARD_REQUESTED_DLQ,
      data: {
        requestId,
        attempts: MAX_RETRIES + 1,
        reason: lastError!.message,
        originalPayload: data,
        status: 'FAILED',
      },
      errors: this.buildIssuranceErrors(errors),
    };

    await this.publisher.publish(TOPICS.CARD_REQUESTED_DLQ, dlqEvent);

    this.logger.error(
      {
        requestId,
        attempts: MAX_RETRIES + 1,
        error: lastError!.message,
      },
      'Max retries exceeded - published to DLQ',
    );
  }

  private buildIssuranceErrors(errors: Error[]): ErrorDetails[] {
    return errors.map((err, index) => ({
      message: err.message,
      attempt: index + 1,
    }));
  }
}
