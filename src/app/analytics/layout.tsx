import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Inspect recorded pipeline, channel, and return-on-investment data.',
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
