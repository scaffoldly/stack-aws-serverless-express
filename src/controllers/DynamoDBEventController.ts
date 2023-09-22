import { handleDynamoDBStreamRecord, HttpError } from '@scaffoldly/serverless-util';
import { DynamoDBStreamEvent } from 'aws-lambda';
import { Body, Controller, Header, Hidden, Post, Route, Tags } from '@tsoa/runtime';
import {
  GithubIdentityEventV1,
  GithubInstallationEventV1,
  GithubLoginTokenEventV1,
  GithubMembershipEventV1,
  GithubTargetMembershipEventV1,
} from '../interfaces/github';
import { GithubLoginModel } from '../models/GithubLoginModel';
import { GithubLogin } from '../models/interfaces';
import { GithubLoginService } from '../services/GithubLoginService';

@Route('/events/dynamodb')
@Tags('DynamoDB Events')
@Hidden()
export class DynamoDBEventController extends Controller {
  githubLoginService: GithubLoginService;

  constructor() {
    super();

    this.githubLoginService = new GithubLoginService();
  }

  @Post()
  public async event(
    @Header('Host') host: string,
    @Body() event: unknown,
  ): Promise<
    | Array<
        | GithubLoginTokenEventV1
        | GithubIdentityEventV1
        | GithubInstallationEventV1
        | GithubMembershipEventV1
        | GithubTargetMembershipEventV1
      >
    | GithubLogin
    | null
  > {
    if (host !== 'dynamodb.amazonaws.com') {
      throw new HttpError(403, 'Forbidden');
    }

    const { Records: records } = event as DynamoDBStreamEvent;

    await Promise.all(
      records.map(async (record) => {
        await handleDynamoDBStreamRecord(record, {
          canHandle: GithubLoginModel.isGithubLogin,
          onInsert: this.githubLoginService.handleAddOrModify.bind(this.githubLoginService),
          onModify: this.githubLoginService.handleAddOrModify.bind(this.githubLoginService),
          onRemove: this.githubLoginService.handleRemove.bind(this.githubLoginService),
        });
      }),
    );

    return null;
  }
}
