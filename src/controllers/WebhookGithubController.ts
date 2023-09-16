import { ErrorResponse, HttpRequest, SNS } from '@scaffoldly/serverless-util';
import { Controller, Post, Response, Body, Route, Tags, Request, Header, Hidden } from 'tsoa';
import { env } from '../env';
import { Any } from '../interfaces';
import { GithubMembershipEventV1, GithubTargetMembershipEventV1 } from '../interfaces/github';
import { GithubLoginService } from '../services/GithubLoginService';
import { JwtService } from '../services/JwtService';

@Route('/webhook/github')
@Tags('Webhooks Github')
@Hidden()
export class WebhookGithubController extends Controller {
  githubLoginService: GithubLoginService;

  jwtService: JwtService;

  constructor() {
    super();
    this.githubLoginService = new GithubLoginService();
    this.jwtService = new JwtService();
  }

  @Post()
  @Response<ErrorResponse>('4XX')
  @Response<ErrorResponse>('5XX')
  public async receiveWebhook(
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    @Body() event: Any,
    @Request() httpRequest: HttpRequest,
    @Header('x-github-event') eventType?: string,
    @Header('x-github-hook-installation-target-id') targetId?: string,
  ): Promise<void> {
    // TODO Signature Verification
    console.log('!!! webhook headers', JSON.stringify(httpRequest.headers));
    console.log('!!! received webhook', JSON.stringify(event));

    if (eventType === 'installation' && targetId) {
      const appId = Number(targetId);
      if (event.action === 'created' || event.action === 'unsuspend') {
        await this.githubLoginService.createLoginFromInstallationEvent(event, appId, httpRequest);
        return;
      }
      if (event.action === 'deleted' || event.action === 'suspend') {
        await this.githubLoginService.removeLoginFromInstallationEvent(
          event,
          appId,
          event.action === 'suspend' ? 'SUSPENDED' : 'DELETED',
        );
      }
    }

    if (
      eventType === 'membership' &&
      targetId &&
      event.member &&
      event.team &&
      event.organization
    ) {
      const { member, team, organization } = event;

      const membershipEvent: GithubMembershipEventV1 = {
        type: 'GithubMembershipEvent',
        version: 1,
        target: organization.login,
        appId: Number(targetId),
        login: member.login,
        team: team.slug,
        removed: event.action === 'removed',
      };

      const sns = await SNS();
      const message = await sns
        .publish({
          TopicArn: env['topic-arn'],
          Subject: membershipEvent.type,
          Message: JSON.stringify(membershipEvent),
        })
        .promise();

      if (!message.MessageId) {
        console.error('Error publishing membership message', message);
      }
    }

    if (
      eventType === 'organization' &&
      targetId &&
      event.organization &&
      event.membership &&
      event.membership.user
    ) {
      const { organization, membership } = event;
      const { user } = membership;

      const membershipEvent: GithubTargetMembershipEventV1 = {
        type: 'GithubTargetMembershipEvent',
        version: 1,
        target: organization.login,
        appId: Number(targetId),
        login: user.login,
        removed: event.action === 'member_removed',
      };

      const sns = await SNS();
      const message = await sns
        .publish({
          TopicArn: env['topic-arn'],
          Subject: membershipEvent.type,
          Message: JSON.stringify(membershipEvent),
        })
        .promise();

      if (!message.MessageId) {
        console.error('Error publishing membership message', message);
      }
    }
  }
}
