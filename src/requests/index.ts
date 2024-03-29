export type LoginRequest = {
  email: string;
  remember?: boolean;
};

export type UpdateIdentityRequest = {
  email?: string;
  name?: string;
};

export type MessageRequest = {
  message: string;
};

export interface BaseWebhook {
  type: string;
  version: number;
}

export type ExampleWebhook = BaseWebhook & {
  type: 'ExampleWebhook';
  version: 1;
  payload: MessageRequest;
};
