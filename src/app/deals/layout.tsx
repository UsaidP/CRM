import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deals',
  description: 'Move transactions through the brokerage closing and commission ledger.',
};

export default function DealsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
