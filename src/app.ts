import express from 'express';
import { readFileSync } from 'fs';
import morganBody from 'morgan-body';
import Cookies from 'cookies';
import packageJson from '../package.json';
import { RegisterRoutes } from './routes';
import swaggerJson from './swagger.json';
import errorHandler from './errors';
import { corsHandler } from './cors';
import { requestEnricher, refreshHandler } from './auth';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './services/JwtService';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: 5242880 }));
app.use(corsHandler({ withCredentials: true }));
app.use(Cookies.express([ACCESS_COOKIE, REFRESH_COOKIE]));
app.use(requestEnricher());
app.use(refreshHandler());

morganBody(app, {
  noColors: true,
  immediateReqLog: true,
  prettify: true,
  logAllReqHeader: true,
  logRequestBody: false,
});

RegisterRoutes(app);
app.use(errorHandler(packageJson.version));

app.get('/openapi.json', (_req: express.Request, res: express.Response) => {
  res.type('json');
  res.send(JSON.stringify(swaggerJson));
});

app.get('/swagger.html', (_req: express.Request, res: express.Response) => {
  const file = readFileSync('./public/swagger.html');
  res.type('html');
  res.send(file);
});

app.get('*', (req: express.Request, res: express.Response) => {
  res.type(req.headers['content-type'] || 'json');
  res.status(404);
  res.send('');
});

export default app;
