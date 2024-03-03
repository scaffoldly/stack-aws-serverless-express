import express from 'express';
import path from 'path';
import mime from 'mime-types';

export function webHandler(): express.RequestHandler {
  return express.static(path.join(__dirname, '..', '.angular', 'browser'), {
    setHeaders: (r, p) => {
      if (mime.lookup(p) === 'text/html') {
        r.setHeader(
          'Cache-Control',
          'no-store, max-age=0, private, must-revalidate',
        );
      } else {
        r.setHeader(
          'Cache-Control',
          `max-age=${process.env.NODE_ENV !== 'production' ? 0 : 86400}`,
        );
      }
    },
  });
}
