import { OAuthApp } from '@octokit/oauth-app';
import {
  constructServiceUrl,
  DEFAULT_PROVIDER,
  GetSecret,
  HttpError,
  HttpRequest,
  parseUrn,
  SERVICE_SLUG,
  SNS,
} from '@scaffoldly/serverless-util';
import { JWK, JWT } from 'jose';
import moment from 'moment';
import { Octokit } from 'octokit';
import { ulid } from 'ulid';
import { env } from '../env';
import {
  GithubIdentityEventV1,
  GithubInstallationEventV1,
  GithubJwtRequest,
  GithubJwtResponse,
  GithubLoginRequest,
  GithubLoginResponse,
  GithubLoginTokenEventV1,
  GithubTokenExchangeRequest,
  GithubUserResponse,
  InstallationResponse,
  InstallationStateRemoved,
} from '../interfaces/github';
import { GithubLoginModel } from '../models/GithubLoginModel';
import { GithubLogin } from '../models/interfaces';
import { KmsService } from './aws/kms/KmsService';
import { EncryptionService } from './interfaces/EncryptionService';
import { LoginService } from './interfaces/LoginService';
import { JwtService } from './JwtService';
import promiseRetry from 'promise-retry';

export class GithubLoginService implements LoginService<GithubJwtRequest, GithubJwtResponse> {
  githubLoginModel: GithubLoginModel;

  encryptionService: EncryptionService;

  jwtService: JwtService;

  constructor() {
    this.githubLoginModel = new GithubLoginModel();
    this.encryptionService = new KmsService();
    this.jwtService = new JwtService();
  }

  createLogin = async (
    request: GithubLoginRequest,
    httpRequest: HttpRequest,
    appId?: number,
    installationId?: number,
  ): Promise<GithubLoginResponse> => {
    console.log('Creating GitHub login', request);

    if (!request.scope || request.scope.indexOf('user:email') === -1) {
      request.scope = `user:email ${request.scope || ''}`.trim();
    }

    const expires = moment().add('10', 'minute');
    const state = request.state || ulid();

    const params = new URLSearchParams();
    params.set('client_id', request.clientId);
    params.set('scope', request.scope);
    params.set('state', state);
    params.set('redirect_uri', constructServiceUrl(httpRequest, SERVICE_SLUG, '/callback/github'));

    const oauthRedirectUri = `https://github.com/login/oauth/authorize?${params.toString()}`;

    const githubLogin = await this.githubLoginModel.model.create({
      pk: GithubLoginModel.prefix('pk', state),
      sk: GithubLoginModel.prefix('sk', request.clientId),
      clientId: request.clientId,
      oauthRedirectUri,
      redirectUri: request.redirectUri,
      remember: request.remember,
      scope: request.scope,
      login: request.login,
      state,
      appId,
      installationId,
      expires: expires.unix(),
    });

    console.log(
      `Created GitHub login pk:${githubLogin.attrs.pk} sk:${githubLogin.attrs.sk} (clientId: ${githubLogin.attrs.clientId})`,
    );

    return {
      clientId: githubLogin.attrs.clientId,
      state: githubLogin.attrs.state,
      expires: expires.toDate(),
      oauthRedirectUri,
    };
  };

  createLoginFromInstallationEvent = async (
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    event: any,
    appId: number,
    httpRequest: HttpRequest,
  ): Promise<GithubLoginResponse> => {
    console.log(`Creating GitHub login from installation event of App ID: ${appId}`, event);

    const { installation } = event;
    if (!installation) {
      throw new HttpError(400, 'Missing installation payload from event');
    }

    const { account, id: installationId } = installation;
    if (!installationId || !account) {
      throw new HttpError(400, 'Missing id or account on installation');
    }

    const { login: target } = account;
    if (!target) {
      throw new HttpError(400, `Missing login on account`);
    }

    const state = `${installationId}`;
    const sender = event.sender.login;

    const { clientId, homepageUrl } = await this.getApp(appId);

    const redirectUri = homepageUrl;

    const loginResponse = await this.createLogin(
      { clientId, state, login: sender, redirectUri },
      httpRequest,
      appId,
      installationId,
    );

    const installationEvent: GithubInstallationEventV1 = {
      type: 'GithubInstallationEvent',
      version: 1,
      target,
      appId,
      installationId,
      state: 'INSTALLED',
    };

    console.log('Publishing event for installation', installationEvent);

    const sns = await SNS();
    const message = await sns
      .publish({
        TopicArn: env['topic-arn'],
        Subject: installationEvent.type,
        Message: JSON.stringify(installationEvent),
      })
      .promise();

    if (!message.MessageId) {
      console.error('Error publishing message', message);
    }
    return loginResponse;
  };

