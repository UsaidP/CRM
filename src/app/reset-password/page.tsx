import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordClient } from '@/components/auth/ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Reset Password | ZamZam Properties CRM',
  description: 'Set a new password for the ZamZam Properties Real Estate Brokerage Console.',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-sans text-sm text-content-muted">Loading reset portal...</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
