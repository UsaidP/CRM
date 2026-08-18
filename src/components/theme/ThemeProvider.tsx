'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'gold-ink' | 'monochrome';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'gold-ink',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('gold-ink');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('zamzam-theme') as ThemeMode;
    if (saved && (saved === 'gold-ink' || saved === 'monochrome')) {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('zamzam-theme', theme);
    const root = document.documentElement;
    root.classList.remove('theme-gold-ink', 'theme-gold-paper', 'theme-dark-ink', 'theme-monochrome');
    root.classList.add(`theme-${theme}`);
    root.classList.add('dark');
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`theme-root ${theme}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
