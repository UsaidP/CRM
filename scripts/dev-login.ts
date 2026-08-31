/**
 * Dev helper: mint a real signed session cookie for a seeded user.
 *
 *   bun scripts/dev-login.ts broker@zamzam.local
 *
 * Prints the cookie value to paste into your browser devtools
 * (name: zamzam_session) or use with curl: -H "Cookie: zamzam_session=..."
 *
 * No security hole: this is just a normal login that skips the form.
 * Tokens are signed with the same JWT_SECRET and expire like any session.
 */
import { PrismaClient } from '@prisma/client';
import { createSessionToken, SESSION_COOKIE_NAME } from '../src/lib/services/auth-service';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: bun scripts/dev-login.ts <user-email>');
    process.exit(1);
  }

  const allUsers = await prisma.user.findMany();
  const user = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.error(`No user found with email: ${email}`);
    const users = await prisma.user.findMany({ take: 10, select: { email: true, role: true } });
    console.error('Available users:\n' + users.map((u) => `  ${u.email} (${u.role})`).join('\n'));
    process.exit(1);
  }

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as never,
    organizationId: user.organizationId,
    isSuperAdmin: user.role === 'SUPER_ADMIN',
  });

  console.log(`\nSigned in as: ${user.fullName} <${user.email}> (${user.role})`);
  console.log(`\nCookie: ${SESSION_COOKIE_NAME}=${token}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
