jest.mock('node:crypto', () => ({
  randomInt: jest.fn(),
}));

jest.mock('@common/utils/card.utils', () => ({
  sleep: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('nestjs-pino', () => ({
  InjectPinoLogger: () => () => {},
  PinoLogger: jest.fn(),
}));

import { randomInt } from 'node:crypto';
import { sleep } from '@common/utils/card.utils';
import { CardIssuanceSimulator } from '../../../../../../apps/card-processor/src/processor/infrastructure/external/card-issuance-simulator';

const mockRandomInt = randomInt as jest.MockedFunction<typeof randomInt>;
const mockSleep = sleep as jest.MockedFunction<typeof sleep>;

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

describe('CardIssuanceSimulator', () => {
  let simulator: CardIssuanceSimulator;

  beforeEach(() => {
    simulator = new CardIssuanceSimulator(mockLogger as any);
  });

  describe('eval - success path', () => {
    it('returns success result when random outcome >= 4', async () => {
      mockRandomInt
        .mockReturnValueOnce(300 as any) // durationMs
        .mockReturnValueOnce(7 as any);  // success check (>= 4)

      const result = await simulator.eval(false);
      expect(result.success).toBe(true);
      expect(result.durationMs).toBe(300);
    });

    it('sleeps for the random duration', async () => {
      mockRandomInt
        .mockReturnValueOnce(250 as any)
        .mockReturnValueOnce(8 as any);

      await simulator.eval(false);
      expect(mockSleep).toHaveBeenCalledWith(250);
    });

    it('accepts outcome of exactly 4 as success', async () => {
      mockRandomInt
        .mockReturnValueOnce(200 as any)
        .mockReturnValueOnce(4 as any);

      const result = await simulator.eval(false);
      expect(result.success).toBe(true);
    });
  });

  describe('eval - failure path (random)', () => {
    it('throws HttpException when random outcome < 4', async () => {
      mockRandomInt
        .mockReturnValueOnce(300 as any) // durationMs
        .mockReturnValueOnce(2 as any)   // failure
        .mockReturnValueOnce(0 as any);  // error index → BAD_GATEWAY

      await expect(simulator.eval(false)).rejects.toThrow('Issuer gateway timeout');
    });

    it('logs simulated failure', async () => {
      mockRandomInt
        .mockReturnValueOnce(300 as any)
        .mockReturnValueOnce(0 as any)
        .mockReturnValueOnce(1 as any);  // error index → SERVICE_UNAVAILABLE

      await expect(simulator.eval(false)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ durationMs: 300 }),
        'Simulated card issuance failure',
      );
    });

    it('throws different errors depending on the error index', async () => {
      const errors = [
        'Issuer gateway timeout',
        'Card issuer temporarily unavailable',
        'Issuer internal processing error',
        'Issuer rate limit exceeded',
      ];

      for (let i = 0; i < errors.length; i++) {
        mockRandomInt
          .mockReturnValueOnce(200 as any)
          .mockReturnValueOnce(0 as any)  // force failure
          .mockReturnValueOnce(i as any); // specific error index

        await expect(simulator.eval(false)).rejects.toThrow(errors[i]);
      }
    });
  });

  describe('eval - forceError: true', () => {
    it('always throws regardless of random outcome', async () => {
      mockRandomInt
        .mockReturnValueOnce(300 as any) // durationMs
        .mockReturnValueOnce(0 as any);  // error index

      await expect(simulator.eval(true)).rejects.toThrow();
    });

    it('does not call randomInt for success check when forceError is true', async () => {
      mockRandomInt
        .mockReturnValueOnce(300 as any) // durationMs
        .mockReturnValueOnce(0 as any);  // error index

      await expect(simulator.eval(true)).rejects.toThrow();
      // randomInt called twice: once for durationMs, once for error index
      expect(mockRandomInt).toHaveBeenCalledTimes(2);
    });
  });
});
