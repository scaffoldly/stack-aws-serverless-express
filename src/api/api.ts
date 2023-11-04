import { Controller, Get, Route, Tags, Security, NoSecurity, Request, Path } from '@tsoa/runtime';
import packageJson from '../../package.json';
import { HealthResponse, JwksResponse } from './responses/responses';
import { UserIdentitySchema, UserIdentityTable } from '../db/user-identity';
import { JwtService } from '../services/JwtService';
import { EnrichedRequest } from '../auth';
import { HttpError } from './internal/errors';

@Route('')
@Tags('Api')
export class Api extends Controller {
  userIdentityTable: UserIdentityTable;

  jwtService: JwtService;

  constructor() {
    super();
    this.userIdentityTable = new UserIdentityTable();
    this.jwtService = new JwtService();
  }

  @Get('/certs')
  @NoSecurity()
  public async certs(): Promise<JwksResponse> {
    return {
      keys: await this.jwtService.getPublicKeys(),
    };
  }

  @Get('/health')
  @NoSecurity()
  public async health(): Promise<HealthResponse> {
    return {
      name: packageJson.name,
      version: packageJson.version,
      now: new Date(),
    };
  }

  @Get('/users/me')
  @Security('jwt')
  public async getIdentity(@Request() httpRequest: EnrichedRequest): Promise<UserIdentitySchema> {
    const item = await this.userIdentityTable
      .get(httpRequest.user!.hashKey, httpRequest.user!.rangeKey)
      .exec();

    if (!item || !item.Item) {
      throw new HttpError(404, 'Not Found');
    }

    return item.Item;
  }

  @Get('/users/{uuid}')
  @Security('jwt')
  public async getUser(@Path() uuid: string): Promise<UserIdentitySchema> {
    const result = await this.userIdentityTable
      .query()
      .keyCondition((cn) => cn.eq('uuid', uuid))
      .exec({ IndexName: 'uuid-index' });

    if (!result.Count || !result.Items || result.Items.length !== 1) {
      throw new HttpError(404, 'Not Found');
    }

    return result.Items[0];
  }
}
