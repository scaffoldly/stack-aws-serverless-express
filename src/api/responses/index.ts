import { Jwk } from '../../services/JwtService';

export type EmptyResponse = void;

export type JwksResponse = {
  keys: Jwk[];
};

export type HealthResponse = {
  name: string;
  version: string;
  now: Date;
  hrefs: {
    openApi: string;
    openApiDocs: string;
  };
};

export type LoginResponse = {
  uuid: string;
  email: string;
  token?: string;
};
