import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/services/server-auth';
import { RbacManagementClient } from '@/components/admin/RbacManagementClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Team & RBAC Authority',
  description: 'Manage broker agent permissions, team assignments, and administrative access.',
};

export default async function AdminUsersPage() {
  const session = await getServerSession();
  const isSuperAdmin = session.role === 'SUPER_ADMIN' || (!!process.env.SUPER_ADMIN_EMAIL && session.email === process.env.SUPER_ADMIN_EMAIL);
  const isAdmin = session.role === 'ADMIN';

  if (!isSuperAdmin && !isAdmin) {
    redirect('/dashboard');
  }

  return <RbacManagementClient />;
}
