'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';
export type Density = 'compact' | 'comfortable';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  density: Density;
  setDensity: (d: Density) => void;
  toggleDensity: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
  density: 'compact',
  setDensity: () => {},
  toggleDensity: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [density, setDensityState] = useState<Density>('compact');

  const applyTheme = (next: Theme) => {
    setThemeState(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const applyDensity = (next: Density) => {
    setDensityState(next);
    document.documentElement.setAttribute('data-density', next);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    const savedDensity = localStorage.getItem('antigravity_density') as Density | null;
    applyDensity(savedDensity === 'comfortable' ? 'comfortable' : 'compact');
  }, []);

  const setTheme = (next: Theme) => {
    localStorage.setItem('theme', next);
    applyTheme(next);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const setDensity = (next: Density) => {
    localStorage.setItem('antigravity_density', next);
    applyDensity(next);
  };

  const toggleDensity = () => {
    setDensity(density === 'compact' ? 'comfortable' : 'compact');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, density, setDensity, toggleDensity }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useDensity() {
  const { density, setDensity, toggleDensity } = useContext(ThemeContext);
  return { density, setDensity, toggleDensity };
}
