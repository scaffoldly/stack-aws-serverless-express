import {
  constructServiceUrl,
  ErrorResponse,
  extractRequestToken,
  HttpError,
  HttpRequest,
  SERVICE_SLUG,
} from '@scaffoldly/serverless-util';
import {
  Controller,
  Get,
  Post,
  Put,
  Response,
  Body,
  Request,
  Res,
  Route,
  Security,
  Tags,
  TsoaResponse,
  Query,
} from 'tsoa';
import { env } from '../env';
import {
  GithubJwtRequest,
  GithubJwtResponse,
  GithubLoginRequest,
  GithubLoginResponse,
  GithubOauthDetail,
  GithubTokenExchangeRequest,
  GithubUserResponse,
} from '../interfaces/github';
import { JwtResponse } from '../interfaces/jwt';
import { GithubLoginService } from '../services/GithubLoginService';
import { JwtService } from '../services/JwtService';

@Route('/api/v1/jwts/github')
@Tags('Jwt Github')
export class JwtGithubControllerV1 extends Controller {
  githubLoginService: GithubLoginService;

  jwtService: JwtService;

  constructor() {
    super();
    this.githubLoginService = new GithubLoginService();
    this.jwtService = new JwtService();
  }

  @Get()
  public async getOauthDetail(@Query() appId?: number): Promise<GithubOauthDetail> {
    if (!appId) {
      return {
        clientId: env.GITHUB_CLIENT_ID,
      };
    }

    try {
      const app = await this.githubLoginService.getApp(appId);
      return {
        clientId: app.clientId,
        installUrl: app.installUrl,
      };
    } catch (e) {
      if (e instanceof Error) {
        throw new HttpError(404, e.message);
      }
      throw e;
    }
  }

  @Put()
  @Response<ErrorResponse>('4XX')
  @Response<ErrorResponse>('5XX')
  @Response<JwtResponse, { 'set-cookie'?: string }>(200)
  public async createLogin(
    @Body() request: GithubLoginRequest,
    @Request() httpRequest: HttpRequest,
  ): Promise<GithubLoginResponse> {
    const response = await this.githubLoginService.createLogin(request, httpRequest);
    return response;
  }

  @Get('me')
  @Response<ErrorResponse>('4XX')
  @Response<ErrorResponse>('5XX')
  @Security('jwt')
  public getAuthenticatedUser(@Request() httpRequest: HttpRequest): Promise<GithubUserResponse> {
    const issuer = constructServiceUrl(
      httpRequest,
      SERVICE_SLUG,
      httpRequest.path.replace(/(.+)(\/.+)\/me$/gm, '$1'),
    );

    return this.githubLoginService.getUser(extractRequestToken(httpRequest), issuer);
  }

  @Post()
  @Response<ErrorResponse>('4XX')
  @Response<ErrorResponse>('5XX')
  @Response<JwtResponse, { 'set-cookie'?: string }>(200)
  public async oauthCallback(
    @Body() request: GithubJwtRequest,
    @Request() httpRequest: HttpRequest,
    @Res() res: TsoaResponse<200, JwtResponse, { 'set-cookie'?: string }>,
  ): Promise<GithubJwtResponse> {
    const issuer = constructServiceUrl(
      httpRequest,
      SERVICE_SLUG,
      httpRequest.path.replace(/(.+)(\/.+)$/gm, '$1'),
    );

    let jwtResponse = await this.githubLoginService.login(request, issuer);

    if (jwtResponse.payload && jwtResponse.user.remember !== false) {
      const refreshCookie = await this.jwtService.createRefreshCookie(
        jwtResponse.payload,
        httpRequest,
      );
      jwtResponse = res(200, jwtResponse, { 'set-cookie': refreshCookie });
    }

    return jwtResponse;
  }

  @Post('token')
  @Response<ErrorResponse>('4XX')
  @Response<ErrorResponse>('5XX')
  @Response<JwtResponse, { 'set-cookie'?: string }>(200)
  public async exchangeToken(
    @Body() request: GithubTokenExchangeRequest,
    @Request() httpRequest: HttpRequest,
    @Res() res: TsoaResponse<200, JwtResponse, { 'set-cookie'?: string }>,
  ): Promise<GithubJwtResponse> {
    const issuer = constructServiceUrl(
      httpRequest,
      SERVICE_SLUG,
      httpRequest.path.replace(/(.+)(\/.+)\/token$/gm, '$1'),
    );

    let jwtResponse = await this.githubLoginService.exchange(request, issuer);

    if (jwtResponse.payload && jwtResponse.user.remember !== false) {
      const refreshCookie = await this.jwtService.createRefreshCookie(
        jwtResponse.payload,
        httpRequest,
      );
      jwtResponse = res(200, jwtResponse, { 'set-cookie': refreshCookie });
    }

    return jwtResponse;
  }
}
