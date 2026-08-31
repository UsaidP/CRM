'use client';

import React from 'react';
import { GooeyToaster } from 'goey-toast';
import { useTheme } from '@/components/theme/ThemeProvider';

/**
 * GooeyToastProvider
 * 
 * Synchronizes goey-toast with the ZamZam Design System theme (Light Alabaster / Dark Obsidian).
 * Renders luxury organic spring-morphed toasts with high accessibility, countdown progress bars,
 * monospace timestamps, and swipe-to-dismiss support.
 */
export function GooeyToastProvider() {
  const { resolvedTheme } = useTheme();

  return (
    <GooeyToaster
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="bottom-right"
      offset="20px"
      gap={12}
      duration={4200}
      bounce={0.32}
      showTimestamp={true}
      showProgress={true}
      closeButton="top-right"
      closeOnEscape={true}
      swipeToDismiss={true}
    />
  );
}
