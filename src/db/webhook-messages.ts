import { BaseSchema, BaseTable } from './base';

export type WebhookMessageSchema = BaseSchema & {
  message?: string;
};

export class WebhookMessagesTable extends BaseTable<WebhookMessageSchema, 'webhook', 'message'> {
  constructor() {
    // TABLE_NAME is set in serverless.yml
    super(
      process.env.DEFAULT_TABLE_NAME!,
      'webhook', // We can pack multiple types of data into the same table
      'message', // This one is for webhook messages
    );
  }
}
