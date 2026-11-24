// Integration tests (`*.int-spec.ts`): the real Nest app over HTTP (supertest)
// against a real Postgres database named quacker_test — never the dev database.
// Unit tests keep using the "jest" block in package.json.
const unit = require('./package.json').jest;

module.exports = {
  ...unit,
  // the app imports the e-mail templates, which are .tsx
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  transform: { '^.+\\.(t|j)sx?$': 'ts-jest' },
  testRegex: '\\.int-spec\\.ts$',
  globalSetup: '<rootDir>/src/test/integration/global-setup.ts',
  setupFiles: ['<rootDir>/src/test/integration/env.ts'],
  testTimeout: 30000,
};
