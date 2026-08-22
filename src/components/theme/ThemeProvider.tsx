'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = 'zamzam-theme-mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState(false);

  // Helper to determine resolved theme based on mode & OS
  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const applyThemeToDOM = useCallback((resolved: ResolvedTheme) => {
    const root = document.documentElement;
    const isDark = resolved === 'dark';

    root.classList.remove('theme-gold-ink', 'theme-gold-paper', 'theme-dark-ink', 'theme-monochrome', 'light', 'dark');
    root.classList.add('theme-cobalt', isDark ? 'dark' : 'light');
    root.setAttribute('data-theme', resolved);
    root.style.colorScheme = resolved;

    if (document.body) {
      document.body.classList.remove('theme-gold-ink', 'theme-monochrome', 'light', 'dark');
      document.body.classList.add('theme-cobalt', isDark ? 'dark' : 'light');
      document.body.setAttribute('data-theme', resolved);
    }
  }, []);

  // Initialize theme from storage or DOM
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      const initialMode: ThemeMode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark';
      
      setThemeState(initialMode);
      const resolved = initialMode === 'system' ? getSystemTheme() : initialMode;
      setResolvedTheme(resolved);
      applyThemeToDOM(resolved);
    } catch {
      applyThemeToDOM('dark');
    }
    setMounted(true);
  }, [applyThemeToDOM]);

  // Handle system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') {
        const resolved = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(resolved);
        applyThemeToDOM(resolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyThemeToDOM]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {}

    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved);
  }, [applyThemeToDOM]);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      <div 
        className={`theme-root cobalt ${resolvedTheme} font-sans`} 
        data-theme={resolvedTheme}
        suppressHydrationWarning
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
