import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ForgotPasswordClient } from '@/components/auth/ForgotPasswordClient';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your password for the brokerage console.',
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-sans text-sm text-content-muted">Loading password recovery...</div>}>
      <ForgotPasswordClient />
    </Suspense>
  );
}
