import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/services/server-auth';
import { CompanionSetupClient } from '@/components/admin/CompanionSetupClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Android Companion & SIM Sync',
  description: 'Physical SIM call recording, auto-sync, and Gemini Flash call intelligence settings.',
};

export default async function AdminCompanionPage() {
  const session = await getServerSession();
  const isSuperAdmin = session.role === 'SUPER_ADMIN' || (!!process.env.SUPER_ADMIN_EMAIL && session.email === process.env.SUPER_ADMIN_EMAIL);
  const isAdmin = session.role === 'ADMIN';

  if (!isSuperAdmin && !isAdmin) {
    redirect('/dashboard');
  }

  return <CompanionSetupClient />;
}
