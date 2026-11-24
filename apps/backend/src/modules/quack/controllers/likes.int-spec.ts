// Integration tests for likes (cases.md, I1–I10): real HTTP requests against
// the real app and the quacker_test database. Run with `pnpm backend test:int`.
import {
  Agent,
  createTestApp,
  resetDatabase,
  signedOut,
  signUp,
} from '@/test/integration/test-app';
import { INestApplication } from '@nestjs/common';

type FeedQuack = {
  id: string;
  deleted: boolean;
  likeCount: number;
  likedByMe: boolean;
};

async function postQuack(
  agent: Agent,
  text = 'A quack to like',
): Promise<string> {
  const response = await agent.post('/api/quacks').send({ text }).expect(201);
  return (response.body as { id: string }).id;
}

async function inFeed(agent: Agent, quackId: string): Promise<FeedQuack> {
  const response = await agent.get('/api/quacks').expect(200);
  const quack = (response.body as FeedQuack[]).find(({ id }) => id === quackId);
  if (!quack) throw new Error(`Quack ${quackId} is not in the feed`);
  return quack;
}

describe('Likes API', () => {
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

  it('I1: signed out, liking and unliking give 401', async () => {
    const { agent: author } = await signUp(app);
    const quackId = await postQuack(author);

    await signedOut(app).put(`/api/quacks/${quackId}/like`).expect(401);
    await signedOut(app).delete(`/api/quacks/${quackId}/like`).expect(401);
  });

  it('I2: I like a quack, the count goes from 0 to 1', async () => {
    const { agent: author } = await signUp(app);
    const { agent: me } = await signUp(app);
    const quackId = await postQuack(author);

    const response = await me.put(`/api/quacks/${quackId}/like`).expect(200);

    expect(response.body).toEqual({ likeCount: 1, likedByMe: true });
    expect(await inFeed(me, quackId)).toMatchObject({
      likeCount: 1,
      likedByMe: true,
    });
    expect(await inFeed(author, quackId)).toMatchObject({
      likeCount: 1,
      likedByMe: false,
    });
  });

  it('I3: liking twice counts once', async () => {
    const { agent: author } = await signUp(app);
    const { agent: me } = await signUp(app);
    const quackId = await postQuack(author);

    await me.put(`/api/quacks/${quackId}/like`).expect(200);
    const again = await me.put(`/api/quacks/${quackId}/like`).expect(200);

    expect(again.body).toEqual({ likeCount: 1, likedByMe: true });
    expect((await inFeed(me, quackId)).likeCount).toBe(1);
  });

  it('I4: likes from different users add up', async () => {
    const { agent: author } = await signUp(app);
    const { agent: first } = await signUp(app);
    const { agent: second } = await signUp(app);
    const quackId = await postQuack(author);

    await first.put(`/api/quacks/${quackId}/like`).expect(200);
    const response = await second
      .put(`/api/quacks/${quackId}/like`)
      .expect(200);

    expect(response.body).toEqual({ likeCount: 2, likedByMe: true });
    expect((await inFeed(author, quackId)).likeCount).toBe(2);
  });

  it('I5: taking a like back brings the count down', async () => {
    const { agent: author } = await signUp(app);
    const { agent: me } = await signUp(app);
    const quackId = await postQuack(author);
    await me.put(`/api/quacks/${quackId}/like`).expect(200);

    const response = await me.delete(`/api/quacks/${quackId}/like`).expect(200);

    expect(response.body).toEqual({ likeCount: 0, likedByMe: false });
    expect(await inFeed(me, quackId)).toMatchObject({
      likeCount: 0,
      likedByMe: false,
    });
  });

  it('I6: taking back a like I never gave is not an error', async () => {
    const { agent: author } = await signUp(app);
    const { agent: other } = await signUp(app);
    const { agent: me } = await signUp(app);
    const quackId = await postQuack(author);
    await other.put(`/api/quacks/${quackId}/like`).expect(200);

    const response = await me.delete(`/api/quacks/${quackId}/like`).expect(200);

    // someone else's like stays
    expect(response.body).toEqual({ likeCount: 1, likedByMe: false });
  });

  it('I7: I can like my own quack', async () => {
    const { agent: me } = await signUp(app);
    const quackId = await postQuack(me);

    const response = await me.put(`/api/quacks/${quackId}/like`).expect(200);

    expect(response.body).toEqual({ likeCount: 1, likedByMe: true });
  });

  it('I8: an unknown quack gives 404', async () => {
    const { agent: me } = await signUp(app);

    await me.put('/api/quacks/does-not-exist/like').expect(404);
    await me.delete('/api/quacks/does-not-exist/like').expect(404);
  });

  it('I9: a deleted quack loses its likes and cannot be liked', async () => {
    const { agent: author } = await signUp(app);
    const { agent: me } = await signUp(app);
    const quackId = await postQuack(author, 'soon gone');
    await me.put(`/api/quacks/${quackId}/like`).expect(200);
    // a reply keeps the deleted quack in the feed as a placeholder (ADR 0001)
    await me
      .post(`/api/quacks/${quackId}/replies`)
      .send({ text: 'a reply that stays' })
      .expect(201);

    await author.delete(`/api/quacks/${quackId}`).expect(204);

    expect(await inFeed(me, quackId)).toMatchObject({
      deleted: true,
      likeCount: 0,
      likedByMe: false,
    });
    await me.put(`/api/quacks/${quackId}/like`).expect(404);
    await me.delete(`/api/quacks/${quackId}/like`).expect(404);
  });

  it('I10: a new quack starts with no likes', async () => {
    const { agent: me } = await signUp(app);
    const quackId = await postQuack(me);

    expect(await inFeed(me, quackId)).toMatchObject({
      likeCount: 0,
      likedByMe: false,
    });
  });
});
