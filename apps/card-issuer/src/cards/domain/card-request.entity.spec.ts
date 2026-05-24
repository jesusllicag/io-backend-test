import { CardRequestEntity } from './card-request.entity';
import { Customer, Product, Card } from '@contracts/types/cloud-event.types';

const customer: Customer = {
  documentType: 'DNI',
  documentNumber: '12345678',
  fullName: 'John Doe',
  age: 25,
  email: 'john@example.com',
};

const product: Product = { type: 'VISA', currency: 'PEN' };

const card: Card = {
  id: 'card-1',
  number: '4111111111111111',
  expiryDate: '01/30',
  cvv: '123',
};

describe('CardRequestEntity', () => {
  let entity: CardRequestEntity;

  beforeEach(() => {
    entity = new CardRequestEntity('req-1', customer, product, false, 'PENDING');
  });

  describe('constructor', () => {
    it('sets all required fields', () => {
      expect(entity.requestId).toBe('req-1');
      expect(entity.customer).toEqual(customer);
      expect(entity.product).toEqual(product);
      expect(entity.forceError).toBe(false);
      expect(entity.status).toBe('PENDING');
    });

    it('defaults createdAt and updatedAt to ISO strings when not provided', () => {
      expect(entity.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(entity.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('accepts explicit createdAt and updatedAt', () => {
      const fixed = '2024-01-01T00:00:00.000Z';
      const e = new CardRequestEntity('req-2', customer, product, false, 'PENDING', undefined, undefined, fixed, fixed);
      expect(e.createdAt).toBe(fixed);
      expect(e.updatedAt).toBe(fixed);
    });

    it('accepts optional card and errorMessage', () => {
      const e = new CardRequestEntity('req-3', customer, product, false, 'ISSUED', card, 'some error');
      expect(e.card).toEqual(card);
      expect(e.errorMessage).toBe('some error');
    });
  });

  describe('markAsIssued', () => {
    it('sets status to ISSUED', () => {
      entity.markAsIssued(card);
      expect(entity.status).toBe('ISSUED');
    });

    it('sets the card', () => {
      entity.markAsIssued(card);
      expect(entity.card).toEqual(card);
    });

    it('updates updatedAt to a later timestamp', () => {
      jest.useFakeTimers();
      const before = entity.updatedAt;
      jest.advanceTimersByTime(1000);
      entity.markAsIssued(card);
      expect(entity.updatedAt).not.toBe(before);
      jest.useRealTimers();
    });
  });

  describe('markAsFailed', () => {
    it('sets status to FAILED', () => {
      entity.markAsFailed('timeout');
      expect(entity.status).toBe('FAILED');
    });

    it('sets the error message', () => {
      entity.markAsFailed('timeout');
      expect(entity.errorMessage).toBe('timeout');
    });

    it('updates updatedAt to a later timestamp', () => {
      jest.useFakeTimers();
      const before = entity.updatedAt;
      jest.advanceTimersByTime(1000);
      entity.markAsFailed('timeout');
      expect(entity.updatedAt).not.toBe(before);
      jest.useRealTimers();
    });
  });

  describe('toJSON', () => {
    it('returns all entity fields as a plain object', () => {
      const json = entity.toJSON();
      expect(json).toEqual({
        requestId: 'req-1',
        customer,
        product,
        forceError: false,
        status: 'PENDING',
        card: undefined,
        errorMessage: undefined,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      });
    });
  });

  describe('toString', () => {
    it('returns a valid JSON string', () => {
      const str = entity.toString();
      expect(() => JSON.parse(str)).not.toThrow();
    });

    it('serialized value matches toJSON output', () => {
      expect(JSON.parse(entity.toString())).toEqual(entity.toJSON());
    });
  });
});
