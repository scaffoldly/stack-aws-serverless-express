import { HttpError } from '@scaffoldly/serverless-util';
import { DynamoDBStreamEvent, SNSEvent, SQSEvent } from 'aws-lambda';
import { Body, Controller, Header, Hidden, Post, Route, Tags } from '@tsoa/runtime';
import { BaseMessage, FailedMessage, WebhookMessage } from './internal/messages';
import { BoardMessageTable } from '../db/board-message';
import { DynamoDBExceptionName } from 'ddb-table';
import { DynamoDBServiceException } from '@aws-sdk/client-dynamodb';
import { preventOverwrite } from '../db/base';
import { UserIdentityTable } from '../db/user-identity';
import { SnsService } from '../services/aws/SnsService';

@Route('/event')
@Tags('Events')
@Hidden()
export class EventApi extends Controller {
  boardMessageTable: BoardMessageTable;

  userIdentityTable: UserIdentityTable;

  snsService: SnsService;

  constructor() {
    super();
    this.boardMessageTable = new BoardMessageTable();
    this.userIdentityTable = new UserIdentityTable();
    this.snsService = new SnsService();
  }

  @Post('/dynamodb')
  public async dynamoDbEvent(@Header('Host') host: string, @Body() body: unknown): Promise<void> {
    if (host !== 'dynamodb.amazonaws.com') {
      throw new HttpError(403, 'Forbidden');
    }

    const event = body as DynamoDBStreamEvent;

    // There could be any types of updates from the stream
    // Iterate over each record and handle it appropriately
    event.Records.reduce(async (accP, record) => {
      const acc = await accP;

      const { eventName } = record!;
      const { NewImage } = record.dynamodb!;

      const userIdentity = this.userIdentityTable.isRecord(NewImage);
      if (eventName === 'INSERT' && userIdentity && userIdentity.email) {
        // A new user! Subscribe them to updates
        await this.snsService.subscribe(process.env.DEFAULT_TOPIC_ARN!, userIdentity.email);
      }

      const boardMessage = this.boardMessageTable.isRecord(NewImage);
      if (eventName === 'INSERT' && boardMessage) {
        await this.snsService.notifyAll(process.env.DEFAULT_TOPIC_ARN!, {
          subject: `[${process.env.SERVICE_NAME}] New message from ${boardMessage.sender}`,
          message: boardMessage.message!,
        });
      }

      return acc;
    }, Promise.resolve());
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
          const { Attributes } = await this.boardMessageTable
            .update(
              this.boardMessageTable.hashKey(message.queueUrl),
              this.boardMessageTable.rangeKey(message.timestamp.toString()),
            )
            .set('message', webhookMessage.event.payload.message)
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
