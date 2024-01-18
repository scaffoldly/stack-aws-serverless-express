import express from 'express';
import morganBody from 'morgan-body';
import { readFileSync } from 'fs';
import { configure } from '@vendia/serverless-express';
import { RegisterRoutes } from './routes';
import swaggerJson from './swagger.json';
import errorHandler from './errors';
import { corsHandler } from './cors';
import { requestEnricher, refreshHandler, cookieHandler } from './auth';

const app = express();

app.disable('x-powered-by');
app.set('json spaces', 2);
app.use(express.json({ limit: 5242880 }));
app.use(corsHandler({ withCredentials: true }));
app.use(cookieHandler());
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

app.get('/openapi.json', (_req: express.Request, res: express.Response) => {
  res.type('json');
  res.send(JSON.stringify(swaggerJson));
});

app.get(['/swagger.html'], (_req: express.Request, res: express.Response) => {
  const file = readFileSync('./src/swagger.html');
  res.type('html');
  res.send(file);
});

app.get('*', (req: express.Request, res: express.Response) => {
  res.type(req.headers['content-type'] || 'json');
  res.status(404);
  res.send('');
});

app.use(errorHandler());

export const lambda = configure({
  app,
  eventSourceRoutes: {
    AWS_DYNAMODB: '/event/dynamodb',
    AWS_SQS: '/event/sqs',
    AWS_SNS: '/event/sns',
  },
});
