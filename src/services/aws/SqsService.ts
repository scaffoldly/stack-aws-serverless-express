import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { BaseMessage } from '../../api/internal/messages';

export class SqsService {
  private client: SQSClient;

  constructor() {
    // No need to specify region or credentials
    // It's all provided by the execution role
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
