import { Request, Response, NextFunction } from 'express';
import { Path } from 'path-parser';
import openapi from './docs/openapi.json';
import swagger from './docs/swagger.html';
import { EnrichedRequest } from './auth';

export function docsHandler() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    if (new Path('/api/openapi.json').test(req.path)) {
      const request = req as EnrichedRequest;
      res.type('json');
      const json = openapi;
      json.servers = [{ url: request.baseUrl }];
      res.send(json);
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