  removeLoginFromInstallationEvent = async (
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    event: any,
    appId: number,
    installationState: InstallationStateRemoved,
  ): Promise<void> => {
    console.log(`Removing GitHub login from installation event of App ID: ${appId}`, event);

    const { installation } = event;
    if (!installation) {
      throw new HttpError(400, 'Missing installation payload from event');
    }

    const { account, id: installationId } = installation;
    if (!installationId) {
      throw new HttpError(400, 'Missing id on installation');
    }

    const { login: target } = account;
    if (!target) {
      throw new HttpError(400, `Missing login on account`);
    }

    const state = `${installationId}`;

    const { clientId } = await this.getApp(appId);

    await this.githubLoginModel.model.destroy(
      GithubLoginModel.prefix('pk', state),
      GithubLoginModel.prefix('sk', clientId),
    );

    const installationEvent: GithubInstallationEventV1 = {
      type: 'GithubInstallationEvent',
      version: 1,
      target,
      appId,
      installationId,
      state: installationState,
    };

    console.log(`Publishing event for ${installationState} installation`, installationEvent);

    const sns = await SNS();
    const message = await sns
      .publish({
        TopicArn: env['topic-arn'],
        Subject: installationEvent.type,
        Message: JSON.stringify(installationEvent),
      })
      .promise();

    if (!message.MessageId) {
      console.error('Error publishing message', message);
    }
  };

  login = async (request: GithubJwtRequest, issuer: string): Promise<GithubJwtResponse> => {
    console.log(`Exchanging code using state: ${request.state}`);

    const existingLogins = await promiseRetry(
      async (retry, number) => {
        console.log(`Looking up logins for state ${request.state} (attempt: ${number})`);
        const [results] = await this.githubLoginModel.model
          .query(GithubLoginModel.prefix('pk', request.state))
          .where('sk')
          .beginsWith(GithubLoginModel.prefix('sk'))
          .exec()
          .promise();

        if (!results || !results.Count) {
          retry(new HttpError(404, `Invalid state: ${request.state} [attempts: ${number}]`));
        }

        return results;
      },
      { retries: 5 },
    );

    const [existingLogin] = existingLogins.Items;

    console.log(
      `Found existing login: pk:${existingLogin.attrs.pk} sk:${existingLogin.attrs.sk} (clientId: ${existingLogin.attrs.clientId})`,
    );

    const clientSecret = await this.getClientSecret(existingLogin.attrs.clientId);

    // if (githubLogin.attrs.encryptedToken) {
    //   console.warn(
    //     `Duplicate login request using ${request.state} (clientId: ${githubLogin.attrs.clientId})`,
    //   );
    //   throw new HttpError(400, 'Duplicate request');
    // }

    if (existingLogin.attrs.expires && moment().isAfter(existingLogin.attrs.expires * 1000)) {
      throw new HttpError(400, 'Expired login request');
    }

    const app = new OAuthApp({
      clientType: 'oauth-app',
      clientId: existingLogin.attrs.clientId,
      clientSecret,
    });

    console.log(`Exchanging code:${request.code} (clientId: ${existingLogin.attrs.clientId})`);

    const { authentication } = await app.createToken({
      code: request.code,
      state: request.state,
    });

    const octokit = new Octokit({ auth: authentication.token });
    const { data: user } = await octokit.rest.users.getAuthenticated();

    console.log('Authenticated GitHub user:', user.login);

    if (existingLogin.attrs.login && existingLogin.attrs.login !== user.login) {
      throw new HttpError(403, `${user.login} is not the initiator of the login request`);
    }

    let email: string | undefined;

    const emails = await octokit.paginate(octokit.rest.users.listEmailsForAuthenticatedUser);
    const verifiedEmail = emails.find((e) => e.primary && e.verified);
    if (verifiedEmail) {
      email = verifiedEmail.email;
    }

    if (!email) {
      console.error(`Unable to find a verified email address for ${user.login}`);
      throw new HttpError(400, 'A verified GitHub email address is required');
    }

    const state = ulid();

    const jwtResponse = await this.jwtService.createJwt(
      email,
      issuer,
      existingLogin.attrs.clientId,
      request.remember,
      state,
    );

    const encryptedToken = await this.encryptionService.encrypt(authentication.token);

    const githubLogin = await this.githubLoginModel.model.create({
      pk: GithubLoginModel.prefix('pk', state),
      sk: GithubLoginModel.prefix('sk', existingLogin.attrs.clientId),
      clientId: existingLogin.attrs.clientId,
      oauthRedirectUri: existingLogin.attrs.oauthRedirectUri,
      redirectUri: existingLogin.attrs.redirectUri,
      remember: request.remember,
      scope: existingLogin.attrs.scope,
      state,
      appId: existingLogin.attrs.appId,
      installationId: existingLogin.attrs.installationId,
      login: user.login,
      email,
      encryptedToken,
      // expires: expires.unix(),
    });

    console.log(`Generated new JWT for ${user.login}:`, jwtResponse.payload);

    const githubUser: GithubUserResponse = {
      login: user.login,
      name: user.name || undefined,
      email,
      token: authentication.token,
      avatarUrl: user.avatar_url,
      remember: request.remember,
      redirectUri: githubLogin.attrs.redirectUri,
    };

    return {
      ...jwtResponse,
      user: await this.enrich(githubUser, githubLogin.attrs.installationId),
    };
  };

