import React, { useState } from 'react';
import EmailCaptureForm from './components/EmailCaptureForm';
import SensitivityCalculator from './components/SensitivityCalculator';
import FileUploadForm from './components/FileUploadForm';

function App() {
  const [step, setStep] = useState('email');
  const [userEmail, setUserEmail] = useState('demo@windsurf.ai');
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleEmailSubmit = (email) => {
    setUserEmail(email);
    setStep('fileUpload');
  };

  const handleFileUpload = (file) => {
    setUploadedFile(file);
    setStep('calculator');
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 'email':
        return (
          <EmailCaptureForm 
            onEmailSubmit={handleEmailSubmit} 
            initialEmail="demo@windsurf.ai"
          />
        );
      case 'fileUpload':
        return (
          <FileUploadForm 
            userEmail={userEmail} 
            onFileUpload={handleFileUpload} 
          />
        );
      case 'calculator':
        return (
          <SensitivityCalculator 
            userEmail={userEmail} 
            initialFile={uploadedFile}
          />
        );
      default:
        return (
          <EmailCaptureForm 
            onEmailSubmit={handleEmailSubmit} 
            initialEmail="demo@windsurf.ai"
          />
        );
    }
  };

  return (
    <div className="App">
      {renderCurrentStep()}
    </div>
  );
}

export default App;