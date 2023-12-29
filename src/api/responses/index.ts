import { Jwk } from '../../services/JwtService';

export type EmptyResponse = void;

export interface ErrorResponse {
  message: string;
  version: string;
  traceId: string;
  context?: { [key: string]: unknown };
}

export type JwksResponse = {
  keys: Jwk[];
};

export type HealthResponse = {
  name: string;
  version: string;
  now: Date;
};

export type LoginResponse = {
  uuid: string;
  email: string;
  token?: string;
};
