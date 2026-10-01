import request from 'supertest';
import { createTestApp, type TestContext } from './helpers';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe('Donations', () => {
  let ctx: TestContext;
  const api = () => request(ctx.app.getHttpServer());
  let donor: string;
  let adminId: string;
  let admin: string;
  let causeId: string;
  let bankilyId: string;
  let masriviId: string;

  beforeAll(async () => {
    ctx = await createTestApp({ rateLimit: false });
    // Fixture: payment methods start as seeded (disabled, no number) in the dedicated test DB.
    await ctx.prisma.paymentMethod.updateMany({ data: { enabled: false, phoneNumber: null, instructions: null } });
    donor = `Bearer ${await ctx.token(ctx.newUserId())}`;
    adminId = ctx.newUserId();
    admin = `Bearer ${await ctx.token(adminId)}`;
    await api().get('/api/me').set('Authorization', admin).expect(200);
    // Admin role is granted server-side only (scripts/grant-admin), as here.
    await ctx.prisma.user.update({ where: { id: adminId }, data: { role: 'admin' } });

    const cause = await ctx.prisma.donationCause.findUniqueOrThrow({ where: { slug: 'orphan-sponsorship' } });
    causeId = cause.id;
    bankilyId = (await ctx.prisma.paymentMethod.findUniqueOrThrow({ where: { operator: 'bankily' } })).id;
    masriviId = (await ctx.prisma.paymentMethod.findUniqueOrThrow({ where: { operator: 'masrivi' } })).id;
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  describe('payment methods', () => {
    it('are all disabled after seeding, so none is offered', async () => {
      const res = await api().get('/api/donations/payment-methods').expect(200);
      expect(res.body).toEqual([]);
    });

    it('cannot be enabled without a real number', async () => {
      await api()
        .patch(`/api/admin/payment-methods/${bankilyId}`)
        .set('Authorization', admin)
        .send({ enabled: true })
        .expect(422);
      await api()
        .patch(`/api/admin/payment-methods/${bankilyId}`)
        .set('Authorization', admin)
        .send({ phoneNumber: '12345678', enabled: true })
        .expect(400);
    });

    it('are configured by an admin only', async () => {
      await api()
        .patch(`/api/admin/payment-methods/${bankilyId}`)
        .set('Authorization', donor)
        .send({ phoneNumber: '22 33 44 55', enabled: true })
        .expect(403);
      const res = await api()
        .patch(`/api/admin/payment-methods/${bankilyId}`)
        .set('Authorization', admin)
        .send({ phoneNumber: '+222 22 33 44 55', enabled: true, instructions: 'Transfert Bankily' })
        .expect(200);
      expect(res.body.phoneNumber).toBe('22334455');
      const methods = await api().get('/api/donations/payment-methods').expect(200);
      expect(methods.body.map((m: { operator: string }) => m.operator)).toEqual(['bankily']);
    });
  });

  describe('donor flow', () => {
    it('requires authentication', async () => {
      await api().post('/api/donations').send({ causeId, paymentMethodId: bankilyId, amount: 500 }).expect(401);
    });

    it('refuses disabled methods, other currencies and invalid amounts', async () => {
      const base = { causeId, paymentMethodId: bankilyId, amount: 500 };
      await api()
        .post('/api/donations')
        .set('Authorization', donor)
        .send({ ...base, paymentMethodId: masriviId })
        .expect(422);
      await api().post('/api/donations').set('Authorization', donor).send({ ...base, currency: 'EUR' }).expect(400);
      await api().post('/api/donations').set('Authorization', donor).send({ ...base, amount: -100 }).expect(400);
      await api().post('/api/donations').set('Authorization', donor).send({ ...base, amount: 99.5 }).expect(400);
    });

    it('creates a pending donation in MRU — never reported as paid', async () => {
      const res = await api()
        .post('/api/donations')
        .set('Authorization', donor)
        .send({ causeId, paymentMethodId: bankilyId, amount: 1000, donorName: 'Mohamed', status: 'confirmed' })
        .expect(201);
      expect(res.body).toMatchObject({ amount: 1000, currency: 'MRU', status: 'pending' });
      expect(res.body.code).toMatch(/^LW-[2-9A-Z]{6}$/);
    });

    it('moves to submitted with a reference and a verified proof file', async () => {
      const created = await api()
        .post('/api/donations')
        .set('Authorization', donor)
        .send({ causeId, paymentMethodId: bankilyId, amount: 200 })
        .expect(201);
      const id = created.body.id;

      await api()
        .post(`/api/donations/${id}/proof`)
        .set('Authorization', donor)
        .attach('file', Buffer.from('<html>not an image</html>'), { filename: 'x.png', contentType: 'image/png' })
        .expect(400);

      const withProof = await api()
        .post(`/api/donations/${id}/proof`)
        .set('Authorization', donor)
        .attach('file', PNG, { filename: 'recu.png', contentType: 'image/png' })
        .expect(201);
      expect(withProof.body).toMatchObject({ status: 'submitted', hasProof: true });

      const withRef = await api()
        .post(`/api/donations/${id}/reference`)
        .set('Authorization', donor)
        .send({ reference: 'BK-778899' })
        .expect(201);
      expect(withRef.body).toMatchObject({ status: 'submitted', reference: 'BK-778899' });
    });

    it('hides other donors’ donations', async () => {
      const created = await api()
        .post('/api/donations')
        .set('Authorization', donor)
        .send({ causeId, paymentMethodId: bankilyId, amount: 100 })
        .expect(201);
      const stranger = `Bearer ${await ctx.token(ctx.newUserId())}`;
      await api().get(`/api/donations/${created.body.id}`).set('Authorization', stranger).expect(404);
      await api().post(`/api/donations/${created.body.id}/cancel`).set('Authorization', stranger).expect(404);
    });
  });

  describe('admin review', () => {
    async function newDonation(auth: string, amount: number) {
      const res = await api()
        .post('/api/donations')
        .set('Authorization', auth)
        .send({ causeId, paymentMethodId: bankilyId, amount, reference: 'REF-123' })
        .expect(201);
      return res.body.id as string;
    }

    it('lets only admins confirm, and counts only confirmed money', async () => {
      const before = await api().get('/api/donations/causes').expect(200);
      const total = (body: { slug: string; confirmedAmount: number }[]) =>
        body.find((c) => c.slug === 'orphan-sponsorship')!.confirmedAmount;
      const initial = total(before.body);

      const id = await newDonation(donor, 5000);
      await api().patch(`/api/admin/donations/${id}/confirm`).set('Authorization', donor).send({}).expect(403);
      expect(total((await api().get('/api/donations/causes')).body)).toBe(initial);

      const confirmed = await api()
        .patch(`/api/admin/donations/${id}/confirm`)
        .set('Authorization', admin)
        .send({ note: 'Vérifié sur relevé Bankily' })
        .expect(200);
      expect(confirmed.body.status).toBe('confirmed');
      expect(total((await api().get('/api/donations/causes')).body)).toBe(initial + 5000);

      // A final decision cannot be changed or replayed.
      await api()
        .patch(`/api/admin/donations/${id}/reject`)
        .set('Authorization', admin)
        .send({ reason: 'test' })
        .expect(409);
      await api().patch(`/api/admin/donations/${id}/confirm`).set('Authorization', admin).send({}).expect(409);
      await api().post(`/api/donations/${id}/cancel`).set('Authorization', donor).expect(409);

      const detail = await api().get(`/api/admin/donations/${id}`).set('Authorization', admin).expect(200);
      expect(detail.body.events.map((e: { toStatus: string }) => e.toStatus)).toEqual([
        'pending',
        'submitted',
        'confirmed',
      ]);
    });

    it('requires a reason to reject', async () => {
      const id = await newDonation(donor, 300);
      await api().patch(`/api/admin/donations/${id}/reject`).set('Authorization', admin).send({}).expect(400);
      const res = await api()
        .patch(`/api/admin/donations/${id}/reject`)
        .set('Authorization', admin)
        .send({ reason: 'Référence introuvable' })
        .expect(200);
      expect(res.body).toMatchObject({ status: 'rejected', rejectionReason: 'Référence introuvable' });
    });

    it('forbids an admin from reviewing their own donation', async () => {
      const id = await newDonation(admin, 700);
      await api()
        .patch(`/api/admin/donations/${id}/confirm`)
        .set('Authorization', admin)
        .send({})
        .expect(403);
    });

    it('filters, searches and computes statistics', async () => {
      const id = await newDonation(donor, 400);
      const { code } = (await api().get(`/api/donations/${id}`).set('Authorization', donor)).body;
      const search = await api()
        .get('/api/admin/donations')
        .query({ q: code })
        .set('Authorization', admin)
        .expect(200);
      expect(search.body.items.map((d: { id: string }) => d.id)).toEqual([id]);

      const confirmed = await api()
        .get('/api/admin/donations')
        .query({ status: 'confirmed' })
        .set('Authorization', admin)
        .expect(200);
      expect(confirmed.body.items.every((d: { status: string }) => d.status === 'confirmed')).toBe(true);

      const stats = await api().get('/api/admin/donations/stats').set('Authorization', admin).expect(200);
      expect(stats.body.currency).toBe('MRU');
      expect(stats.body.byStatus.length).toBeGreaterThan(0);
    });

    it('serves proofs to admins only', async () => {
      const id = await newDonation(donor, 250);
      await api()
        .post(`/api/donations/${id}/proof`)
        .set('Authorization', donor)
        .attach('file', PNG, { filename: 'recu.png', contentType: 'image/png' })
        .expect(201);
      await api().get(`/api/admin/donations/${id}/proof`).set('Authorization', donor).expect(403);
      const proof = await api().get(`/api/admin/donations/${id}/proof`).set('Authorization', admin).expect(200);
      expect(proof.headers['content-type']).toBe('image/png');
    });
  });
});
