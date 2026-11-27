'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';
type Density = 'compact' | 'comfortable';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  density: Density;
  setDensity: (d: Density) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  density: 'compact',
  setDensity: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [density, setDensityState] = useState<Density>('compact');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme: Theme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');

    const savedDensity = localStorage.getItem('density') as Density | null;
    const initialDensity: Density = savedDensity === 'comfortable' ? 'comfortable' : 'compact';
    setDensityState(initialDensity);
    document.documentElement.setAttribute('data-density', initialDensity);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  const setDensity = (next: Density) => {
    setDensityState(next);
    localStorage.setItem('density', next);
    document.documentElement.setAttribute('data-density', next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, density, setDensity }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useDensity() {
  const { density, setDensity } = useContext(ThemeContext);
  return { density, setDensity };
}
