import { Request, Response, NextFunction } from 'express';
import { Path } from 'path-parser';
import { readFileSync } from 'fs';

export function docsHandler() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    if (new Path('/openapi.json').test(req.path)) {
      const file = readFileSync('./src/api/docs/openapi.json');
      res.type('html');
      res.send(file);
      return;
    }

    if (new Path('/swagger.html').test(req.path)) {
      const file = readFileSync('./src/api/docs/swagger.html');
      res.type('html');
      res.send(file);
      return;
    }

    next();
  };
}
