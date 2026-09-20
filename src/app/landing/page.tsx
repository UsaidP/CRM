import type { Metadata } from 'next';
import { LandingPageClient } from '@/components/landing/LandingPageClient';

export const metadata: Metadata = {
  title: 'Lucky CRM — The Real Estate Operating System for High-Velocity Brokerages',
  description: 'Dispatch inbound leads in < 5 minutes, track MahaRERA inventory freshness, share bespoke client portals with telemetry, and automate deal commission ledgers.',
};

export default function LandingPage() {
  return <LandingPageClient />;
}
