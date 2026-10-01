import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { JWT_KEY_RESOLVER, supabaseJwksResolver, TokenVerifier } from './token-verifier';

@Global()
@Module({
  providers: [
    { provide: JWT_KEY_RESOLVER, useFactory: supabaseJwksResolver, inject: [ConfigService] },
    TokenVerifier,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [TokenVerifier],
})
export class AuthModule {}
