import { redirect } from 'next/navigation';
import { getOptionalServerSession } from '@/lib/services/server-auth';

export const dynamic = 'force-dynamic';

/**
 * /dashboard — canonical authenticated home.
 * Redirects back to '/' which contains the full dashboard server component.
 */
export default async function DashboardRedirectPage() {
  const session = await getOptionalServerSession();
  if (!session) {
    redirect('/login');
  }
  redirect('/');
}
