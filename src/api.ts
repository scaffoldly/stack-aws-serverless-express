import express from 'express';
import morganBody from 'morgan-body';
import { configure } from '@vendia/serverless-express';
import { RegisterRoutes } from './api/express/routes';
import errorHandler from './api/express/errors';
import { corsHandler } from './api/express/cors';
import {
  requestEnricher,
  refreshHandler,
  cookieHandler,
} from './api/express/auth';
import { docsHandler } from './api/express/docs';
// import { webHandler } from './web';

const app = express();

morganBody(app, {
  noColors: true,
  immediateReqLog: true,
  prettify: true,
  logAllReqHeader: true,
  logRequestBody: true,
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

// app.use(webHandler());
// app.get('*', (req: express.Request, res: express.Response) => {
//   res.type(req.headers['content-type'] || 'json');
//   res.status(404);
//   res.send('');
// });

app.use(errorHandler());

export const lambda = configure({
  app,
  eventSourceRoutes: {
    AWS_DYNAMODB: '/api/event/dynamodb',
    AWS_SQS: '/api/event/sqs',
    AWS_SNS: '/api/event/sns',
  },
});
