import { Request, Response, NextFunction } from 'express';
import { Path } from 'path-parser';
import openapi from '../docs/openapi.json';
import swagger from '../docs/swagger.html';

export function docsHandler() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    if (new Path('/openapi.json').test(req.path)) {
      res.type('json');
      res.send(openapi);
      return;
    }

    if (new Path('/swagger.html').test(req.path)) {
      res.type('html');
      res.send(swagger);
      return;
    }

    next();
  };
}
