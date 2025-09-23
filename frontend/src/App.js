import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation';
import HomePage from './components/HomePage';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import SensitivityAnalysisPage from './components/SensitivityAnalysisPage';
import GLACalculator from './components/GLACalculator';

function App() {
  return (
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;