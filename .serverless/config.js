const fs = require('fs');
const dotenv = require('dotenv');

const packageJson = require('../package.json');
module.exports['SERVICE_NAME'] = packageJson.name;

// TODO Remove or inject
module.exports['STAGE_DOMAIN'] =
  `${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
module.exports['API_GATEWAY_DOMAIN'] =
  `${process.env.CODESPACE_NAME}-3000.${module.exports['STAGE_DOMAIN']}`;

const { NODE_ENV, SECRETS = '' } = process.env;

// Regex for GitHub toJSON() JSON-ish output
// const APP_SECRETS_REGEX = / {2}(?<key>.*?): (?<value>.*?)(,\n|\n)/gm;

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

// const secrets = {};

// while ((result = APP_SECRETS_REGEX.exec(SECRETS)) !== null) {
//   const { key, value } = result.groups;
//   secrets[key] = value;
// }

module.exports.secrets = SECRETS;
