import { ValidateError } from 'tsoa';
import { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import { HttpError, StatusCode } from './api/internal/errors';
import { ErrorResponse } from './api/responses';

export default function errorHandler(version: string) {
  return (
    err: unknown,
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Response | void => {
    const traceId = process.env.XRAY_ENV_TRACE_ID || 'Unknown-Trace-Id';

    console.error(err);

    let httpError: HttpError;

    if (!err) {
      httpError = new HttpError(500, 'Internal Server Error');
    } else if (err instanceof HttpError) {
      httpError = err;
    } else if (err instanceof ValidateError) {
      httpError = new HttpError(400, 'Bad Request', {
        fields: err.fields,
      });
    } else if (typeof err === 'object' && 'fields' in err) {
      httpError = new HttpError(400, 'Bad Request', {
        fields: err.fields,
      });
    } else if (typeof err === 'object' && 'statusCode' in err) {
      let message = 'Internal Server Error';
      if ('message' in err && typeof err.message === 'string') {
        message = err.message;
      }
      httpError = new HttpError(err.statusCode as StatusCode, message, {
        error: err,
      });
    } else if (axios.isAxiosError(err)) {
      const status = (err.response && err.response.status) || 500;
      httpError = new HttpError(status as StatusCode, err.message, {
        error: err,
      });
    } else {
      let message = 'Internal Server Error';
      if (
        typeof err === 'object' &&
        'message' in err &&
        typeof err.message === 'string'
      ) {
        message = err.message;
      }

      httpError = new HttpError(500, message, { error: err });
    }

    const errorResponse: ErrorResponse = {
      message: httpError.message,
      traceId,
      version,
      context: httpError.context,
    };

    res.status(httpError.statusCode).json(errorResponse);
    next();
  };
}
