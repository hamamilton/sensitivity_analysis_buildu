import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './buildu-theme.css';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navigation from './components/Navigation';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import SensitivityAnalysisPage from './components/SensitivityAnalysisPage';
import GLACalculator from './components/GLACalculator';
import RattermanDisabledNotice from './components/RattermanDisabledNotice';
// import RattermanFullAnalysis from './components/RattermanFullAnalysis'; // Hidden from production

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App">
            <Navigation />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/sensitivity-analysis" 
              element={
                <ProtectedRoute>
                  <SensitivityAnalysisPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/gla-calculator" 
              element={
                <ProtectedRoute>
                  <GLACalculator />
                </ProtectedRoute>
              } 
            />
            {/* Ratterman Full Analysis - Show notice that it's disabled */}
            <Route 
              path="/ratterman-full" 
              element={
                <ProtectedRoute>
                  <RattermanDisabledNotice />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;