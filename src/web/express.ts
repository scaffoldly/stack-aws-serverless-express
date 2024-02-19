import express from 'express';
import path from 'path';
import mime from 'mime-types';

export function webHandler(): express.RequestHandler {
  return express.static(path.join(__dirname, '..', '.react'), {
    maxAge: '1d',
    setHeaders: (r, p) => {
      if (mime.lookup(p) === 'text/html') {
        r.setHeader(
          'Cache-Control',
          'no-store, max-age=0, private, must-revalidate',
        );
      }
    },
  });
}
