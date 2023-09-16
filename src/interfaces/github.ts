import { BaseEvent } from '@scaffoldly/serverless-util';
import { JwtRequest, JwtResponse } from './jwt';

export type GithubOauthDetail = {
  clientId: string;
  installUrl?: string;
};

export type GithubLoginRequest = {
  clientId: string;
  login?: string;
  state?: string;
  scope?: string;
  redirectUri: string;
  remember?: boolean;
};

export type GithubLoginResponse = {
  clientId: string;
  state: string;
  oauthRedirectUri?: string;
  expires?: Date;
};

export type GithubJwtRequest = JwtRequest & {
  code: string;
  state: string;
};

export type GithubTokenExchangeRequest = JwtRequest & {
  token: string;
};

export type InstallationResponse = {
  installationId: number;
  appId: number;
  target: string;
  suspended?: boolean;
};

export type GithubUserResponse = {
  login: string;
  name?: string;
  email: string;
  avatarUrl?: string;
  token: string;
  remember?: boolean;
  redirectUri?: string;
  installations?: InstallationResponse[];
};

export type GithubLoginTokenEventV1 = BaseEvent<'GithubLoginTokenEvent', 1> & {
  login: string;
  email?: string;
  token?: string;
  appId?: number;
  installationId?: number;
  deleted?: boolean;
};

export type InstallationStateRemoved = 'SUSPENDED' | 'DELETED';

export type InstallationState = 'INSTALLED' | InstallationStateRemoved;

export type GithubInstallationEventV1 = BaseEvent<'GithubInstallationEvent', 1> & {
  target: string;
  appId: number;
  installationId: number;
  state: InstallationState;
};

export type GithubIdentityEventV1 = BaseEvent<'GithubIdentityEvent', 1> & {
  id: number;
  login: string;
  emails?: string[];
  name?: string;
  twitter?: string;
  organizations?: string[];
  source: 'LOGIN' | 'ASSUME' | 'ADMINISTER' | 'COLLABORATE';
};

export type GithubMembershipEventV1 = BaseEvent<'GithubMembershipEvent', 1> & {
  target: string;
  appId: number;
  login: string;
  team: string;
  removed?: boolean;
};

export type GithubTargetMembershipEventV1 = BaseEvent<'GithubTargetMembershipEvent', 1> & {
  target: string;
  appId: number;
  login: string;
  removed?: boolean;
};

export type GithubJwtResponse = JwtResponse & {
  user: GithubUserResponse;
};
