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

  let role = 'NONE';
  try {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      role = parsed.role || 'NONE';
    }
  } catch (e) {}

  // Base role-specific configuration mapping
  const roleColors = {
    ADMIN: {
      primary: isDark ? '#a78bfa' : '#6d28d9',
      primaryDark: isDark ? '#7c3aed' : '#5b21b6',
      primaryLight: isDark ? '#c4b5fd' : '#7c3aed',
      dim: isDark ? 'rgba(124, 58, 237, 0.18)' : 'rgba(124, 58, 237, 0.1)',
      border: isDark ? 'rgba(124, 58, 237, 0.35)' : 'rgba(124, 58, 237, 0.25)',
      inputBg: isDark ? 'rgba(124, 58, 237, 0.06)' : '#f8f8fd',
      inputBorder: isDark ? 'rgba(124, 58, 237, 0.18)' : 'rgba(124, 58, 237, 0.2)',
    },
    CONTROLLER: {
      primary: isDark ? '#fbbf24' : '#b45309',
      primaryDark: isDark ? '#d97706' : '#92400e',
      primaryLight: isDark ? '#fde68a' : '#d97706',
      dim: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
      border: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.25)',
      inputBg: isDark ? 'rgba(245, 158, 11, 0.06)' : '#f8f8fd',
      inputBorder: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.2)',
    },
    DRIVER: {
      primary: isDark ? '#34d399' : '#047857',
      primaryDark: isDark ? '#10b981' : '#065f46',
      primaryLight: isDark ? '#a7f3d0' : '#10b981',
      dim: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
      border: isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.25)',
      inputBg: isDark ? 'rgba(16, 185, 129, 0.06)' : '#f8f8fd',
      inputBorder: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.2)',
    },
    NONE: {
      primary: isDark ? '#3b82f6' : '#1d4ed8',
      primaryDark: isDark ? '#2563eb' : '#1e40af',
      primaryLight: isDark ? '#38bdf8' : '#0284c7',
      dim: isDark ? 'rgba(37, 99, 235, 0.18)' : 'rgba(29, 78, 216, 0.1)',
      border: isDark ? 'rgba(37, 99, 235, 0.25)' : 'rgba(29, 78, 216, 0.25)',
      inputBg: isDark ? 'rgba(37, 99, 235, 0.06)' : '#f8f8fd',
      inputBorder: isDark ? 'rgba(37, 99, 235, 0.18)' : 'rgba(29, 78, 216, 0.2)',
    }
  };

  const activeColors = roleColors[role] || roleColors.NONE;

  return {
    // Backgrounds
    bg: isDark ? '#080d1a' : '#f5f5fb',
    surface: isDark ? '#0e1529' : '#ffffff',
    surfaceHi: isDark ? '#111c36' : '#f8f8fd',

    // Borders
    border: activeColors.border,
    borderHi: activeColors.border,

    // Text
    text: isDark ? '#f0f2ff' : '#0f0f1a',
    textSub: isDark ? '#8892b4' : '#4b5563',
    textFaint: isDark ? '#4b5680' : '#9ca3af',

    // Accent colours (dynamically role-aware)
    purple: activeColors.primary,
    purpleDim: activeColors.dim,
    indigo: activeColors.primaryDark,
    indigoDim: activeColors.dim,
    blue: activeColors.primaryLight,
    blueDim: activeColors.dim,
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

    // ── Role colours ──────────────────────────────────────────────────
    // Admin  = Royal Violet
    adminColor:  isDark ? '#a78bfa' : '#6d28d9',
    adminDim:    isDark ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.1)',
    adminBorder: isDark ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.25)',
    // Controller = Amber / Gold
    controllerColor:  isDark ? '#fbbf24' : '#b45309',
    controllerDim:    isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)',
    controllerBorder: isDark ? 'rgba(245,158,11,0.35)' : 'rgba(245,158,11,0.25)',
    // Driver = Emerald
    driverColor:  isDark ? '#34d399' : '#047857',
    driverDim:    isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
    driverBorder: isDark ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.25)',

    // Derived helpers
    inputBg: activeColors.inputBg,
    inputBorder: activeColors.inputBorder,
    modalBg: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(15,15,26,0.5)',
  };
};
