import { Request, Response, NextFunction } from 'express';
import { Path } from 'path-parser';
import fs from 'fs';
import swagger from './docs/swagger.html';
import { EnrichedRequest } from './auth';

export function docsHandler() {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    if (new Path('/api/openapi.json').test(req.path)) {
      const request = req as EnrichedRequest;

      const openapi = JSON.parse(
        fs.readFileSync('src/lib/openapi.json').toString('utf8'),
      );

      openapi.servers = [{ url: request.baseUrl }];

      res.type('json');
      res.send(openapi);
      return;
    }

    if (new Path('/api/swagger.html').test(req.path)) {
      res.type('html');
      res.send(swagger);
      return;
    }

    next();
  };
}
