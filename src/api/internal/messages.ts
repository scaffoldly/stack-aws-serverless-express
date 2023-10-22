import { ExampleWebhook } from '../requests/requests';

export interface BaseMessage {
  type: string;
  version: number;
  queueUrl: string;
  id: string;
  timestamp: number;
}

export type WebhookMessage = BaseMessage & {
  type: 'WebhookMessage';
  version: 1;
  event: ExampleWebhook;
};

export type FailedMessage = {
  something: string;
};
