import { configure } from '@vendia/serverless-express';
import app from './app';

// import { AWS } from '@scaffoldly/serverless-util';
// AWS.config.logger = console;

exports.handler = configure({
  app,
  eventSourceRoutes: {
    AWS_DYNAMODB: '/events/dynamodb',
    AWS_SQS: '/events/sqs',
    AWS_SNS: '/events/sns',
  },
});
