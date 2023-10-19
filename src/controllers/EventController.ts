import { HttpError } from '@scaffoldly/serverless-util';
import { DynamoDBStreamEvent, SNSEvent, SQSEvent } from 'aws-lambda';
import { Body, Controller, Header, Hidden, Post, Route, Tags } from '@tsoa/runtime';

import { GithubLoginService } from '../services/GithubLoginService';

@Route('/events')
@Tags('Events')
@Hidden()
export class EventController extends Controller {
  githubLoginService: GithubLoginService;

  constructor() {
    super();

    this.githubLoginService = new GithubLoginService();
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

    console.log('SQS Records: ', event.Records);
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
