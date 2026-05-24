import { CardsController } from '../../../../../../apps/card-issuer/src/cards/infrastructure/http/cards.controller';
import { IssueCardUseCase } from '../../../../../../apps/card-issuer/src/cards/application/issue-card.use-case';
import { CardIssueDto } from '@contracts/schemas/card-issue.schema';

jest.mock('nestjs-pino', () => ({
  InjectPinoLogger: () => () => {},
  PinoLogger: jest.fn(),
}));

const mockUseCase = {
  execute: jest.fn().mockResolvedValue({ requestId: 'req-1', status: 'PENDING' }),
};

const validBody: CardIssueDto = {
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

describe('CardsController', () => {
  let controller: CardsController;

  beforeEach(() => {
    controller = new CardsController(mockUseCase as unknown as IssueCardUseCase);
  });

  describe('issue', () => {
    it('calls use case with the request body', async () => {
      await controller.issue(validBody);
      expect(mockUseCase.execute).toHaveBeenCalledWith(validBody);
    });

    it('returns the use case result', async () => {
      const result = await controller.issue(validBody);
      expect(result).toEqual({ requestId: 'req-1', status: 'PENDING' });
    });

    it('propagates errors from the use case', async () => {
      mockUseCase.execute.mockRejectedValueOnce(new Error('conflict'));
      await expect(controller.issue(validBody)).rejects.toThrow('conflict');
    });
  });
});
