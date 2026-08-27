import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginClient } from '@/components/auth/LoginClient';

export const metadata: Metadata = {
  title: 'Sign In | ZamZam Properties CRM',
  description: 'Sign in to the ZamZam Properties Real Estate Brokerage Console.',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-sans text-sm text-content-muted">Loading authentication gateway...</div>}>
      <LoginClient />
    </Suspense>
  );
}
