jest.mock('node:crypto', () => ({
  randomInt: jest.fn().mockReturnValue(5),
  randomUUID: jest.fn().mockReturnValue('test-card-uuid'),
}));

import {
  generateCard,
  sleep,
} from '../../../../libs/common/src/utils/card.utils';

describe('card.utils', () => {
  describe('sleep', () => {
    it('resolves after the specified milliseconds', async () => {
      jest.useFakeTimers();
      const promise = sleep(100);
      jest.advanceTimersByTime(100);
      await expect(promise).resolves.toBeUndefined();
      jest.useRealTimers();
    });

    it('does not resolve before the timeout', async () => {
      jest.useFakeTimers();
      let resolved = false;
      sleep(200).then(() => {
        resolved = true;
      });
      jest.advanceTimersByTime(100);
      expect(resolved).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('generateCard', () => {
    it('returns a Card with all required fields', () => {
      const card = generateCard();
      expect(card).toMatchObject({
        id: expect.any(String),
        number: expect.any(String),
        expiryDate: expect.any(String),
        cvv: expect.any(String),
      });
    });

    it('card number starts with 4 (Visa prefix)', () => {
      const card = generateCard();
      expect(card.number.charAt(0)).toBe('4');
    });

    it('card number is 16 digits', () => {
      const card = generateCard();
      expect(card.number).toHaveLength(16);
      expect(card.number).toMatch(/^\d{16}$/);
    });

    it('expiry date matches MM/YY format', () => {
      const card = generateCard();
      expect(card.expiryDate).toMatch(/^\d{2}\/\d{2}$/);
    });

    it('uses generateCardId for the card id', () => {
      const card = generateCard();
      expect(card.id).toBe('test-card-uuid');
    });
  });
});
