export type EmptyResponse = void;

export interface ErrorResponse {
  message: string;
}

export class RequestError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}

export type HealthResponse = {
  name: string;
  healty: boolean;
  now: Date;
  version: string;
};
