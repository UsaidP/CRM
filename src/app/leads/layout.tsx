import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leads',
  description: 'Capture, qualify, assign, and follow up with real-estate leads.',
};

export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
