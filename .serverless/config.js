const fs = require('fs');
const os = require('os');
const dotenv = require('dotenv');

const packageJson = require('../package.json');

module.exports['SERVICE_NAME'] = packageJson.name;
module.exports['SERVICE_SLUG'] = packageJson.name;
module.exports['STAGE_DOMAIN'] =
  `${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
module.exports['API_GATEWAY_DOMAIN'] =
  `${process.env.CODESPACE_NAME}-3000.${module.exports['STAGE_DOMAIN']}`;
module.exports['DEPLOY_ROLE'] = 'arn:aws:iam::000000000000:root';
module.exports['EXECUTE_ROLE'] = 'arn:aws:iam::000000000000:root';
module.exports['API_GATEWAY_ID'] = '0000000000';
module.exports['API_GATEWAY_ROOT_ID'] = '0000000000';

const { NODE_ENV } = process.env;

// Regex for GitHub toJSON() JSON-ish output
const APP_SECRETS_REGEX = / {2}(?<key>.*?): (?<value>.*?)(,\n|\n)/gm;
const APP_SECRETS_FILE = `${os.tmpdir()}/.ci-secrets`;
const APP_SECRET_PREFIX = `${NODE_ENV || ''}_APP_`.toUpperCase();

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

const appSecrets = {};

if (fs.existsSync(APP_SECRETS_FILE)) {
  const secrets = fs.readFileSync(APP_SECRETS_FILE).toString();

  let result;
  while ((result = APP_SECRETS_REGEX.exec(secrets)) !== null) {
    const { key, value } = result.groups;
    if (key.startsWith(APP_SECRET_PREFIX)) {
      appSecrets[`${key.replace(APP_SECRET_PREFIX, '')}`] = value;
    }
  }
}

module.exports.appSecrets = JSON.stringify(appSecrets);
