import { ProcessCardUseCase } from '../../../../../apps/card-processor/src/processor/application/process-card.use-case';
import { CardRequestedData } from '@contracts/events/card-requested.event';
import { TOPICS } from '@kafka/kafka.topics';
import { generateCard, sleep } from '@common/utils/card.utils';
import { getEventId } from '@common/utils/id.utils';

jest.mock('nestjs-pino', () => ({
  InjectPinoLogger: () => () => {},
  PinoLogger: jest.fn(),
}));

jest.mock('@common/utils/card.utils', () => ({
  generateCard: jest.fn().mockReturnValue({
    id: 'card-1',
    number: '4111111111111111',
    expiryDate: '01/28',
    cvv: '123',
  }),
  sleep: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@common/utils/id.utils', () => ({
  getEventId: jest.fn().mockReturnValue(99),
}));

const mockRepository = {
  updateStatus: jest.fn().mockResolvedValue(undefined),
  deleteByRequestId: jest.fn().mockResolvedValue(undefined),
};

const mockPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockSimulator = {
  eval: jest.fn().mockResolvedValue({ success: true, durationMs: 100 }),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const validData: CardRequestedData = {
  requestId: 'req-123',
  customer: { documentType: 'DNI', documentNumber: '12345678', fullName: 'John Doe', age: 25, email: 'john@example.com' },
  product: { type: 'VISA', currency: 'PEN' },
  forceError: false,
  attempt: 1,
  status: 'PENDING',
};

describe('ProcessCardUseCase', () => {
  let useCase: ProcessCardUseCase;

  beforeEach(() => {
    mockSimulator.eval.mockResolvedValue({ success: true, durationMs: 100 });
    useCase = new ProcessCardUseCase(
      mockRepository as any,
      mockPublisher as any,
      mockSimulator as any,
      mockLogger as any,
    );
  });

  describe('execute - first attempt succeeds', () => {
    it('calls simulator.eval with forceError flag', async () => {
      await useCase.execute(validData);
      expect(mockSimulator.eval).toHaveBeenCalledWith(false);
    });

    it('updates status to ISSUED with the generated card', async () => {
      await useCase.execute(validData);
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'req-123',
        'ISSUED',
        { id: 'card-1', number: '4111111111111111', expiryDate: '01/28', cvv: '123' },
      );
    });

    it('publishes CARD_ISSUED event', async () => {
      await useCase.execute(validData);
      expect(mockPublisher.publish).toHaveBeenCalledWith(
        TOPICS.CARD_ISSUED,
        expect.objectContaining({
          id: 99,
          source: 'req-123',
          type: TOPICS.CARD_ISSUED,
          data: expect.objectContaining({
            requestId: 'req-123',
            status: 'ISSUED',
            customer: validData.customer,
            product: validData.product,
          }),
        }),
      );
    });

    it('does not include errors in ISSUED event on first-try success', async () => {
      await useCase.execute(validData);
      const event = mockPublisher.publish.mock.calls[0][1];
      expect(event.errors).toBeUndefined();
    });

    it('does not call sleep on immediate success', async () => {
      await useCase.execute(validData);
      expect(jest.mocked(sleep)).not.toHaveBeenCalled();
    });

    it('does not publish DLQ event', async () => {
      await useCase.execute(validData);
      const topics = mockPublisher.publish.mock.calls.map((c: any) => c[0]);
      expect(topics).not.toContain(TOPICS.CARD_REQUESTED_DLQ);
    });
  });

  describe('execute - retries and succeeds', () => {
    beforeEach(() => {
      mockSimulator.eval
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({ success: true, durationMs: 100 });
    });

    it('retries until success', async () => {
      await useCase.execute(validData);
      expect(mockSimulator.eval).toHaveBeenCalledTimes(3);
    });

    it('sleeps with exponential backoff between retries', async () => {
      await useCase.execute(validData);
      expect(jest.mocked(sleep)).toHaveBeenCalledTimes(2);
      expect(jest.mocked(sleep)).toHaveBeenNthCalledWith(1, 1000);
      expect(jest.mocked(sleep)).toHaveBeenNthCalledWith(2, 2000);
    });

    it('includes error history in the ISSUED event', async () => {
      await useCase.execute(validData);
      const event = mockPublisher.publish.mock.calls[0][1];
      expect(event.errors).toEqual([
        { message: 'network error', attempt: 1 },
        { message: 'timeout', attempt: 2 },
      ]);
    });
  });

  describe('execute - all retries exhausted (4 attempts)', () => {
    beforeEach(() => {
      mockSimulator.eval.mockRejectedValue(new Error('persistent failure'));
    });

    it('calls simulator exactly 4 times (1 initial + 3 retries)', async () => {
      await useCase.execute(validData);
      expect(mockSimulator.eval).toHaveBeenCalledTimes(4);
    });

    it('sleeps 3 times with correct delays', async () => {
      await useCase.execute(validData);
      expect(jest.mocked(sleep)).toHaveBeenCalledTimes(3);
      expect(jest.mocked(sleep)).toHaveBeenNthCalledWith(1, 1000);
      expect(jest.mocked(sleep)).toHaveBeenNthCalledWith(2, 2000);
      expect(jest.mocked(sleep)).toHaveBeenNthCalledWith(3, 4000);
    });

    it('updates status to FAILED with error message', async () => {
      await useCase.execute(validData);
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'req-123',
        'FAILED',
        undefined,
        'persistent failure',
      );
    });

    it('publishes DLQ event with failure details', async () => {
      await useCase.execute(validData);
      expect(mockPublisher.publish).toHaveBeenCalledWith(
        TOPICS.CARD_REQUESTED_DLQ,
        expect.objectContaining({
          source: 'req-123',
          type: TOPICS.CARD_REQUESTED_DLQ,
          data: expect.objectContaining({
            requestId: 'req-123',
            attempts: 4,
            reason: 'persistent failure',
            status: 'FAILED',
            originalPayload: validData,
          }),
        }),
      );
    });

    it('DLQ event includes all error attempts', async () => {
      await useCase.execute(validData);
      const dlqEvent = mockPublisher.publish.mock.calls[0][1];
      expect(dlqEvent.errors).toHaveLength(4);
      dlqEvent.errors.forEach((e: any, i: number) => {
        expect(e.attempt).toBe(i + 1);
        expect(e.message).toBe('persistent failure');
      });
    });

    it('does not publish CARD_ISSUED event', async () => {
      await useCase.execute(validData);
      const topics = mockPublisher.publish.mock.calls.map((c: any) => c[0]);
      expect(topics).not.toContain(TOPICS.CARD_ISSUED);
    });
  });

  describe('execute - forceError', () => {
    it('passes forceError: true to the simulator', async () => {
      mockSimulator.eval.mockRejectedValue(new Error('forced'));
      await useCase.execute({ ...validData, forceError: true });
      expect(mockSimulator.eval).toHaveBeenCalledWith(true);
    });
  });

  describe('execute - non-Error throws', () => {
    it('wraps a non-Error thrown value in an Error object', async () => {
      mockSimulator.eval.mockRejectedValue('plain string error');
      await useCase.execute(validData);
      const dlqEvent = mockPublisher.publish.mock.calls[0][1];
      expect(dlqEvent.data.reason).toBe('plain string error');
    });
  });

  describe('getEventId usage', () => {
    it('uses getEventId for the ISSUED event id', async () => {
      await useCase.execute(validData);
      const event = mockPublisher.publish.mock.calls[0][1];
      expect(event.id).toBe(jest.mocked(getEventId)());
    });
  });

  describe('generateCard usage', () => {
    it('uses generateCard to create the card', async () => {
      await useCase.execute(validData);
      expect(jest.mocked(generateCard)).toHaveBeenCalled();
    });
  });
});
