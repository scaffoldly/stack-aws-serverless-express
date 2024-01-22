const fs = require('fs');
const dotenv = require('dotenv');

const packageJson = require('../package.json');
module.exports['SERVICE_NAME'] = packageJson.name;

const { NODE_ENV, SECRETS = '' } = process.env;

let envVars = {};

try {
  const envFile = NODE_ENV
    ? fs.readFileSync(fs.openSync(`.scaffoldly/${NODE_ENV}/.env`))
    : fs.readFileSync(fs.openSync(`.scaffoldly/.env`));
  envVars = dotenv.parse(envFile);
} catch (e) {
  envVars = {};
}

Object.entries(envVars).forEach(([key, value]) => {
  module.exports[key] = value;
});

const includeSecrets = (envVars['INCLUDE_SECRETS'] || '').split(',');
// TODO Codespaces Secrets
const secrets = JSON.parse(SECRETS);

// Copy from secrets anything that's listed in ciSecrets
module.exports.SECRETS = JSON.stringify(
  Object.entries(secrets).reduce((acc, { key, value }) => {
    if (includeSecrets.includes(key)) {
      acc[key] = value;
    }
    return acc;
  }, {}),
);
