import { CloudEvent } from '@contracts/types/cloud-event.types';

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

export interface EventPublisherPort {
  publish<T>(topic: string, event: CloudEvent<T>): Promise<void>;
}
