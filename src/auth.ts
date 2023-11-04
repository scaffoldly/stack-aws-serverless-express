import { NextFunction, Request, Response } from 'express';
import { JwtPayload, JwtService } from './services/JwtService';
import { HttpError } from './api/internal/errors';
import { UserIdentitySchema, UserIdentityTable } from './db/user-identity';
import { decodeKeys } from './db/base';
import Cookies from 'cookies';

export type UserIdentity = UserIdentitySchema & {
  token: string;
};

export type EnrichedRequest = Request & {
  certsUrl: string;
  user?: UserIdentity;
  setCookies?: string[];
};

export const ACCESS_COOKIE = `__Secure-access`;
export const REFRESH_COOKIE = `__Secure-refresh`;

// Cache in the global scope to speed up subsequent invocations
const userIdentityCache: { [sub: string]: { value: UserIdentitySchema; expires: number } } = {};

export const generateJwt = async (
  userIdentity: UserIdentitySchema,
  issuer: string,
  remember: boolean = false,
): Promise<{
  newToken: string;
  newPayload: JwtPayload;
  newRefreshToken: string;
  newSetCookies?: string[];
}> => {
  const jwtService = new JwtService();

  const { token, tokenPayload, tokenCookie, refreshToken, refreshCookie } =
    await jwtService.createJwt(userIdentity, issuer, remember);

  return {
    newToken: token,
    newPayload: tokenPayload,
    newRefreshToken: refreshToken,
    newSetCookies: [tokenCookie, refreshCookie],
  };
};

export async function expressAuthentication(
  req: Request,
  securityName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _scopes?: string[],
): Promise<UserIdentity> {
  const jwtService = new JwtService();
  const userIdentityTable = new UserIdentityTable();

  if (securityName !== 'jwt') {
    throw new HttpError(403, 'Forbidden');
  }

  let token: string | undefined = undefined;

  if (req.headers.authorization) {
    const [scheme, auth] = req.headers.authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new HttpError(403, 'Forbidden');
    }

    token = auth;
  }

  const cookies = req.cookies as Cookies;

  if (!token && cookies && cookies.get(ACCESS_COOKIE)) {
    token = cookies.get(ACCESS_COOKIE);
  }

  if (!token) {
    throw new HttpError(401, 'Unauthorized');
  }

  const tokenPayload = await jwtService.verifyJwt(token);

  if (!tokenPayload) {
    throw new HttpError(401, 'Unauthorized');
  }

  const sub = tokenPayload && tokenPayload.sub;

  if (!sub) {
    throw new HttpError(401, 'Unauthorized');
  }

  let userIdentity: UserIdentitySchema | undefined = undefined;

  if (tokenPayload && userIdentityCache[sub] && userIdentityCache[sub].expires < tokenPayload.exp) {
    userIdentity = userIdentityCache[sub].value;
  } else {
    delete userIdentityCache[sub];
  }

  if (!userIdentity) {
    const { hashKey, rangeKey } = decodeKeys(sub);

    const existing = await userIdentityTable.get(hashKey, rangeKey).exec();

    if (!existing || !existing.Item) {
      throw new HttpError(401, 'Unauthorized');
    }

    userIdentity = existing.Item;
  }

  if (!userIdentity) {
    throw new HttpError(401, 'Unauthorized');
  }

  userIdentityCache[sub] = {
    value: userIdentity,
    expires: tokenPayload.exp,
  };

  return {
    ...userIdentity,
    token,
  };
}

export function requestEnricher() {
  return (req: Request, _res: Response, next: NextFunction): Response | void => {
    const scheme = req.headers['x-forwarded-proto'] || req.headers['x-scheme'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    // const path = req.headers['x-original-uri'] || `${process.env.SERVICE_SLUG}${req.originalUrl}`;

    // TODO: Figure these out for different contexts
    // - Codespaces
    // - Lambda w/o Custom Domain
    // - Lambda w/Custom Domain
    // - Local
    (req as EnrichedRequest).certsUrl = `${scheme}://${host}/${process.env.SERVICE_SLUG}/certs`;

    next();
  };
}

export function refreshHandler() {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const jwtService = new JwtService();
    const userIdentityTable = new UserIdentityTable();

    let token: string | undefined = undefined;
    let refreshToken: string | undefined = undefined;

    const cookies = req.cookies as Cookies;

    if (cookies && cookies.get(ACCESS_COOKIE)) {
      token = cookies.get(ACCESS_COOKIE);
    }

    if (cookies && cookies.get(REFRESH_COOKIE)) {
      refreshToken = cookies.get(REFRESH_COOKIE);
    }

    if (!refreshToken) {
      next();
      return;
    }

    if (await jwtService.verifyJwt(token)) {
      // Valid access token, no need to refresh
      next();
      return;
    }

    const refreshPayload = await jwtService.verifyJwt(refreshToken);

    if (!refreshPayload) {
      next();
      return;
    }

    const sub = refreshPayload && refreshPayload.sub;

    if (!sub) {
      next();
      return;
    }

    const { hashKey, rangeKey } = decodeKeys(sub);

    const existing = await userIdentityTable.get(hashKey, rangeKey).exec();

    if (!existing || !existing.Item) {
      next();
      return;
    }

    const userIdentity = existing.Item;

    const { newToken, newRefreshToken, newSetCookies } = await generateJwt(
      userIdentity,
      refreshPayload.iss,
      true,
    );

    if (newSetCookies) {
      // Override the headers with the new tokens
      req.headers.cookie = `${ACCESS_COOKIE}=${newToken}; ${REFRESH_COOKIE}=${newRefreshToken}; ${
        req.headers.cookie || ''
      }`;
      res.setHeader('set-cookie', newSetCookies);
    }

    return Cookies.express([ACCESS_COOKIE, REFRESH_COOKIE])(req, res, next);
  };
}
