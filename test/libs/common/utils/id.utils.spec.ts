import { generateRequestId, generateCardId, getEventId } from '../../../../libs/common/src/utils/id.utils';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('550e8400-e29b-41d4-a716-446655440000'),
}));

describe('id.utils', () => {
  describe('generateRequestId', () => {
    it('returns the UUID from randomUUID', () => {
      expect(generateRequestId()).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('generateCardId', () => {
    it('returns the UUID from randomUUID', () => {
      expect(generateCardId()).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('getEventId', () => {
    it('returns a number', () => {
      expect(typeof getEventId()).toBe('number');
    });

    it('increments on each call', () => {
      const first = getEventId();
      const second = getEventId();
      expect(second).toBe(first + 1);
    });
  });
});
