// Integration test: real HTTP requests (supertest) against the real Nest app
// and a real Postgres database (quacker_test). Run with `pnpm backend test:int`.
import {
  createTestApp,
  resetDatabase,
  signedOut,
  signUp,
} from '@/test/integration/test-app';
import { INestApplication } from '@nestjs/common';

describe('GET /api/quacks', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when signed out', async () => {
    await signedOut(app).get('/api/quacks').expect(401);
  });

  it('returns 200 and the feed when signed in', async () => {
    const { agent } = await signUp(app);
    await agent
      .post('/api/quacks')
      .send({ text: 'Hello from an integration test' })
      .expect(201);

    const response = await agent.get('/api/quacks').expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({ text: 'Hello from an integration test' }),
    ]);
  });
});
