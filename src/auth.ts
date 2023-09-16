import { authorize, DEFAULT_PROVIDER } from '@scaffoldly/serverless-util';
import { env } from './env';

const DOMAIN = env['stage-domain'];
const PROVIDERS = [DEFAULT_PROVIDER, ...env.GITHUB_CLIENT_IDS.split(',')];

export const expressAuthentication = authorize(DOMAIN, PROVIDERS);
