import { ConflictException } from '@nestjs/common';
import { IssueCardUseCase } from '../../../../../apps/card-issuer/src/cards/application/issue-card.use-case';
import { CardRequestEntity } from '../../../../../apps/card-issuer/src/cards/domain/card-request.entity';
import { CardIssueDto } from '@contracts/schemas/card-issue.schema';
import { TOPICS } from '@kafka/kafka.topics';

jest.mock('nestjs-pino', () => ({
  InjectPinoLogger: () => () => {},
  PinoLogger: jest.fn(),
}));

jest.mock('@common/utils/id.utils', () => ({
  generateRequestId: jest.fn().mockReturnValue('req-generated-id'),
  getEventId: jest.fn().mockReturnValue(42),
}));

const mockRepository = {
  save: jest.fn().mockResolvedValue(undefined),
  findByRequestId: jest.fn().mockResolvedValue(null),
  findByDocumentNumber: jest.fn().mockResolvedValue(null),
};

const mockPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const validDto: CardIssueDto = {
  customer: {
    documentType: 'DNI',
    documentNumber: '12345678',
    fullName: 'John Doe',
    age: 25,
    email: 'john@example.com',
  },
  product: { type: 'VISA', currency: 'PEN' },
  forceError: false,
};

describe('IssueCardUseCase', () => {
  let useCase: IssueCardUseCase;

  beforeEach(() => {
    useCase = new IssueCardUseCase(
      mockRepository as any,
      mockPublisher as any,
      mockLogger as any,
    );
  });

  describe('execute - happy path', () => {
    it('returns PENDING status with generated requestId', async () => {
      const result = await useCase.execute(validDto);
      expect(result).toEqual({ requestId: 'req-generated-id', status: 'PENDING' });
    });

    it('checks for existing request by document number', async () => {
      await useCase.execute(validDto);
      expect(mockRepository.findByDocumentNumber).toHaveBeenCalledWith('12345678');
    });

    it('saves a CardRequestEntity with PENDING status', async () => {
      await useCase.execute(validDto);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.any(CardRequestEntity),
      );
      const savedEntity: CardRequestEntity = mockRepository.save.mock.calls[0][0];
      expect(savedEntity.status).toBe('PENDING');
      expect(savedEntity.requestId).toBe('req-generated-id');
    });

    it('publishes CARD_REQUESTED event to the correct topic', async () => {
      await useCase.execute(validDto);
      expect(mockPublisher.publish).toHaveBeenCalledWith(
        TOPICS.CARD_REQUESTED,
        expect.objectContaining({
          id: 42,
          source: 'req-generated-id',
          type: TOPICS.CARD_REQUESTED,
        }),
      );
    });

    it('event data contains requestId, customer, product and forceError', async () => {
      await useCase.execute(validDto);
      const publishedEvent = mockPublisher.publish.mock.calls[0][1];
      expect(publishedEvent.data).toMatchObject({
        requestId: 'req-generated-id',
        customer: validDto.customer,
        product: validDto.product,
        forceError: false,
        attempt: 1,
        status: 'PENDING',
      });
    });

    it('defaults forceError to false when not provided', async () => {
      const dtoWithoutForceError = { customer: validDto.customer, product: validDto.product, forceError: false };
      await useCase.execute(dtoWithoutForceError as CardIssueDto);
      const publishedEvent = mockPublisher.publish.mock.calls[0][1];
      expect(publishedEvent.data.forceError).toBe(false);
    });

    it('falls back to false when dto.forceError is undefined (nullish coalescing branch)', async () => {
      const dto = { ...validDto, forceError: undefined } as unknown as CardIssueDto;
      await useCase.execute(dto);
      const publishedEvent = mockPublisher.publish.mock.calls[0][1];
      expect(publishedEvent.data.forceError).toBe(false);
    });
  });

  describe('execute - duplicate request', () => {
    const existingEntity = new CardRequestEntity(
      'existing-req',
      validDto.customer,
      validDto.product,
      false,
      'PENDING',
    );

    beforeEach(() => {
      mockRepository.findByDocumentNumber.mockResolvedValueOnce(existingEntity);
    });

    it('throws ConflictException when customer already has a request', async () => {
      await expect(useCase.execute(validDto)).rejects.toThrow(ConflictException);
    });

    it('includes the document number in the error message', async () => {
      await expect(useCase.execute(validDto)).rejects.toThrow('12345678');
    });

    it('does not save a new entity when conflict detected', async () => {
      await expect(useCase.execute(validDto)).rejects.toThrow();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('does not publish an event when conflict detected', async () => {
      await expect(useCase.execute(validDto)).rejects.toThrow();
      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });
  });
});
