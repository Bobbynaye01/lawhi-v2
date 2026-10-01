import type { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import type { Env } from './config/env';

/** Shared by main.ts and the e2e tests so both run the exact same HTTP stack. */
export function configureApp(app: NestExpressApplication, config: ConfigService<Env, true>): void {
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.disable('x-powered-by');
  app.useBodyParser('json', { limit: '100kb' });
  // Behind a single reverse proxy (Render, Fly, Nginx…) so rate limiting sees the client IP.
  app.set('trust proxy', 1);

  const origins = config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    // Native apps send no Origin header; browsers must be explicitly allowed.
    origin: origins.length > 0 ? origins : false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  });
  app.enableShutdownHooks();
}
