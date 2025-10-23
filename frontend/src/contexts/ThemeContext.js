import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Theme options: 'light', 'dark', 'system'
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('buildu-theme-mode') || 'system';
  });

  // Actual theme being applied: 'light' or 'dark'
  const [currentTheme, setCurrentTheme] = useState('light');

  // Detect system preference
  const getSystemTheme = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Apply theme to document
  const applyTheme = (theme) => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }
    
    setCurrentTheme(theme);
  };

  // Update theme based on mode
  useEffect(() => {
    let effectiveTheme;
    
    if (themeMode === 'system') {
      effectiveTheme = getSystemTheme();
    } else {
      effectiveTheme = themeMode;
    }
    
    applyTheme(effectiveTheme);
    
    // Listen for system theme changes when in system mode
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [themeMode]);

  // Save theme mode to localStorage
  const setTheme = (mode) => {
    setThemeMode(mode);
    localStorage.setItem('buildu-theme-mode', mode);
  };

  const value = {
    themeMode,
    currentTheme,
    setTheme,
    isDark: currentTheme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;