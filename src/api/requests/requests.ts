export interface BaseWebhook {
  type: string;
  version: number;
}

export type ExampleWebhook = BaseWebhook & {
  type: 'ExampleWebhook';
  version: 1;
  message?: string;
};
