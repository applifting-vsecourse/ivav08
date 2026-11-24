import { testDatabaseUrl } from './test-database-url';

// Runs before every integration test file, before the app is imported. The
// values are set explicitly so a developer's own `.env` (dev database, real
// mail keys) never leaks into the tests.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.NODE_ENV = 'test';
process.env.BETTER_AUTH_SECRET = 'integration-tests-only-secret-0123456789';
process.env.BACKEND_URL = 'http://localhost:4050';
process.env.FRONTEND_URL = 'http://localhost:3050';
// No mail provider: sign-up e-mails go to the console adapter.
process.env.RESEND_API_KEY = '';
process.env.SMTP_HOST = '';
