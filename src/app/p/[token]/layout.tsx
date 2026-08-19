import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    absolute: 'Private property selection | ZamZam Properties',
  },
  description: 'A private property selection shared by your ZamZam Properties advisor.',
};

export default function PublicPortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
