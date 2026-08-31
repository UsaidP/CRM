import type { Metadata } from 'next';
import { LoginClient } from '@/components/auth/LoginClient';

export const metadata: Metadata = {
  title: 'Sign In | ZamZam Properties CRM',
  description: 'Sign in to the ZamZam Properties Real Estate Brokerage Console.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect?: string; message?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const redirectUrl = params.redirect || '/';
  const initialMessage = params.message || null;

  return (
    <LoginClient
      initialRedirect={redirectUrl}
      initialMessage={initialMessage}
    />
  );
}
