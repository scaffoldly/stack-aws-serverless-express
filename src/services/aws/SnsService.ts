import { SubscribeCommand, PublishCommand, SNSClient } from '@aws-sdk/client-sns';

export class SnsService {
  private client: SNSClient;

  constructor() {
    this.client = new SNSClient();
  }

  public async subscribe(topicArn: string, email: string): Promise<void> {
    await this.client.send(
      new SubscribeCommand({
        Protocol: 'email',
        TopicArn: topicArn,
        Endpoint: email,
      }),
    );
  }

  public async notifyAll(
    topicArn: string,
    notification: { subject: string; message: string },
  ): Promise<void> {
    await this.client.send(
      new PublishCommand({
        TopicArn: topicArn,
        Subject: notification.subject,
        Message: notification.message,
      }),
    );
  }
}
