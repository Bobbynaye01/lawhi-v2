import request from 'supertest';
import { createTestApp, type TestContext } from './helpers';

describe('Authentication & account', () => {
  let ctx: TestContext;
  const api = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  it('rejects missing, malformed, expired and foreign tokens', async () => {
    const id = ctx.newUserId();
    await api().get('/api/me').expect(401);
    await api().get('/api/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
    await api()
      .get('/api/me')
      .set('Authorization', `Bearer ${await ctx.token(id, undefined, { expired: true })}`)
      .expect(401);
    await api()
      .get('/api/me')
      .set('Authorization', `Bearer ${await ctx.token(id, undefined, { foreign: true })}`)
      .expect(401);
  });

  it('creates the user on first request with the "user" role', async () => {
    const id = ctx.newUserId();
    const res = await api()
      .get('/api/me')
      .set(
        'Authorization',
        `Bearer ${await ctx.token(id, `Fatimetou.${id.slice(0, 6)}@Example.MR`)}`,
      )
      .expect(200);
    expect(res.body).toMatchObject({
      id,
      email: `fatimetou.${id.slice(0, 6)}@example.mr`,
      role: 'user',
    });
  });

  it('hands an email over to a new Supabase identity (account recreated outside the API)', async () => {
    const email = `reused.${ctx.newUserId().slice(0, 6)}@example.mr`;
    const oldId = ctx.newUserId();
    const newId = ctx.newUserId();
    await api()
      .get('/api/me')
      .set('Authorization', `Bearer ${await ctx.token(oldId, email)}`)
      .expect(200);
    const res = await api()
      .get('/api/me')
      .set('Authorization', `Bearer ${await ctx.token(newId, email)}`)
      .expect(200);
    expect(res.body).toMatchObject({ id: newId, email });
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: oldId } })).email).toBeNull();
  });

  it('never grants admin from a token claim', async () => {
    const id = ctx.newUserId();
    const auth = `Bearer ${await ctx.token(id)}`;
    await api().get('/api/me').set('Authorization', auth).expect(200);
    await api().get('/api/admin/donations').set('Authorization', auth).expect(403);
  });

  it('saves validated settings, reading position and bookmarks', async () => {
    const auth = `Bearer ${await ctx.token(ctx.newUserId())}`;
    await api()
      .put('/api/me/settings')
      .set('Authorization', auth)
      .send({ locale: 'fr', riwaya: 'warsh', prayerMethod: 'Egyptian', notificationMode: 'adhan' })
      .expect(200);
    await api()
      .put('/api/me/settings')
      .set('Authorization', auth)
      .send({ locale: 'de' })
      .expect(400);

    await api()
      .put('/api/me/reading-positions/warsh')
      .set('Authorization', auth)
      .send({ surah: 2, verse: 285 })
      .expect(200);
    // 2:286 exists in Hafs but not in Warsh.
    await api()
      .put('/api/me/reading-positions/warsh')
      .set('Authorization', auth)
      .send({ surah: 2, verse: 286 })
      .expect(400);

    const bookmark = await api()
      .post('/api/me/bookmarks')
      .set('Authorization', auth)
      .send({ riwaya: 'hafs', surah: 2, verse: 255, note: 'آية الكرسي' })
      .expect(201);
    const list = await api().get('/api/me/bookmarks').set('Authorization', auth).expect(200);
    expect(list.body).toHaveLength(1);

    const other = `Bearer ${await ctx.token(ctx.newUserId())}`;
    await api()
      .delete(`/api/me/bookmarks/${bookmark.body.id}`)
      .set('Authorization', other)
      .expect(404);
    await api()
      .delete(`/api/me/bookmarks/${bookmark.body.id}`)
      .set('Authorization', auth)
      .expect(204);
  });

  it('rate-limits donation creation before even checking the token', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await api().post('/api/donations').send({})).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it('deletes an account: data erased, access blocked', async () => {
    const id = ctx.newUserId();
    const auth = `Bearer ${await ctx.token(id)}`;
    await api()
      .put('/api/me/settings')
      .set('Authorization', auth)
      .send({ locale: 'en' })
      .expect(200);

    const res = await api().delete('/api/me').set('Authorization', auth).expect(200);
    expect(res.body).toEqual({ deactivated: true, authDeleted: false });

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id } });
    expect(user).toMatchObject({ status: 'deactivated', email: null });
    expect(await ctx.prisma.userSettings.findUnique({ where: { userId: id } })).toBeNull();
    await api().get('/api/me').set('Authorization', auth).expect(403);
  });
});
