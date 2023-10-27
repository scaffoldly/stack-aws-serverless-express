// import { Controller, Post, Response, Body, Route, Tags, Header } from '@tsoa/runtime';
// import { SqsService } from '../services/aws/SqsService';
// import { WebhookMessage } from './internal/messages';
// import { BaseWebhook, ExampleWebhook } from './requests/requests';
// import { EmptyResponse, ErrorResponse } from './responses/responses';

// @Route('/webhook')
// @Tags('Webhooks')
// export class WebhookGithubController extends Controller {
//   sqsService: SqsService;

//   constructor() {
//     super();
//     this.sqsService = new SqsService();
//   }

//   @Post('/{userId}/message')
//   @Response<EmptyResponse>('204')
//   @Response<ErrorResponse>('4XX')
//   @Response<ErrorResponse>('5XX')
//   public async receiveWebhook(
//     @Body() message: string,
//     // Whatever headers are coming from the webhook sender
//     @Header('user-agent') userAgent?: string,
//     @Header('x-forwarded-for') forwardedFor?: string,
//   ): Promise<void> {
//     const payload = event as BaseWebhook;

//     // Preflight checks.
//     // Protip: check the signature, etc.
//     if (!payload.type || !payload.version) {
//       return;
//     }

//     if (payload.type === 'ExampleWebhook' && payload.version === 1) {
//       const example = payload as ExampleWebhook;

//       await this.sqsService.sendMessage({
//         type: 'WebhookMessage',
//         version: 1,
//         queueUrl: process.env.DEFAULT_QUEUE_URL, // DEFAULT_QUEUE_URL is set in serverless.yml
//         timestamp: Date.now(),
//         event: example,
//       } as WebhookMessage);

//       return;
//     }
//   }
// }
