import Table from 'ddb-table';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import {
  DynamoDBClient,
  AttributeValue as DynamoDBAttributeValue,
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import bs58 from 'bs58';
import { AttributeValue } from 'aws-lambda';

export const KEY_SEPARATOR = '!';

export type Keys = {
  hashKey: string;
  rangeKey: string;
};

export type BaseSchema = Keys & {
  uuid?: string;
  expires?: number;
};

export type KeyPrefix = string;

export const encodeKeys = (schema: BaseSchema): string =>
  bs58.encode(
    Buffer.from(
      JSON.stringify({ hashKey: schema.hashKey, rangeKey: schema.rangeKey }),
      'utf8',
    ),
  );

export const decodeKeys = (encoded: string): BaseSchema =>
  JSON.parse(Buffer.from(bs58.decode(encoded)).toString('utf8'));

export type ConditionExpression = { ConditionExpression: string };

export const preventOverwrite = (): ConditionExpression => ({
  ConditionExpression:
    'attribute_not_exists(hashKey) AND attribute_not_exists(rangeKey)',
});

export abstract class BaseTable<
  T extends BaseSchema,
  HashKeyPrefix extends KeyPrefix,
  RangeKeyPrefix extends KeyPrefix,
> extends Table<T, 'hashKey' | 'uuid', 'rangeKey'> {
  constructor(
    tableName: string,
    private hashKeyPrefix: HashKeyPrefix,
    private rangeKeyPrefix: RangeKeyPrefix,
  ) {
    super({
      // No need to specify region or credentials
      // It's all provided by the execution role
      documentClient: DynamoDBDocument.from(new DynamoDBClient()),
      tableName,
      primaryKey: 'hashKey',
      sortKey: 'rangeKey',
    });
  }

  public preventOverwrite(): ConditionExpression {
    return {
      ConditionExpression: `attribute_not_exists(${this.primaryKey}) AND attribute_not_exists(${this.sortKey})`,
    };
  }

  public isRecord(
    record?: AttributeValue | Record<string, AttributeValue>,
  ): T | undefined {
    if (!record || !('hashKey' in record) || !('rangeKey' in record)) {
      return undefined;
    }

    const unmarshalled = unmarshall(
      record as DynamoDBAttributeValue | Record<string, DynamoDBAttributeValue>,
    );
    if (
      typeof unmarshalled.hashKey !== 'string' ||
      typeof unmarshalled.rangeKey !== 'string' ||
      !this.hashKey(unmarshalled.hashKey, true) ||
      !this.rangeKey(unmarshalled.rangeKey, true)
    ) {
      return undefined;
    }

    return unmarshalled as T;
  }

  public hashKey(value: string, check = false): string {
    if (!check) {
      return `${this.hashKeyPrefix}${KEY_SEPARATOR}${value}`;
    }
    if (!value.startsWith(this.hashKeyPrefix)) {
      return ''; // Empty string for truthy check
    }
    return value;
  }

  public rangeKey(value: string, check = false): string {
    if (!check) {
      return `${this.rangeKeyPrefix}${KEY_SEPARATOR}${value}`;
    }
    if (!value.startsWith(this.rangeKeyPrefix)) {
      return ''; // Empty string for truthy check
    }
    return value;
  }
}
