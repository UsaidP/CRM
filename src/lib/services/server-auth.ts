import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type SessionPayload,
} from '@/lib/services/auth-service';
import { bindTenant } from '@/lib/db/tenant-context';

/**
 * Retrieve the verified authenticated session in a React Server Component.
 * Automatically redirects to `/login` if unauthenticated or session is invalid.
 * Auto-binds the tenant context for server component database queries.
 */
export async function getServerSession(): Promise<SessionPayload> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect('/login');
  }

  const session = await verifySessionToken(token);
  if (!session || !session.organizationId || !session.userId) {
    redirect('/login');
  }

  bindTenant(session.organizationId);

  return session;
}

