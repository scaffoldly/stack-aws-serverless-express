import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { BaseMessage } from './messages';

export default class SqsService {
  private client: SQSClient;

  constructor() {
    this.client = new SQSClient();
  }

  public async sendMessage(message: BaseMessage): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: message.queueUrl,
        MessageBody: JSON.stringify(message),
      }),
    );
  }
}
