/**
 * Grants or revokes the admin role. Server-side only — there is deliberately no
 * API endpoint for this.
 *
 *   pnpm --filter @lawhi/api admin:grant <email>            # grant
 *   pnpm --filter @lawhi/api admin:grant <email> --revoke   # revoke
 *
 * The person must have signed in to the app at least once.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

async function main() {
  const [email, flag] = process.argv.slice(2);
  if (!email) throw new Error('Usage: admin:grant <email> [--revoke]');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw new Error(`No user with email ${email} — they must sign in once first.`);
    if (user.status !== 'active') throw new Error('This account is deactivated.');
    const role = flag === '--revoke' ? 'user' : 'admin';
    await prisma.user.update({ where: { id: user.id }, data: { role } });
    console.warn(`${email} is now ${role}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
