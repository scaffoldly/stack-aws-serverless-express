import express from 'express';
import morganBody from 'morgan-body';
import { configure } from '@vendia/serverless-express';
import { RegisterRoutes } from './routes';
import errorHandler from './errors';
import { corsHandler } from './cors';
import { requestEnricher, refreshHandler, cookieHandler } from './auth';
import { docsHandler } from './docs';

const app = express();

morganBody(app, {
  noColors: true,
  immediateReqLog: true,
  prettify: true,
  logAllReqHeader: true,
  logRequestBody: false,
});

app.disable('x-powered-by');
app.set('json spaces', 2);
app.use(express.json({ limit: 5242880 }));
app.use(corsHandler({ withCredentials: true }));
app.use(cookieHandler());
app.use(requestEnricher());
app.use(refreshHandler());
app.use(docsHandler());

RegisterRoutes(app);

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
