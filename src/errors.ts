import { ValidateError } from 'tsoa';
import { NextFunction, Request, Response } from 'express';
import { HttpError } from './api/internal/errors';
import { ErrorResponse } from './api/responses/responses';

export default function errorHandler(version: string) {
  return (
    err: Error,
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Response | void => {
    const traceId = process.env.XRAY_ENV_TRACE_ID || 'Unknown-Trace-Id';

    let httpError: HttpError;

    if (err instanceof HttpError) {
      httpError = err;
    } else if (err instanceof ValidateError || err.name === 'ValidateError') {
      httpError = new HttpError(
        (err as ValidateError).status,
        'Validation Failed',
        {
          fields: err.fields,
        },
      );
    } else if (err.statusCode) {
      httpError = new HttpError(err.statusCode, err.message || err.name, err);
    } else if (
      err.isAxiosError &&
      err.response &&
      err.response.status &&
      err.response.statusText
    ) {
      httpError = new HttpError(err.response.status, err.message);
    } else {
      httpError = new HttpError(500, err.message || 'Internal Server Error');
    }

    const errorResponse: ErrorResponse = {
      message: httpError.message,
      version,
      traceId,
      context: httpError.context,
    };

    res.status(httpError.statusCode).json(errorResponse);

    next();
  };
}
