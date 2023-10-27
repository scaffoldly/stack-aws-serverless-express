import { JWK, JWKECKey, JWT } from 'jose';
import Cookies from 'cookies';
import { JwtModel } from '../models/JwtModel';
import { UserIdentitySchema } from '../db/user-identity';
import { v1 as uuid } from 'uuid';
import { SecretService } from './aws/SecretService';

export type Scope = 'auth:identity' | 'auth:refresh';
export type JwkStore = 'primary' | 'secondary';

export const JWKS_STORE_NAME = `jwks`;
export const JWKS_PRIMARY_SECRET_KEY: JwkStore = 'primary';
export const JWKS_SECONDARY_SECRET_KEY: JwkStore = 'secondary';

export type Jwk = {
  kty: 'EC';
  crv: 'P-256';
  y: string;
  d?: string;
};

export type PemJwk = {
  pem: string;
  jwk: Jwk;
};

export type GeneratedKeys = {
  issuer: string;
  publicKey: PemJwk;
  privateKey: PemJwk;
};

export type JwtPayload = {
  aud: string;
  sub: string;
  iat: number;
  exp: number;
  iss: string;
  jti: string;
  scope: Scope;
};

export type Jwt = {
  token: string;
  tokenCookie?: string;
  refreshCookie?: string;
};

export class JwtService {
  jwtModel: JwtModel;

  secretService: SecretService;

  constructor() {
    this.jwtModel = new JwtModel();
    this.secretService = new SecretService();
  }

  getPublicKeys = async (issuer: string): Promise<Jwk[]> => {
    const jwks = await this.getOrCreateKeys(issuer);
    return jwks.map((jwk) => jwk.publicKey.jwk);
  };

  public createJwt = async (
    userIdentity: UserIdentitySchema,
    issuer: string,
    remember = false,
  ): Promise<Jwt> => {
    const issuedAt = new Date();

    const payload: JwtPayload = {
      aud: issuer,
      sub: `userId:${userIdentity.id}`,
      iat: issuedAt.getTime(),
      exp: issuedAt.getTime() + 3600,
      iss: issuer,
      jti: uuid(),
      scope: 'auth:identity',
    };

    const { token, cookie: tokenCookie } = await this.createToken(payload, 'primary');

    // Same payload with a longer expiration and different scope
    const { cookie: refreshCookie } = await this.createToken(
      { ...payload, exp: issuedAt.getTime() + 31536000, scope: 'auth:refresh' },
      'secondary',
    );

    return {
      token,
      tokenCookie: remember ? tokenCookie : undefined,
      refreshCookie: remember ? refreshCookie : undefined,
    };
  };

  createToken = async (
    payload: JwtPayload,
    jwkStore: JwkStore = 'primary',
  ): Promise<{ token: string; cookie: string }> => {
    const keys = await this.getOrCreateKeys(payload.iss);

    // Use the second key to sign in case the keys to be rotated
    const key = JWK.asKey(keys[jwkStore == 'secondary' ? 1 : 0].privateKey.jwk as JWKECKey);

    const token = JWT.sign(payload, key, {
      header: {
        typ: 'JWT',
      },
    });

    const domain = new URL(payload.iss).hostname;

    const cookie = new Cookies.Cookie(encodeURIComponent(`__Secure-${payload.scope}`), token, {
      domain,
      maxAge: (payload.exp - payload.iat) * 1000,
      overwrite: true,
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
    });

    return { token, cookie: cookie.toHeader() };
  };

  // public refresh = async (
  //   token: string,
  //   issuer: string,
  //   httpRequest: HttpRequest,
  // ): Promise<JwtResponse> => {
  //   const keys = await this.getOrCreateKeys(issuer);
  //   const jwks = new JWKS.KeyStore(keys.map((key) => JWK.asKey(key.privateKey.jwk as JWKECKey)));

  //   const decoded = JWT.decode(token) as Jwt;
  //   if (!decoded) {
  //     console.warn('Unable to decode token');
  //     throw new HttpError(401, 'Unauthorized');
  //   }

  //   const { provider } = parseUrn(decoded.aud);

  //   if (!provider) {
  //     console.warn('Unable to extract provider from audience', decoded);
  //     throw new HttpError(403, 'Forbidden');
  //   }

  //   const verifiedJwt = JWT.verify(token, jwks, {
  //     ignoreExp: true,
  //     issuer,
  //     audience: generateAudience(env['stage-domain'], provider),
  //   }) as Jwt;

  //   if (!verifiedJwt) {
  //     console.warn('Unable to verify token');
  //     throw new HttpError(403, 'Forbidden');
  //   }

  //   console.log('Refreshing', verifiedJwt);

  //   const jwt = await this.jwtModel.model.get(verifiedJwt.pk, verifiedJwt.sk);

  //   if (!jwt) {
  //     console.warn('Missing jwt in database');
  //     throw new HttpError(403, 'Forbidden');
  //   }

  //   const cookie = this.extractRefreshCookie(httpRequest, jwt.attrs.pk);
  //   if (!cookie.values.length) {
  //     console.warn(`Unable to find cookie with name ${cookie.name}`);
  //     throw new HttpError(403, 'Forbidden');
  //   }

