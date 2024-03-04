# TODO List

IMMEDIATE NEXT:

- dotenv-out + serverless.yml
- serverless-angular perhaps?
- social auth?

ASSISTED BACKEND:

- AWS Role Assume for Deploy
- Custom Domains

OTHER:

- embed saml.to
- fix:
  - botocore.errorfactory.ResourceInUseException: An error occurred (ResourceInUseException) when calling the GetShardIterator
    operation: Stream arn:aws:kinesis:us-east-1:000000000000:stream/\_\_ddb_stream_stack-development is not currently ACTIVE or
    UPDATING.
  - AlreadyExistsException: Stack [stack-development] already exists
- add openapi-types to serverless-tsoa
- cleanup package.json and bump versions
- mute vite log outputc
- development builds / react browser plugin
- eslint peer dependencies from react-scripts and yarn install
- switch from supervisord to docker compose for localstack
- env vars into src/env.ts from serverless.yaml
- update README
- support for Layers
- unit/integration tests
- filters on topics and queues
- Websockets
- Handle message failures
- publish client libraries
- handle errors in offline resources when localstack is restarted
- pull request deploy
- s3 handler
- kinesis handler
- source maps
- annotations for apidocs
- reduce memory footprint
- start and open swagger.html at startup
- generate spec and routes filewatcher thingy
- research if express has a "host react in express" handler
- add xray
- seed data into ddb
- add localstack pods back
- reverse engineer cra-template-typescript to make this repo
- experiment with labda layers
- "welcome to codespaces message"

BUGS:

- [localstack] eventBridge.schedule does not update?
- [localstack] events don't send when input is set?
- [vendia/serverless-express] input might not work (might be failing in remote lambda?)
