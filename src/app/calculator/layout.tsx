import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cost calculator',
  description: 'Calculate documented all-in property acquisition costs.',
};

export default function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
