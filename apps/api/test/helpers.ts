import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { PrismaService } from '../src/database/prisma.service';
import { JWT_KEY_RESOLVER } from '../src/modules/auth/token-verifier';

const ISSUER = 'https://lawhi-test.supabase.co/auth/v1';

export interface TestContext {
  app: NestExpressApplication;
  prisma: PrismaService;
  /** Signs an access token shaped like Supabase's (RS256, aud=authenticated). */
  token: (sub: string, email?: string, overrides?: { expired?: boolean; foreign?: boolean }) => Promise<string>;
  newUserId: () => string;
}

/** Disables rate limiting for suites that legitimately send many requests. */
const unlimitedThrottler = {
  increment: async () => ({ totalHits: 1, timeToExpire: 60, isBlocked: false, timeToBlockExpire: 0 }),
};

export async function createTestApp(options: { rateLimit?: boolean } = {}): Promise<TestContext> {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const foreign = await generateKeyPair('RS256');
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256' };

  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(JWT_KEY_RESOLVER)
    .useValue(createLocalJWKSet({ keys: [jwk] }));
  if (options.rateLimit === false) {
    builder = builder.overrideProvider(ThrottlerStorage).useValue(unlimitedThrottler);
  }
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  configureApp(app, app.get(ConfigService));
  await app.init();

  const token: TestContext['token'] = async (sub, email, overrides = {}) => {
    const jwt = new SignJWT({ email: email ?? `${sub.slice(0, 8)}@test.lawhi`, role: 'authenticated' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setSubject(sub)
      .setAudience('authenticated')
      .setIssuer(ISSUER)
      .setIssuedAt();
    jwt.setExpirationTime(overrides.expired ? Math.floor(Date.now() / 1000) - 60 : '1h');
    return jwt.sign(overrides.foreign ? foreign.privateKey : privateKey);
  };

  return { app, prisma: app.get(PrismaService), token, newUserId: () => randomUUID() };
}
