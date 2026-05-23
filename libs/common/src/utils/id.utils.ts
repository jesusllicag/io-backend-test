import { randomUUID } from 'node:crypto';

export function generateRequestId(): string {
  return randomUUID();
}

export function generateCardId(): string {
  return randomUUID();
}

let eventCounter = 0;

export function nextEventId(): number {
  return ++eventCounter;
}
