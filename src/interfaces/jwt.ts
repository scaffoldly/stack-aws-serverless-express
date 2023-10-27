import { Jwt } from '../models/interfaces';

export type TokenRequest = {
  token: string;
};

export interface JwtRequest {
  remember?: boolean;
}

export type JwtResponse = {
  token?: string;
  payload?: Jwt;
};