  private enrich = async (
    response: GithubUserResponse,
    installationId?: number,
  ): Promise<GithubUserResponse> => {
    const octokit = new Octokit({ auth: response.token });

    try {
      const installs = await octokit.paginate(
        octokit.rest.apps.listInstallationsForAuthenticatedUser,
      );

      response.installations = installs.reduce((acc, install) => {
        if (!install.account || !install.account.login) {
          return acc;
        }
        const item: InstallationResponse = {
          installationId: install.id,
          appId: install.app_id,
          target: install.account.login,
          suspended: !!install.suspended_at,
        };
        if (installationId === install.id) {
          acc = [item, ...acc];
        } else {
          acc.push(item);
        }
        return acc;
      }, [] as InstallationResponse[]);
    } catch (e) {
      console.warn('Error listing installed orgs/repos', e);
    }

    return response;
  };

  exchange = async (
    request: GithubTokenExchangeRequest,
    issuer: string,
  ): Promise<GithubJwtResponse> => {
    const { token: auth } = request;

    console.log(`Exchanging token: ${auth.substring(0, 10)}`);

    const octokit = new Octokit({ auth });

    let login: string;
    let name: string;
    let email: string | undefined;
    let avatarUrl: string | undefined;

    if (auth.startsWith('ghs_')) {
      try {
        const { data: repositories } = await octokit.rest.apps.listReposAccessibleToInstallation();
        console.log('Repositories accessible with github token', repositories.total_count);
        if (repositories.total_count !== 1) {
          console.error(`Invalid ghs token, more than one repository`);
          throw new HttpError(401, 'Unauthorized');
        }

        const [repository] = repositories.repositories;

        try {
          const { data: collaborators } = await octokit.rest.repos.listCollaborators({
            owner: repository.owner.login,
            repo: repository.name,
          });
          collaborators.forEach((c) => {
            console.log(
              `${repository.full_name} Collaborator: ${c.login} (${JSON.stringify(c.permissions)})`,
            );
          });
        } catch (e) {
          if (e instanceof Error) {
            console.warn('Error listing collaborators', e.message);
          }
        }

        login = repository.full_name;
        name = repository.name;
        email = `${repository.owner.login}+${repository.name}@noreply.github.com`;
        avatarUrl = undefined;
      } catch (e) {
        console.error('Error authenticating github server token', e);
        if (e instanceof Error) {
          throw new HttpError(401, 'Unauthorized', e);
        }
        throw e;
      }
    } else {
      const { data: user } = await octokit.rest.users.getAuthenticated();

      console.log('Authenticated GitHub user:', user.login);

      const emails = await octokit.paginate(octokit.rest.users.listEmailsForAuthenticatedUser);
      const verifiedEmail = emails.find((e) => e.primary && e.verified);
      if (verifiedEmail) {
        email = verifiedEmail.email;
      }

      if (!email) {
        console.error(`Unable to find a verified email address for ${user.login}`);
        throw new HttpError(400, 'A verified GitHub email address is required');
      }

      login = user.login;
      name = user.name || user.login;
      avatarUrl = user.avatar_url;
    }

    const jwtResponse = await this.jwtService.createJwt(
      email,
      issuer,
      DEFAULT_PROVIDER,
      request.remember,
      ulid(),
    );

    console.log(`Generated new JWT for ${login}:`, jwtResponse.payload);

    const githubUser: GithubUserResponse = {
      login: login,
      name: name,
      email,
      token: auth,
      avatarUrl: avatarUrl,
      remember: request.remember,
    };

    // TODO get installation ID from somewhere?

    return {
      ...jwtResponse,
      user: await this.enrich(githubUser),
    };
  };

