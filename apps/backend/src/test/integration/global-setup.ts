import { execSync } from 'node:child_process';
import * as path from 'node:path';
import { testDatabaseUrl } from './test-database-url';

/**
 * Runs once before all integration tests: brings the test database to the
 * current schema with the same migrations production uses. `migrate deploy`
 * also creates the database (`quacker_test`) when it doesn't exist yet.
 */
export default function globalSetup(): void {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../../..'),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'inherit',
  });
}
