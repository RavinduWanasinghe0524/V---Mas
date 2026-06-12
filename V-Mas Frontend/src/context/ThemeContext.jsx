import React, { createContext, useContext } from 'react';

export const ThemeContext = createContext({ theme: 'blue', toggleTheme: () => { } });

export const useTheme = () => useContext(ThemeContext);

/**
 * useD() — drop-in replacement for the hardcoded `const D = {...}` dark palette.
 * Returns theme-aware color tokens so every page auto-responds to theme changes.
 */
export const useD = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'blue';

  return {
    // Backgrounds
    bg: isDark ? '#080d1a' : '#f5f5fb',
    surface: isDark ? '#0e1529' : '#ffffff',
    surfaceHi: isDark ? '#111c36' : '#f8f8fd',

    // Borders
    border: isDark ? 'rgba(37, 99, 235,0.12)' : 'rgba(29, 78, 216,0.1)',
    borderHi: isDark ? 'rgba(37, 99, 235,0.25)' : 'rgba(29, 78, 216,0.25)',

    // Text
    text: isDark ? '#f0f2ff' : '#0f0f1a',
    textSub: isDark ? '#8892b4' : '#4b5563',
    textFaint: isDark ? '#4b5680' : '#9ca3af',

    // Accent colours
    purple: isDark ? '#3b82f6' : '#1d4ed8',
    purpleDim: isDark ? 'rgba(37, 99, 235,0.18)' : 'rgba(29, 78, 216,0.1)',
    indigo: isDark ? '#2563eb' : '#1e40af',
    indigoDim: isDark ? 'rgba(37, 99, 235,0.18)' : 'rgba(29, 78, 216,0.1)',
    blue: isDark ? '#38bdf8' : '#0284c7',
    blueDim: isDark ? 'rgba(56,189,248,0.15)' : 'rgba(2,132,199,0.1)',
    green: isDark ? '#34d399' : '#059669',
    greenDim: isDark ? 'rgba(52,211,153,0.15)' : 'rgba(5,150,105,0.1)',
    red: isDark ? '#f87171' : '#dc2626',
    redDim: isDark ? 'rgba(248,113,113,0.15)' : 'rgba(220,38,38,0.1)',
    orange: isDark ? '#fb923c' : '#ea580c',
    orangeDim: isDark ? 'rgba(251,146,60,0.15)' : 'rgba(234,88,12,0.1)',
    gold: isDark ? '#fbbf24' : '#d97706',
    goldDim: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(217,119,6,0.1)',
    teal: isDark ? '#2dd4bf' : '#0d9488',
    tealDim: isDark ? 'rgba(45,212,191,0.15)' : 'rgba(13,148,136,0.1)',

    // Derived helpers
    inputBg: isDark ? 'rgba(37, 99, 235,0.06)' : '#f8f8fd',
    inputBorder: isDark ? 'rgba(37, 99, 235,0.18)' : 'rgba(29, 78, 216,0.2)',
    modalBg: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(15,15,26,0.5)',
  };
};
