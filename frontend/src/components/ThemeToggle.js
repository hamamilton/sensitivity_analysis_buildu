import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { themeMode, setTheme, currentTheme } = useTheme();

  const getThemeIcon = () => {
    switch (currentTheme) {
      case 'dark':
        return '🌙';
      case 'light':
        return '☀️';
      default:
        return '☀️';
    }
  };

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return `System (${currentTheme})`;
      default:
        return 'System';
    }
  };

  return (
    <Dropdown align="end">
      <Dropdown.Toggle 
        variant="outline-light" 
        id="theme-dropdown"
        size="sm"
        style={{ 
          border: '1px solid rgba(255, 255, 255, 0.3)',
          background: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          fontWeight: '500'
        }}
        className="d-flex align-items-center"
      >
        <span className="me-2">{getThemeIcon()}</span>
        <span className="d-none d-lg-inline">{getThemeLabel()}</span>
      </Dropdown.Toggle>

      <Dropdown.Menu className="shadow">
        <Dropdown.Item 
          active={themeMode === 'light'}
          onClick={() => setTheme('light')}
          className="d-flex align-items-center"
        >
          <span className="me-2">☀️</span>
          <span>Light Mode</span>
        </Dropdown.Item>
        <Dropdown.Item 
          active={themeMode === 'dark'}
          onClick={() => setTheme('dark')}
          className="d-flex align-items-center"
        >
          <span className="me-2">🌙</span>
          <span>Dark Mode</span>
        </Dropdown.Item>
        <Dropdown.Item 
          active={themeMode === 'system'}
          onClick={() => setTheme('system')}
          className="d-flex align-items-center"
        >
          <span className="me-2">🖥️</span>
          <span>System Default</span>
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default ThemeToggle;