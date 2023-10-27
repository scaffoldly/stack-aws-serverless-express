# TODO List

- test out JWKS creation
- repositiory name as service slug
- metadata like the BASE_URL from Codespaces/Local/LambdaEnv
- filters on topics and queues
- can we get subscribe events and unsubscribe events?
- error handling
- Websockets
- Handle message failures
- Update packages in package.json
- Remove `serverless-util` dependencies
- 404 API return no html
- KMS
- Secrets
- EnvVars
- Example Topics, Messages, Tables
- Integrate Public URL for GHA for CORS
- Node 18
- publish openapi
- handle errors in offline resources when localstack is restarted

// const existing = await this.userIdentityTable
// .query()
// .keyCondition((cn) =>
// cn
// .eq('hashKey', this.userIdentityTable.hashKey(request.email))
// .beginsWith('rangeKey', this.userIdentityTable.rangeKey('')),
// )
// .exec();

// console.log('!!! existing', existing);
