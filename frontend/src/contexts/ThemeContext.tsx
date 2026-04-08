'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { lightTheme } from '@/styles/theme.light';
import { darkTheme } from '@/styles/theme.dark';
import type { Theme as ThemeType } from '@/styles/theme.types';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  theme: ThemeType;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [isMounted, setIsMounted] = useState(false);

  // Carregar tema do localStorage na montagem
  useEffect(() => {
    setIsMounted(true);
    const storedMode = localStorage.getItem('theme-mode') as ThemeMode | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initialMode = storedMode || (prefersDark ? 'dark' : 'light');
    setMode(initialMode);
    applyTheme(initialMode);
  }, []);

  const getThemeObject = (themeMode: ThemeMode): ThemeType => {
    return themeMode === 'dark' ? darkTheme : lightTheme;
  };

  const applyTheme = (newMode: ThemeMode) => {
    const htmlElement = document.documentElement;

    if (newMode === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }

    localStorage.setItem('theme-mode', newMode);
  };

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    applyTheme(newMode);
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    applyTheme(newMode);
  };

  // Evitar hydration mismatch
  if (!isMounted) {
    return <>{children}</>;
  }

  const themeObject = getThemeObject(mode);

  return (
    <ThemeContext.Provider value={{ mode, theme: themeObject, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};
