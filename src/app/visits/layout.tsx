import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Site visits',
  description: 'Schedule tours, coordinate logistics, and record visit outcomes.',
};

export default function VisitsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
