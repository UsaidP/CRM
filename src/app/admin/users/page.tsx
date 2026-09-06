import type { Metadata } from 'next';
import { RbacManagementClient } from '@/components/admin/RbacManagementClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Team & RBAC Authority | ZamZam CRM',
  description: 'Manage broker agent permissions, team assignments, and administrative access.',
};

export default function AdminUsersPage() {
  return <RbacManagementClient />;
}