  getUser = async (token: string, issuer: string): Promise<GithubUserResponse> => {
    const verified = await this.jwtService.verify(token, issuer);
    const { jti: state, aud } = verified;
    const { provider: clientId } = parseUrn(aud);

    if (!clientId) {
      console.warn('Unable to parse provider', aud);
      throw new HttpError(500, 'Unable to parse provider');
    }

    const githubLogin = await this.githubLoginModel.model.get(
      GithubLoginModel.prefix('pk', state),
      GithubLoginModel.prefix('sk', clientId),
    );

    if (!githubLogin) {
      console.warn(`Unable to find existing login (state:${state} clientId:${clientId})`);
      throw new HttpError(400, 'Not Found');
    }

    const { encryptedToken, email } = githubLogin.attrs;
    if (!encryptedToken || !email) {
      console.warn(`Missing email or encrypted token (state:${state} clientId:${clientId})`);
      throw new HttpError(500, 'Missing email or token from GitHub login');
    }

    const auth = await this.encryptionService.decrypt(encryptedToken);

    const octokit = new Octokit({ auth });
    const { data: user } = await octokit.rest.users.getAuthenticated();

    const response: GithubUserResponse = {
      login: user.login,
      name: user.name || undefined,
      email,
      token: auth,
      avatarUrl: user.avatar_url,
      remember: githubLogin.attrs.remember,
    };

    return this.enrich(response, githubLogin.attrs.installationId);
  };

  public handleAddOrModify = async (
    entity: GithubLogin,
  ): Promise<Array<GithubLoginTokenEventV1 | GithubIdentityEventV1> | GithubLogin | null> => {
    console.log('Added/Modified', entity);

    let githubLogin = await this.githubLoginModel.model.get(entity.pk, entity.sk);
    if (!githubLogin) {
      console.warn('Unknown login', entity.pk, entity.sk);
      return null;
    }

    let { encryptedToken } = githubLogin.attrs;

    const { login, email, installationId, appId } = githubLogin.attrs;

    if (!encryptedToken && installationId && appId) {
      const installationToken = await this.createInstallationToken(appId, installationId);
      if (!installationToken) {
        console.warn('Unable to create an installation token', { appId, installationId });
        return null;
      }

      encryptedToken = await this.encryptionService.encrypt(installationToken.token);

      githubLogin = await this.githubLoginModel.model.update({
        pk: entity.pk,
        sk: entity.sk,
        encryptedToken,
        expires: installationToken.expires.subtract(30, 'minute').unix(),
      } as Partial<GithubLogin>);

      // The update to GithubLogin will re-trigger this function again, so no need to continue
      return githubLogin.attrs;
    }

    if (!encryptedToken || !login) {
      console.warn('Missing token, login, or email', githubLogin.attrs.pk, githubLogin.attrs.sk);
      return null;
    }

    const token = await this.encryptionService.decrypt(encryptedToken);

    const loginTokenEvent: GithubLoginTokenEventV1 = {
      type: 'GithubLoginTokenEvent',
      version: 1,
      login,
      email,
      token,
      appId,
      installationId,
    };

    console.log(
      'Publishing login token event',
      loginTokenEvent.login,
      `${token.substring(0, 10)}...`,
    );

    const sns = await SNS();
    let message = await sns
      .publish({
        TopicArn: env['topic-arn'],
        Subject: loginTokenEvent.type,
        Message: JSON.stringify(loginTokenEvent),
      })
      .promise();

    if (!message.MessageId) {
      console.error('Error publishing message', message);
      throw new Error('Unable to publish message');
    }

    if (installationId) {
      // Don't emit identity events for app installations
      // Reason: we don't need token refreshes triggering these events
      return [loginTokenEvent];
    }

    const { rest: octokit } = new Octokit({ auth: token });

    const { data: user } = await octokit.users.getByUsername({ username: login });

    const identityEvent: GithubIdentityEventV1 = {
      type: 'GithubIdentityEvent',
      version: 1,
      id: user.id,
      login: user.login,
      emails: email ? [email] : undefined,
      name: user.name || undefined,
      twitter: user.twitter_username || undefined,
      source: 'LOGIN',
    };

    console.log('Publishing identity event', identityEvent);

    message = await sns
      .publish({
        TopicArn: env['topic-arn'],
        Subject: identityEvent.type,
        Message: JSON.stringify(identityEvent),
      })
      .promise();

    if (!message.MessageId) {
      console.error('Error publishing message', message);
    }

    return [loginTokenEvent, identityEvent];
  };

