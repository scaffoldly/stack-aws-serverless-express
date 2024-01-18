import { Request, Response, NextFunction } from 'express';
import { Path } from 'path-parser';
import { readFileSync } from 'fs';
import swaggerJson from './swagger.json';

export function docsHandler() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    if (new Path('/openapi.json').test(req.path)) {
      res.json(swaggerJson);
      return;
    }

    if (new Path('/swagger.html').test(req.path)) {
      const file = readFileSync('./src/swagger.html');
      res.type('html');
      res.send(file);
      return;
    }

    next();
  };
}
