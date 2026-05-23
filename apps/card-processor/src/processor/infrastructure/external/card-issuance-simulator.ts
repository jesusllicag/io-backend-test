import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { sleep } from '@common/utils/card.utils';

export interface SimulationResult {
  success: boolean;
  durationMs: number;
}

@Injectable()
export class CardIssuanceSimulator {
  async simulate(forceError: boolean): Promise<SimulationResult> {
    const durationMs = randomInt(200, 501);
    await sleep(durationMs);

    // forceError forces failure; otherwise ~60% success rate
    const success = forceError ? false : randomInt(0, 10) >= 4;

    return { success, durationMs };
  }
}
