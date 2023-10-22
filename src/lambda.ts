import { configure } from '@vendia/serverless-express';
import app from './app';

exports.handler = configure({
  app,
  eventSourceRoutes: {
    AWS_DYNAMODB: '/event/dynamodb',
    AWS_SQS: '/event/sqs',
    AWS_SNS: '/event/sns',
  },
});
