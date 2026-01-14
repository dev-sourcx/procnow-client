'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme by checking if dark class is already on document (from blocking script)
  // or by reading from localStorage synchronously if available
  const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'light';
    
    // First check if dark class is already applied (from blocking script)
    if (document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
    
    // Then try to read from localStorage
    try {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch {
      // Ignore localStorage errors
    }
    
    // Fallback to system preference
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    return 'light';
  };

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  // On mount, ensure theme is synced with what's already applied
  useEffect(() => {
    setMounted(true);
    const currentTheme = getInitialTheme();
    setTheme(currentTheme);
  }, []);

  // Apply theme classes & persist whenever theme changes (after mount)
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Ignore persistence errors
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Always render the provider so useTheme is safe on first render.
  // Hydration differences are limited to visual theme only.
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}



