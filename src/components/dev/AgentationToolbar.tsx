'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Agentation = dynamic(
  () => import('agentation').then((mod) => mod.Agentation),
  { ssr: false }
);

export function AgentationToolbar() {
  const [mounted, setMounted] = useState(false);
  const [endpoint, setEndpoint] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (process.env.NEXT_PUBLIC_ENABLE_AGENTATION === 'false') return;

    setMounted(true);

    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const targetEndpoint =
      process.env.NEXT_PUBLIC_AGENTATION_ENDPOINT ||
      (host === '127.0.0.1' ? 'http://127.0.0.1:4747' : `http://${host}:4747`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    fetch(`${targetEndpoint}/health`, {
      signal: controller.signal,
      mode: 'cors',
    })
      .then((res) => {
        if (res.ok) {
          setEndpoint(targetEndpoint);
        }
      })
      .catch(() => {
        // Agentation MCP server is offline; safely operate in local storage mode without network spam
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  if (process.env.NODE_ENV !== 'development' || !mounted || process.env.NEXT_PUBLIC_ENABLE_AGENTATION === 'false') {
    return null;
  }

  return (
    <Agentation
      key={endpoint || 'offline'}
      endpoint={endpoint}
      className="!bottom-20 sm:!bottom-4"
    />
  );
}
