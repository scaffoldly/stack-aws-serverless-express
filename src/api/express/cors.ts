import cors from 'cors';

type StaticOrigin = boolean | string | RegExp | (string | RegExp)[];
type CustomOrigin = (
  requestOrigin: string | undefined,
  callback: (err: Error | null, origin?: StaticOrigin) => void,
) => void;

export interface CorsOptions {
  headers?: string[];
  withCredentials?: boolean;
  maxAge?: number;
  origin?: StaticOrigin | CustomOrigin;
}

export function corsHandler(options: CorsOptions = {}): (
  req: cors.CorsRequest,
  res: {
    statusCode?: number;
    setHeader(key: string, value: string): unknown;
    end(): unknown;
  },
  next: (err?: unknown) => unknown,
) => void {
  return cors({
    origin: options.origin ? options.origin : true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    maxAge: options.maxAge ? options.maxAge : 7200,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Amz-Date',
      'X-Api-Key',
      'X-Amz-Security-Token',
      'X-Amz-User-Agent',
      'X-Retry',
      ...(options.headers && options.headers.length ? options.headers : []),
    ],
    credentials: options.withCredentials,
    exposedHeaders: [
      'X-Amzn-Trace-Id',
      ...(options.headers && options.headers.length ? options.headers : []),
    ],
    optionsSuccessStatus: 200,
    preflightContinue: true,
  });
}
