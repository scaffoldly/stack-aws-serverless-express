import { DynamoDBStreamEvent, SNSEvent, SQSEvent } from 'aws-lambda';
import { Body, Controller, Header, Hidden, Post, Route, Tags } from 'tsoa';
import { BoardMessageTable } from '../db/board-message';
import { UserIdentityTable } from '../db/user-identity';
import { SnsService } from '../services/aws/SnsService';
import { HttpError } from './internal/errors';

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
  public async dynamoDbEvent(
    @Header('Host') host: string,
    @Body() body: unknown,
  ): Promise<void> {
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
        // Woo! A new user! Subscribe them to updates
        await this.snsService.subscribe(
          process.env.DEFAULT_TOPIC_ARN!,
          userIdentity.email,
        );
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
  public async sqsEvent(
    @Header('Host') host: string,
    @Body() body: unknown,
  ): Promise<void> {
    if (host !== 'sqs.amazonaws.com') {
      throw new HttpError(403, 'Forbidden');
    }

    const event = body as SQSEvent;

    console.log('SQS Records: ', event.Records);
  }

  @Post('/sns')
  public async snsEvent(
    @Header('Host') host: string,
    @Body() body: unknown,
  ): Promise<void> {
    if (host !== 'sns.amazonaws.com') {
      throw new HttpError(403, 'Forbidden');
    }

    const event = body as SNSEvent;

    console.log('SNS Records: ', event.Records);
  }
}
