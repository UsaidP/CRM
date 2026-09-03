'use client';

import dynamic from 'next/dynamic';

const Agentation = dynamic(
  () => import('agentation').then((mod) => mod.Agentation),
  { ssr: false }
);

export function AgentationToolbar() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <Agentation endpoint="http://localhost:4747" className="!bottom-20 sm:!bottom-4" />;
}
