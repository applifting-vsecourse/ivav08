import { AppModule } from '@/app.module';
import { configureApp } from '@/app.setup';
import { PrismaService } from '@/core/prisma/prisma.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

export type Agent = ReturnType<typeof request.agent>;

/** Same origin the frontend runs on; BetterAuth only trusts that one. */
export const FRONTEND_ORIGIN = 'http://localhost:3050';

/** The real Nest app (all modules, real database), without listening on a port. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
  configureApp(app);
  await app.init();
  return app;
}

/** Empties every table except Prisma's migration history. */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

let userCounter = 0;

/**
 * Signs up a fresh user through the real BetterAuth endpoint and returns an
 * agent that keeps the session cookie, i.e. a signed-in client.
 */
export async function signUp(
  app: INestApplication,
  options: { role?: 'user' | 'admin' } = {},
): Promise<{ agent: Agent; userId: string }> {
  userCounter += 1;
  const username = `duck_${Date.now()}_${userCounter}`.slice(-30);
  const agent = request.agent(app.getHttpServer());
  const response = await agent
    .post('/api/auth/sign-up/email')
    .set('Origin', FRONTEND_ORIGIN)
    .send({
      name: `Test Duck ${userCounter}`,
      username,
      email: `${username}@example.test`,
      password: 'integration-password-1',
    });
  if (response.status !== 200) {
    throw new Error(
      `Sign-up failed with ${response.status}: ${JSON.stringify(response.body)}`,
    );
  }
  const userId = (response.body as { user: { id: string } }).user.id;
  if (options.role === 'admin') {
    // Users can't make themselves admins; tests set the role directly.
    await app
      .get(PrismaService)
      .user.update({ where: { id: userId }, data: { role: 'admin' } });
  }
  return { agent, userId };
}

/** A client without a session cookie. */
export function signedOut(app: INestApplication): Agent {
  return request.agent(app.getHttpServer());
}
