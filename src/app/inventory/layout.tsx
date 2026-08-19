import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inventory',
  description: 'Maintain current property, pricing, availability, and verification records.',
};

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
