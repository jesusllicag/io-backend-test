import { HttpStatus, HttpException, Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { sleep } from '@common/utils/card.utils';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface SimulationResult {
  success: boolean;
  durationMs: number;
}

type IssuerError = {
  status: HttpStatus;
  message: string;
};

@Injectable()
export class CardIssuanceSimulator {
  constructor(
    @InjectPinoLogger(CardIssuanceSimulator.name)
    private readonly logger: PinoLogger,
  ) {}

  private readonly SIMULATED_ISSUER_ERRORS: IssuerError[] = [
    {
      status: HttpStatus.BAD_GATEWAY,
      message: 'Issuer gateway timeout',
    },
    {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Card issuer temporarily unavailable',
    },
    {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Issuer internal processing error',
    },
    {
      status: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Issuer rate limit exceeded',
    },
  ];

  async eval(forceError: boolean): Promise<SimulationResult> {
    const durationMs = randomInt(200, 501);
    await sleep(durationMs);

    // 60% success rate
    const success = forceError ? false : randomInt(0, 10) >= 4;

    if (!success) {
      throw this.buildRandomIssuerError(durationMs);
    }

    return { success, durationMs };
  }

  private buildRandomIssuerError(durationMs: number): HttpException {
    const error =
      this.SIMULATED_ISSUER_ERRORS[
        randomInt(0, this.SIMULATED_ISSUER_ERRORS.length)
      ];
    this.logger.error(
      { error: error.message, durationMs },
      'Simulated card issuance failure',
    );
    return new HttpException(error.message, error.status);
  }
}
