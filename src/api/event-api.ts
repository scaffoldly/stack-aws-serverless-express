import { HttpError } from '@scaffoldly/serverless-util';
import { DynamoDBStreamEvent, SNSEvent, SQSEvent } from 'aws-lambda';
import { Body, Controller, Header, Hidden, Post, Route, Tags } from '@tsoa/runtime';
import { BaseMessage, FailedMessage, WebhookMessage } from './internal/messages';
import { WebhookMessagesTable } from '../db/webhook-messages';
import { DynamoDBExceptionName } from 'ddb-table';
import { DynamoDBServiceException } from '@aws-sdk/client-dynamodb';
import { preventOverwrite } from '../db/base';

@Route('/event')
@Tags('Events')
@Hidden()
export class EventApi extends Controller {
  webhookMessagesTable: WebhookMessagesTable;

  constructor() {
    super();
    this.webhookMessagesTable = new WebhookMessagesTable();
  }

  @Post('/dynamodb')
  public async dynamoDbEvent(@Header('Host') host: string, @Body() body: unknown): Promise<void> {
    if (host !== 'dynamodb.amazonaws.com') {
      throw new HttpError(403, 'Forbidden');
    }

    const event = body as DynamoDBStreamEvent;

    console.log('DynamoDB Records: ', event.Records);
  }

  @Post('/sqs')
  public async sqsEvent(@Header('Host') host: string, @Body() body: unknown): Promise<void> {
    if (host !== 'sqs.amazonaws.com') {
      throw new HttpError(403, 'Forbidden');
    }

    const event = body as SQSEvent;

    // There could be any types of messages in the queue
    // Iterate over each message and handle it appropriately
    event.Records.reduce(async (accP, record) => {
      const acc = await accP;

      try {
        const message = JSON.parse(record.body) as BaseMessage;
        if (message.type === 'WebhookMessage' && message.version === 1) {
          const webhookMessage = message as WebhookMessage;

          // Example handling a webhook message.

          // In this case, we're going to save it to the DynamoDB Table
          // And have it auto-delete from the table in ~5 minute to demonstrate DynamoDB expiry
          const { Attributes } = await this.webhookMessagesTable
            .update(
              this.webhookMessagesTable.hashKey(message.queueUrl),
              this.webhookMessagesTable.rangeKey(message.timestamp.toString()),
            )
            .set('message', webhookMessage.event.message)
            .set('expires', webhookMessage.timestamp + 3000)
            .return('ALL_NEW')
            .exec(preventOverwrite());

          console.log('Inserted webhook message into DynamoDB', Attributes);
        }
      } catch (err) {
        if (
          (err as DynamoDBServiceException)?.name ===
          DynamoDBExceptionName.ConditionalCheckFailedException
        ) {
          // There was an error so return that it failed so it can go to the DLQ and/or be retried.
          console.warn('Duplicate message inserted', err);
          acc.push({ something: 'something' });
        }
      }

      return acc;
    }, Promise.resolve([] as FailedMessage[]));
  }

  @Post('/sns')
  public async snsEvent(@Header('Host') host: string, @Body() body: unknown): Promise<void> {
    if (host !== 'sns.amazonaws.com') {
      throw new HttpError(403, 'Forbidden');
    }

    const event = body as SNSEvent;

    console.log('SNS Records: ', event.Records);
  }
}