  public handleRemove = async (
    entity: GithubLogin,
  ): Promise<Array<GithubLoginTokenEventV1 | GithubIdentityEventV1> | GithubLogin | null> => {
    console.log('Removed', entity);

    const { installationId, appId } = entity;

    if (installationId && appId) {
      const installationToken = await this.createInstallationToken(appId, installationId);
      if (installationToken) {
        const encryptedToken = await this.encryptionService.encrypt(installationToken.token);

        const created = await this.githubLoginModel.model.create({
          ...entity,
          encryptedToken,
          expires: installationToken.expires.subtract(30, 'minute').unix(),
        });

        return created.attrs;
      }
    }

    if (!entity.login) {
      console.warn('Missing login', entity.pk, entity.sk);
      return null;
    }

    const event: GithubLoginTokenEventV1 = {
      type: 'GithubLoginTokenEvent',
      version: 1,
      login: entity.login,
      email: entity.email,
      appId: entity.appId,
      installationId: entity.installationId,
      deleted: true,
    };

    console.log('Publishing event for deleted token', event.login);

    const sns = await SNS();
    const message = await sns
      .publish({
        TopicArn: env['topic-arn'],
        Subject: event.type,
        Message: JSON.stringify(event),
      })
      .promise();

    if (!message.MessageId) {
      console.error('Error publishing message', message);
      throw new Error('Unable to publish message');
    }

    return [event];
  };

  public getApp = async (
    appId: number,
  ): Promise<{ clientId: string; appSlug: string; homepageUrl: string; installUrl: string }> => {
    const clientId = await GetSecret(`GITHUB_CLIENT_ID_${appId}`);
    if (!clientId) {
      throw new Error(`Unknown appId: ${appId}`);
    }

    const privateKeyBase64 = await GetSecret(`GITHUB_PRIVATE_KEY_${appId}`);

    if (!privateKeyBase64) {
      throw new Error(`Missing private key for appId: ${appId}`);
    }

    const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');

    const jwt = JWT.sign(
      {
        iat: moment().subtract(1, 'minute').unix(),
        exp: moment().add(10, 'minute').unix(),
        iss: appId,
      },
      JWK.asKey(privateKey),
      {
        algorithm: 'RS256',
      },
    );

    const octokit = new Octokit({ auth: jwt }).rest;

    const { data: app } = await octokit.apps.getAuthenticated();

    console.log('Fetched app', JSON.stringify(app));

    if (!app.slug) {
      throw new Error(`Missing slug for appId: ${appId}`);
    }

    return {
      clientId,
      homepageUrl: app.external_url,
      appSlug: app.slug,
      installUrl: `https://github.com/apps/${app.slug}/installations/new`,
    };
  };

  private getClientSecret = async (clientId: string): Promise<string> => {
    let clientSecret = await GetSecret(`GITHUB_${clientId.toUpperCase()}`);
    if (clientSecret) {
      return clientSecret;
    }

    clientId = clientId.replace(/\W/g, '_');
    clientSecret = await GetSecret(`GITHUB_${clientId.toUpperCase()}`);
    if (clientSecret) {
      return clientSecret;
    }

    throw new Error(`Unable to find client secret for client ID ${clientId}`);
  };

  private createInstallationToken = async (
    appId: number,
    installationId: number,
  ): Promise<{ token: string; expires: moment.Moment } | undefined> => {
    console.log('Creating installation token', { appId, installationId });

    const privateKeyBase64 = await GetSecret(`GITHUB_PRIVATE_KEY_${appId}`);

    if (!privateKeyBase64) {
      console.warn(`Missing private key for GitHub App ID ${appId}`);
      return undefined;
    }

    const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8');

    const jwt = JWT.sign(
      {
        iat: moment().subtract(1, 'minute').unix(),
        exp: moment().add(10, 'minute').unix(),
        iss: appId,
      },
      JWK.asKey(privateKey),
      {
        algorithm: 'RS256',
      },
    );

    const exchange = new Octokit({ auth: jwt }).rest;

    try {
      const { data: installationToken } = await exchange.apps.createInstallationAccessToken({
        installation_id: installationId,
      });

      const { token } = installationToken;

      console.log(
        `Authenticated as installation ${installationId} with token: ${token.substring(
          0,
          10,
        )} (expires at ${installationToken.expires_at})`,
      );

      return { token, expires: moment(installationToken.expires_at) };
    } catch (e) {
      // TODO Handle different types of transient errors,
      // If it's a retryable error, return an undefined token that expires immediately?
      console.warn('Unable to create installation access token', (e as Error).message);
      return undefined;
    }
  };
}
