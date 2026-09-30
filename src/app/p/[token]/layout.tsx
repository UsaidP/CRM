import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    absolute: 'Private property selection',
  },
  description: 'A private property selection shared by your advisor.',
};

export default function PublicPortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
