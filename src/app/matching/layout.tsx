import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Matchmaker',
  description: 'Match buyer requirements to current property inventory.',
};

export default function MatchingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
