import {
  CreateSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
  SecretsManagerServiceException,
} from '@aws-sdk/client-secrets-manager';

// Cache in the global scope to speed up subsequent invocations
const secretCache: { [secretId: string]: { value: string; expires: number } } =
  {};

export default class SecretService {
  client: SecretsManagerClient;

  constructor() {
    this.client = new SecretsManagerClient();
  }

  public async getSecret(
    secretId: string,
    key: string,
    useCache = true,
  ): Promise<string | null> {
    const now = new Date().getTime();

    if (!useCache) {
      try {
        const { SecretString } = await this.client.send(
          new GetSecretValueCommand({ SecretId: secretId }),
        );

        if (!SecretString) {
          return null;
        }

        secretCache[secretId] = { value: SecretString, expires: now + 3600 };
      } catch (err) {
        return null;
      }
    }

    if (!secretCache[secretId]) {
      return this.getSecret(secretId, key, false);
    }

    const { value, expires } = secretCache[secretId];

    if (now >= expires) {
      return this.getSecret(secretId, key, false);
    }

    const secretObject = JSON.parse(value) as { [key: string]: string };

    if (!secretObject[key]) {
      return null;
    }

    return secretObject[key];
  }

  public async setSecret(
    secretId: string,
    key: string,
    value: string,
  ): Promise<string | null> {
    const entry = { [`${key}`]: value };

    try {
      const { SecretString = '{}' } = await this.client.send(
        new GetSecretValueCommand({ SecretId: secretId }),
      );

      const secretObject = {
        ...(JSON.parse(SecretString) as { [key: string]: string }),
        ...entry,
      };

      await this.client.send(
        new PutSecretValueCommand({
          SecretId: secretId,
          SecretString: JSON.stringify(secretObject),
        }),
      );
    } catch (err) {
      if (
        (err as SecretsManagerServiceException)?.name !==
        'ResourceNotFoundException'
      ) {
        throw err;
      }

      await this.client.send(
        new CreateSecretCommand({
          Name: secretId,
          SecretString: JSON.stringify(entry),
        }),
      );
    }

    delete secretCache[secretId];

    return this.getSecret(secretId, key);
  }
}
