import express from 'express';
import { readFileSync } from 'fs';
import packageJson from '../package.json';
import { RegisterRoutes } from './routes';
import morganBody from 'morgan-body';
import swaggerJson from './swagger.json';
import { errorHandler } from './errors';
import { corsHandler } from './cors';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: 5242880 }));

morganBody(app, {
  noColors: true,
  immediateReqLog: true,
  prettify: true,
  logAllReqHeader: true,
  logRequestBody: false,
});

app.use(corsHandler({ withCredentials: true }));
app.use(errorHandler(packageJson.version));

RegisterRoutes(app);

app.get('/openapi.json', (_req: express.Request, res: express.Response) => {
  res.type('json');
  res.send(JSON.stringify(swaggerJson));
});

app.get('/swagger.html', (_req: express.Request, res: express.Response) => {
  const file = readFileSync('./public/swagger.html');
  res.type('html');
  res.send(file);
});

export default app;
