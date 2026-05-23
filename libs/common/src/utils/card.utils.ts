import { randomInt } from 'node:crypto';
import { Card } from '@contracts/types/cloud-event.types';
import { generateCardId } from './id.utils';

function generateCardNumber(): string {
  // Visa prefix 4, then 15 random digits
  const digits = [4];
  for (let i = 0; i < 15; i++) {
    digits.push(randomInt(0, 10));
  }
  return digits.join('');
}

function generateCvv(): string {
  return String(randomInt(100, 1000));
}

function generateExpiryDate(): string {
  const now = new Date();
  const year = now.getFullYear() + randomInt(3, 6);
  const month = String(randomInt(1, 13)).padStart(2, '0');
  return `${month}/${String(year).slice(-2)}`;
}

export function generateCard(): Card {
  return {
    id: generateCardId(),
    number: generateCardNumber(),
    expiryDate: generateExpiryDate(),
    cvv: generateCvv(),
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
