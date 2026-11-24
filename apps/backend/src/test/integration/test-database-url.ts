/**
 * Integration tests wipe their database between tests, so they get their own
 * database and never the one `pnpm dev` uses. Override with TEST_DATABASE_URL
 * (CI does); the name must end in `_test` either way.
 */
const DEFAULT_TEST_DATABASE_URL =
  'postgresql://quacker:quacker@localhost:5433/quacker_test';

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL || DEFAULT_TEST_DATABASE_URL;
  const databaseName = new URL(url).pathname.replace(/^\//, '');
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Refusing to run integration tests against database "${databaseName}": its name must end in _test, so the dev database is never wiped.`,
    );
  }
  return url;
}
