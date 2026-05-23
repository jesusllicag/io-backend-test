export const TOPICS = {
  CARD_REQUESTED: 'io.card.requested.v1',
  CARD_ISSUED: 'io.cards.issued.v1',
  CARD_REQUESTED_DLQ: 'io.card.requested.v1.dlq',
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];
