import { Jwk } from '../../services/JwtService';

export type EmptyResponse = void;

export interface ErrorResponse {
  message: string;
  version: string;
  traceId: string;
  context?: { [key: string]: any };
}

export type JwksResponse = {
  keys: Jwk[];
};

export type DefaultResponse = {
  name: string;
  version: string;
  now: Date;
  openApi: {
    swaggerUrl: string;
    openapiUrl: string;
  };
};

export type LoginResponse = {
  id: string;
  email: string;
  token?: string;
};
