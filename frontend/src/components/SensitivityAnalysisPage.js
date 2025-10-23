import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SensitivityCalculator from './SensitivityCalculator';
import FileUploadForm from './FileUploadForm';
import { Container } from 'react-bootstrap';

const SensitivityAnalysisPage = () => {
  const [step, setStep] = useState('fileUpload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const { user } = useAuth();

  const handleFileUpload = (file) => {
    setUploadedFile(file);
    setStep('calculator');
  };

  const handleReset = () => {
    setUploadedFile(null);
    setStep('fileUpload');
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 'fileUpload':
        return (
          <FileUploadForm 
            userEmail={user?.email} 
            onFileUpload={handleFileUpload} 
          />
        );
      case 'calculator':
        return (
          <SensitivityCalculator 
            userEmail={user?.email} 
            initialFile={uploadedFile}
            onReset={handleReset}
          />
        );
      default:
        return (
          <FileUploadForm 
            userEmail={user?.email} 
            onFileUpload={handleFileUpload} 
          />
        );
    }
  };

  return (
    <Container className="mt-4">
      <div className="text-center mb-4">
        <h1 className="text-buildu-primary"><strong>BuildU</strong> Sensitivity Analysis</h1>
        <p className="text-buildu-secondary">Property Valuation Analysis Tool</p>
      </div>
      {renderCurrentStep()}
    </Container>
  );
};

export default SensitivityAnalysisPage;