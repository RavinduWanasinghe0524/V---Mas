import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'blue', toggleTheme: () => { } });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const getInitialTheme = () => {
    const stored = localStorage.getItem('vmas-theme');
    if (stored === 'light' || stored === 'blue') return stored;
    // Default to 'blue' (existing dark look) unless OS is explicitly light
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'blue';
  };

  const [theme, setThemeState] = useState(getInitialTheme);

  // Apply theme to <html> data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vmas-theme', theme);
  }, [theme]);

  // Listen for OS preference changes (only if no stored preference)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e) => {
      if (!localStorage.getItem('vmas-theme')) {
        setThemeState(e.matches ? 'light' : 'blue');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'blue' ? 'light' : 'blue'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useD() — drop-in replacement for the hardcoded `const D = {...}` dark palette.
 * Returns theme-aware color tokens so every page auto-responds to theme changes.
 */
export const useD = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'blue';

  return {
    // Backgrounds
    bg: isDark ? '#0d1117' : 'var(--bg-body)',
    surface: isDark ? '#161b27' : '#ffffff',
    surfaceHi: isDark ? '#1e2535' : '#f8faff',

    // Borders
    border: isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0',
    borderHi: isDark ? 'rgba(255,255,255,0.13)' : '#bfdbfe',

    // Text
    text: isDark ? '#e2e8f0' : '#111827',
    textSub: isDark ? '#64748b' : '#6b7280',
    textFaint: isDark ? '#374151' : '#9ca3af',

    // Accent colours (same saturation, lighter in dark)
    purple: isDark ? '#a78bfa' : '#7c3aed',
    purpleDim: isDark ? 'rgba(167,139,250,0.15)' : 'rgba(124,58,237,0.1)',
    indigo: isDark ? '#818cf8' : '#4f46e5',
    indigoDim: isDark ? 'rgba(129,140,248,0.15)' : 'rgba(79,70,229,0.1)',
    blue: isDark ? '#60a5fa' : '#2563eb',
    blueDim: isDark ? 'rgba(96,165,250,0.15)' : 'rgba(37,99,235,0.1)',
    green: isDark ? '#4ade80' : '#16a34a',
    greenDim: isDark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.1)',
    red: isDark ? '#f87171' : '#dc2626',
    redDim: isDark ? 'rgba(248,113,113,0.15)' : 'rgba(220,38,38,0.1)',
    orange: isDark ? '#f97316' : '#ea580c',
    orangeDim: isDark ? 'rgba(249,115,22,0.15)' : 'rgba(234,88,12,0.1)',
    gold: isDark ? '#fbbf24' : '#d97706',
    goldDim: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(217,119,6,0.1)',
    teal: isDark ? '#2dd4bf' : '#0d9488',
    tealDim: isDark ? 'rgba(45,212,191,0.15)' : 'rgba(13,148,136,0.1)',

    // Derived helpers
    inputBg: isDark ? 'rgba(255,255,255,0.05)' : '#f0f7ff',
    inputBorder: isDark ? 'rgba(255,255,255,0.1)' : '#bfdbfe',
    modalBg: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(15,23,42,0.5)',
  };
};
