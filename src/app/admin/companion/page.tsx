import type { Metadata } from 'next';
import { CompanionSetupClient } from '@/components/admin/CompanionSetupClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Android Companion & SIM Sync',
  description: 'Physical SIM call recording, auto-sync, and Gemini Flash call intelligence settings.',
};

export default function AdminCompanionPage() {
  return <CompanionSetupClient />;
}