  //   const verifiedRefresh = cookie.values.reduce((acc: Jwt | null, value) => {
  //     if (acc) {
  //       return acc;
  //     }

  //     const verified = JWT.verify(value, jwks, {
  //       audience: jwt.attrs.aud,
  //       issuer: jwt.attrs.iss,
  //       jti: jwt.attrs.jti,
  //       subject: jwt.attrs.sub,
  //     }) as Jwt;
  //     if (verified) {
  //       return verified;
  //     }

  //     return null;
  //   }, null);

  //   if (!verifiedRefresh) {
  //     console.warn('Unable to find matching cookie');
  //     throw new HttpError(403, 'Forbidden');
  //   }

  //   console.log('Matched and verified refresh token', verifiedRefresh);

  //   if (verifiedRefresh.scopes.indexOf('auth:refresh') === -1) {
  //     console.warn('Not a refresh token');
  //     throw new HttpError(403, 'Forbidden');
  //   }

  //   return this.createJwt(extractUserId(jwt.attrs), jwt.attrs.iss, provider, true, jwt.attrs.jti);
  // };

  // public verify = async (token: string, issuer: string): Promise<BaseJwtPayload> => {
  //   let decoded: Jwt;
  //   try {
  //     decoded = JWT.decode(token) as Jwt;
  //   } catch (e) {
  //     console.warn('Error decoding JWT', e);
  //     if (e instanceof Error) {
  //       throw new HttpError(401, `Unauthorized`);
  //     }
  //     throw e;
  //   }

  //   if (!decoded) {
  //     console.warn('Unable to decode token');
  //     throw new HttpError(401, 'Unauthorized');
  //   }

  //   console.log('Verifying token', decoded);

  //   const { provider } = parseUrn(decoded.aud);

  //   if (!provider) {
  //     console.warn('Unable to extract provider from audience', decoded);
  //     throw new HttpError(401, 'Unauthorized');
  //   }

  //   const keys = await this.getOrCreateKeys(issuer);
  //   const jwks = new JWKS.KeyStore(keys.map((key) => JWK.asKey(key.privateKey.jwk as JWKECKey)));

  //   let verified: Jwt;
  //   try {
  //     verified = JWT.verify(token, jwks, {
  //       audience: generateAudience(env['stage-domain'], provider),
  //       issuer,
  //     }) as Jwt;
  //   } catch (e: any) {
  //     console.warn('Error verifying JWT', e);
  //     if (e.code && e.code === 'ERR_JWT_EXPIRED') {
  //       throw new HttpError(403, `Expired Token`);
  //     }
  //     if (e instanceof Error) {
  //       throw new HttpError(401, `Unauthorized`);
  //     }
  //     throw e;
  //   }

  //   if (!verified) {
  //     console.warn('Unable to verify token');
  //     throw new HttpError(401, 'Unauthorized');
  //   }

  //   if (verified.scopes.indexOf('auth:access') === -1) {
  //     console.warn('Missing auth:access scope');
  //     throw new HttpError(401, 'Unauthorized');
  //   }

  //   console.log('Token is verified', verified);

  //   return verified;
  // };

  private getOrCreateKeys = async (issuer: string): Promise<GeneratedKeys[]> => {
    let primary = await this.secretService.getSecret(JWKS_STORE_NAME, JWKS_PRIMARY_SECRET_KEY);
    let secondary = await this.secretService.getSecret(JWKS_STORE_NAME, JWKS_SECONDARY_SECRET_KEY);

    if (!primary) {
      const generatedKeys = this.generateKeys(issuer);

      primary = await this.secretService.setSecret(
        JWKS_STORE_NAME,
        JWKS_PRIMARY_SECRET_KEY,
        Buffer.from(JSON.stringify(generatedKeys), 'utf8').toString('base64'),
      );

      if (!primary) {
        throw new Error('Unable to create primary JWKS');
      }
    }

    if (!secondary) {
      const generatedKeys = this.generateKeys(issuer);

      secondary = await this.secretService.setSecret(
        JWKS_STORE_NAME,
        JWKS_SECONDARY_SECRET_KEY,
        Buffer.from(JSON.stringify(generatedKeys), 'utf8').toString('base64'),
      );

      if (!secondary) {
        throw new Error('Unable to create secondary JWKS');
      }
    }

    const primaryKey = JSON.parse(Buffer.from(primary, 'base64').toString('utf8'));
    const secondaryKey = JSON.parse(Buffer.from(secondary, 'base64').toString('utf8'));

    return [primaryKey, secondaryKey];
  };

  private generateKeys = (issuer: string): GeneratedKeys => {
    const kid = uuid();
    const key = JWK.generateSync('EC', 'P-256', { use: 'sig', kid }, true);

    return {
      issuer,
      publicKey: {
        pem: key.toPEM(false),
        jwk: key.toJWK(false) as Jwk,
      },
      privateKey: {
        pem: key.toPEM(true),
        jwk: key.toJWK(true) as Jwk,
      },
    };
  };
}
