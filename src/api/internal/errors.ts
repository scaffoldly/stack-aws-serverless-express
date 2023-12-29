export class HttpError extends Error {
  constructor(
    public readonly statusCode: StatusCode,
    public readonly message: string,
    public context = {} as { [key: string]: unknown },
  ) {
    super(message);
    this.name = `HTTP_${statusCode}`;
  }
}

export type StatusCode = 400 | 401 | 403 | 404 | 422 | 500 | 502 | 504;
