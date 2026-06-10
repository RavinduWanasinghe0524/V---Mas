import React, { useEffect, useState } from 'react';
import { ThemeContext } from './ThemeContext';

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
