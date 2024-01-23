const { copy } = require('esbuild-plugin-copy');

module.exports = [
  copy({
    assets: {
      from: ['./src/api/docs/*'],
      to: ['./src/api/docs'],
    },
  }),
];
