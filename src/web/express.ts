import express, { Request, Response, NextFunction } from 'express';
import { Path } from 'path-parser';

export function webHandler(): express.RequestHandler {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    if (new Path('/').test(req.path)) {
      res.redirect('/api');
      return;
    }

    next();
  };
}
