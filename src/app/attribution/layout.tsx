import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Attribution',
  description: 'Review recorded lead sources and campaign attribution.',
};

export default function AttributionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
