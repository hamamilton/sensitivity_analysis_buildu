import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import SensitivityCalculator from './SensitivityCalculator';
import FileUploadForm from './FileUploadForm';

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

  const handlePrint = () => {
    window.print();
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
    <div>
      <Header 
        onReset={handleReset}
        onPrint={handlePrint}
        showButtons={step === 'calculator'}
      />
      {renderCurrentStep()}
    </div>
  );
};

export default SensitivityAnalysisPage;