import {
  Body,
  Controller,
  Get,
  Route,
  Tags,
  Response,
  Post,
  TsoaResponse,
  Res,
} from '@tsoa/runtime';
import packageJson from '../../package.json';
import { DefaultResponse, LoginResponse } from './responses/responses';
import { LoginRequest } from './requests/requests';
import { UserIdentityTable } from '../db/user-identity';
import { DynamoDBServiceException } from '@aws-sdk/client-dynamodb';
import { DynamoDBExceptionName } from 'ddb-table';
import { HttpError } from './internal/errors';
import { ErrorResponse } from '@scaffoldly/serverless-util';
import { preventOverwrite } from '../db/base';
import { v4 as uuid } from 'uuid';
import { JwtService } from '../services/JwtService';

@Route('/')
@Tags('Api')
export class Api extends Controller {
  userIdentityTable: UserIdentityTable;

  jwtService: JwtService;

  constructor() {
    super();
    this.userIdentityTable = new UserIdentityTable();
    this.jwtService = new JwtService();
  }

  @Get()
  public async get(): Promise<DefaultResponse> {
    return {
      name: packageJson.name,
      version: packageJson.version,
      now: new Date(),
      openApi: {
        swaggerUrl: 'todo',
        openapiUrl: 'todo',
      },
    };
  }

  @Post('/login')
  @Response<ErrorResponse>('401')
  @Response<LoginResponse, { 'set-cookie'?: string }>(200)
  public async login(
    @Body() request: LoginRequest,
    @Res()
    res: TsoaResponse<200, LoginResponse, { 'set-cookie'?: string }>,
  ): Promise<LoginResponse> {
    const id = uuid();

    const hashKey = this.userIdentityTable.hashKey(request.email);
    // Use an empty range key to enforce uniqueness on the hash key
    const rangeKey = this.userIdentityTable.rangeKey('');

    // This will write to the User Identity Table
    // In EventApi, it will watch for INSERT events on the table to handle
    // other asynchronous onboarding events, such as subscribing to SNS topics
    try {
      await this.userIdentityTable
        .put({
          hashKey,
          rangeKey,
          id,
          email: request.email,
        })
        .exec(preventOverwrite());
    } catch (err) {
      if (
        (err as DynamoDBServiceException)?.name !==
        DynamoDBExceptionName.ConditionalCheckFailedException
      ) {
        throw err;
      }
    }

    const { Item } = await this.userIdentityTable
      .get(hashKey, rangeKey)
      .exec({ ConsistentRead: true });

    if (!Item) {
      // An example on how to throw an error
      throw new HttpError(401, 'Unauthorized');
    }

    // Ensure another row exists mapping the random ID to email
    // (So we can look users up by their ID)
    await this.userIdentityTable
      .put({
        ...Item,
        email: null, // Get rid of the email on this record so EventApi doesn't handle it
        hashKey: this.userIdentityTable.hashKey(Item.id),
        rangeKey: this.userIdentityTable.rangeKey(Item.email!),
      })
      .exec();

    const { token, tokenCookie, refreshCookie } = await this.jwtService.createJwt(
      Item,
      'TODO-issuer',
      request.remember,
    );

    let response: LoginResponse = {
      id: Item.id,
      email: Item.email!,
      token: request.remember ? undefined : token,
    };

    if (tokenCookie) {
      response = res(200, response, { 'set-cookie': tokenCookie });
    }

    if (refreshCookie) {
      response = res(200, response, { 'set-cookie': refreshCookie });
    }

    return response;
  }
}
