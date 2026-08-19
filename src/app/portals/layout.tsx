import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client portals',
  description: 'Create and monitor private property selections shared with clients.',
};

export default function PortalsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
