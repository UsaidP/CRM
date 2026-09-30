import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordClient } from '@/components/auth/ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Set a new password for the brokerage console.',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-sans text-sm text-content-muted">Loading reset portal...</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
