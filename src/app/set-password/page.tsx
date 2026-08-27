import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SetPasswordClient } from '@/components/auth/SetPasswordClient';

export const metadata: Metadata = {
  title: 'Activate Account | ZamZam Properties CRM',
  description: 'Set your password and activate your account on the ZamZam Properties Brokerage Console.',
};

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-sans text-sm text-content-muted">Loading account activation...</div>}>
      <SetPasswordClient />
    </Suspense>
  );
}
