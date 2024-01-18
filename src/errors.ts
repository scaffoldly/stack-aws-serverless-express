import { ValidateError } from 'tsoa';
import { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import { HttpError } from './api/internal/errors';

export default function errorHandler() {
  return (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
  ): Response | void => {
    console.error(err);

    let httpError: HttpError;

    if (err instanceof Error && err.name === 'HttpError') {
      httpError = err as HttpError;
    } else if (err instanceof Error && err.name === 'ValidateError') {
      const error = err as ValidateError;
      httpError = new HttpError(error.status, {
        message: error.message,
        error,
      });
    } else if (
      err &&
      typeof err === 'object' &&
      'statusCode' in err &&
      typeof err.statusCode === 'number' &&
      'message' in err &&
      typeof err.message === 'string'
    ) {
      httpError = new HttpError(err.statusCode, {
        error: new Error(err.message),
      });
    } else if (
      err &&
      typeof err === 'object' &&
      'message' in err &&
      typeof err.message === 'string'
    ) {
      httpError = new HttpError(500, {
        error: new Error(err.message),
      });
    } else if (axios.isAxiosError(err)) {
      const status = (err.response && err.response.status) || 503;
      const message =
        err.response &&
        err.response.data &&
        (err.response.data.message || err.response.data.errorMessage);
      httpError = new HttpError(status, {
        error: err,
        message: typeof message === 'string' ? message : undefined,
      });
    } else {
      httpError = new HttpError(500, {
        message: 'Unknown Error',
      });
    }

    res.status(httpError.status);
    if (req.accepts('html')) {
      next(httpError);
    } else {
      res.json(httpError.toResponse());
    }
  };
}
