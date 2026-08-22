'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun, Zap, Laptop } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  variant?: 'sidebar' | 'compact';
  className?: string;
}

export function ThemeToggle({ variant = 'sidebar', className = '' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Avoid hydration mismatch by rendering placeholder structure
    return variant === 'compact' ? (
      <button 
        type="button" 
        className={`w-8 h-8 rounded-lg border border-border bg-surface-raised flex items-center justify-center text-content-muted ${className}`}
        aria-label="Toggle theme"
        disabled
      >
        <Moon className="w-4 h-4" />
      </button>
    ) : (
      <div className={`cobalt-indicator flex items-center justify-between gap-1 text-[11px] font-semibold w-full ${className}`}>
        <div className="flex items-center gap-1.5 truncate">
          <Zap className="w-3 h-3 text-accent shrink-0 fill-accent/20" />
          <span className="text-accent-text font-mono text-[10px] tracking-wide uppercase">Cobalt Design System</span>
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border-default bg-surface hover:bg-surface-subtle text-content-secondary hover:text-content transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-accent transition-transform duration-200 hover:-rotate-12" />
        )}
      </button>
    );
  }

  return (
    <div className={`p-1.5 rounded-lg border border-border-default bg-surface-subtle shadow-sm flex items-center justify-between gap-2 w-full text-[11px] ${className}`}>
      <div className="flex items-center gap-1.5 min-w-0 pl-1">
        <Zap className="w-3.5 h-3.5 text-accent shrink-0 fill-accent/20" />
        <div className="truncate flex flex-col">
          <span className="text-content font-bold font-mono text-[10px] tracking-wide uppercase leading-tight">
            Cobalt Design
          </span>
          <span className="text-[9px] text-content-muted font-mono capitalize">
            {theme === 'system' ? 'System Theme' : isDark ? 'Dark Workbench' : 'Light Studio'}
          </span>
        </div>
      </div>

      {/* Segmented Quick Switcher */}
      <div className="flex items-center p-0.5 rounded-md bg-surface-inset border border-border-subtle shrink-0">
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`p-1 rounded transition-all flex items-center justify-center ${
            !isDark && theme !== 'system'
              ? 'bg-surface text-accent shadow-xs font-bold'
              : 'text-content-muted hover:text-content'
          }`}
          aria-label="Light mode"
          title="Switch to Light Studio"
        >
          <Sun className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`p-1 rounded transition-all flex items-center justify-center ${
            isDark && theme !== 'system'
              ? 'bg-surface text-accent shadow-xs font-bold'
              : 'text-content-muted hover:text-content'
          }`}
          aria-label="Dark mode"
          title="Switch to Dark Workbench"
        >
          <Moon className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`p-1 rounded transition-all flex items-center justify-center ${
            theme === 'system'
              ? 'bg-surface text-accent shadow-xs font-bold'
              : 'text-content-muted hover:text-content'
          }`}
          aria-label="System mode"
          title="Follow System Theme"
        >
          <Laptop className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
