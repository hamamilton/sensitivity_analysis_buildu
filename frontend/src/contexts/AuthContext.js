import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMethod, setAuthMethod] = useState(null); // 'manual', 'email_param', 'token'

  useEffect(() => {
    const loginWithToken = async (token) => {
      try {
        const response = await fetch('http://localhost:8080/api/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });
        
        const data = await response.json();
        
        if (data.success && data.user) {
          login(data.user.email, 'token');
        } else {
          console.error('Token validation failed:', data.error);
          // If token fails, redirect to manual login
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Token validation error:', error);
        // If token validation fails, redirect to manual login
        window.location.href = '/login';
      }
    };

    // Check for auto-login from URL parameters or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    const tokenParam = urlParams.get('token');
    
    if (emailParam) {
      // Auto-login with email from URL parameter (GoHighLevel)
      login(emailParam, 'email_param');
      // Clean URL by removing the parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (tokenParam) {
      // Auto-login with token (GoHighLevel with enhanced security)
      loginWithToken(tokenParam);
      // Clean URL by removing the parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else {
      // Check localStorage for existing session (both manual and auto-login users)
      const savedUser = localStorage.getItem('user');
      const savedAuthMethod = localStorage.getItem('authMethod');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setIsAuthenticated(true);
          setAuthMethod(savedAuthMethod || 'manual');
        } catch (error) {
          // Clear corrupted data
          localStorage.removeItem('user');
          localStorage.removeItem('authMethod');
        }
      }
    }
  }, []);

  const login = (email, method = 'manual') => {
    const userData = { email };
    setUser(userData);
    setIsAuthenticated(true);
    setAuthMethod(method);
    // Persist to localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('authMethod', method);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthMethod(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authMethod');
  };

  const value = {
    user,
    isAuthenticated,
    authMethod,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};