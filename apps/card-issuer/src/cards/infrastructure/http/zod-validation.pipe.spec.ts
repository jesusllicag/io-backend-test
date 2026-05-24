import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from './zod-validation.pipe';
import { CardIssueSchema } from '@contracts/schemas/card-issue.schema';

const validInput = {
  customer: {
    documentType: 'DNI',
    documentNumber: '12345678',
    fullName: 'John Doe',
    age: 25,
    email: 'john@example.com',
  },
  product: { type: 'VISA', currency: 'PEN' },
};

describe('ZodValidationPipe', () => {
  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(CardIssueSchema);
  });

  describe('transform - valid input', () => {
    it('returns the parsed value', () => {
      const result = pipe.transform(validInput);
      expect(result).toMatchObject(validInput);
    });

    it('applies schema defaults (forceError becomes false)', () => {
      const result = pipe.transform(validInput) as any;
      expect(result.forceError).toBe(false);
    });

    it('passes through forceError: true', () => {
      const result = pipe.transform({ ...validInput, forceError: true }) as any;
      expect(result.forceError).toBe(true);
    });
  });

  describe('transform - invalid input', () => {
    it('throws BadRequestException for invalid input', () => {
      expect(() => pipe.transform({})).toThrow(BadRequestException);
    });

    it('exception response contains message "Validation failed"', () => {
      try {
        pipe.transform({});
      } catch (err: unknown) {
        expect((err as BadRequestException).getResponse()).toMatchObject({
          message: 'Validation failed',
        });
      }
    });

    it('exception response contains errors array', () => {
      try {
        pipe.transform({ customer: { documentType: 'DNI', documentNumber: '123', fullName: 'J', age: 15, email: 'bad' }, product: {} });
      } catch (err: unknown) {
        const response = (err as BadRequestException).getResponse() as any;
        expect(Array.isArray(response.errors)).toBe(true);
        expect(response.errors.length).toBeGreaterThan(0);
      }
    });

    it('includes field path in each error', () => {
      try {
        pipe.transform({ ...validInput, customer: { ...validInput.customer, age: 10 } });
      } catch (err: unknown) {
        const response = (err as BadRequestException).getResponse() as any;
        const ageError = response.errors.find((e: any) => e.field === 'customer.age');
        expect(ageError).toBeDefined();
      }
    });

    it('throws for null input', () => {
      expect(() => pipe.transform(null)).toThrow(BadRequestException);
    });

    it('throws for non-object input', () => {
      expect(() => pipe.transform('string')).toThrow(BadRequestException);
    });
  });
});
