import type { Metadata } from 'next';
import { RegisterClient } from '@/components/auth/RegisterClient';

export const metadata: Metadata = {
  title: 'Register Your Real Estate Firm | Lucky CRM',
  description: 'Self-service registration for real estate brokerages, channel partners, and advisory firms on Lucky CRM.',
};

export default function RegisterPage() {
  return <RegisterClient />;
}
