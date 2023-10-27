import Table from 'ddb-table';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export const KEY_SEPARATOR = '_';

export interface BaseSchema {
  hashKey: string;
  rangeKey: string;
  expires?: number;
}

export type KeyPrefix = string;

export const preventOverwrite = () => {
  return {
    ConditionExpression: `attribute_not_exists(hashKey) AND attribute_not_exists(rangeKey)`,
  };
};

export abstract class BaseTable<
  T extends BaseSchema,
  HashKeyPrefix extends KeyPrefix,
  RangeKeyPrefix extends KeyPrefix,
> extends Table<T, 'hashKey', 'rangeKey'> {
  constructor(
    tableName: string,
    private hashKeyPrefix: HashKeyPrefix,
    private rangeKeyPrefix: RangeKeyPrefix,
  ) {
    super({
      // No need to specify region or credentials
      // It's all provided by the execution role
      documentClient: DynamoDBDocument.from(new DynamoDBClient()),
      tableName: tableName,
      primaryKey: 'hashKey',
      sortKey: 'rangeKey',
    });
  }

  public preventOverwrite() {
    return {
      ConditionExpression: `attribute_not_exists(${this.primaryKey}) AND attribute_not_exists(${this.sortKey})`,
    };
  }

  public isRecord(record?: Record<string, any> | { [key: string]: any }): T | undefined {
    if (!record || !('hashKey' in record) || !('rangeKey' in record)) {
      return undefined;
    }

    const unmarshalled = unmarshall(record);
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
