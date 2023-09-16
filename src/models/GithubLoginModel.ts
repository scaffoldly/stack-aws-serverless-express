import {
  Joi,
  Model,
  SERVICE_NAME,
  STAGE,
  Table,
  unmarshallDynamoDBImage,
} from '@scaffoldly/serverless-util';
import { StreamRecord } from 'aws-lambda';
import { GithubLogin } from './interfaces';
import { githubLogin } from './schemas/GithubLogin';

const TABLE_SUFFIX = '';

export class GithubLoginModel {
  public readonly table: Table<GithubLogin>;

  public readonly model: Model<GithubLogin>;

  constructor() {
    this.table = new Table(TABLE_SUFFIX, SERVICE_NAME, STAGE, githubLogin, 'pk', 'sk', [
      { hashKey: 'sk', rangeKey: 'pk', name: 'sk-pk-index', type: 'global' },
    ]);

    this.model = this.table.model;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  static prefix = (col: 'pk' | 'sk', value?: any): string => {
    if (col === 'pk') {
      return `github_${value || ''}`;
    }
    return `login_${value || ''}`;
  };

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  static isGithubLogin = (record: StreamRecord): boolean => {
    if (!record) {
      return false;
    }

    const check = unmarshallDynamoDBImage(record.Keys) as { pk: string; sk: string };

    if (!check.pk || !check.sk || typeof check.pk !== 'string' || typeof check.sk !== 'string') {
      return false;
    }

    const { pk, sk } = check;

    try {
      Joi.assert(pk, githubLogin.pk);
      Joi.assert(sk, githubLogin.sk);
    } catch (e) {
      return false;
    }

    return true;
  };
}
