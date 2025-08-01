import React, { useState, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const FileUploadForm = ({ userEmail, onFileUpload }) => {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    processFile(droppedFile);
  };

  const processFile = (selectedFile) => {
    if (selectedFile) {
      // Validate only XML files
      const allowedTypes = [
        'application/xml', 
        'text/xml'
      ];
      
      // Check file extension as a backup
      const isXmlExtension = selectedFile.name.toLowerCase().endsWith('.xml');
      
      if (allowedTypes.includes(selectedFile.type) || isXmlExtension) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please upload a valid XML file (.xml).');
        setFile(null);
      }
    }
  };

  const handleSubmit = () => {
    if (file) {
      onFileUpload(file);
    } else {
      setError('Please select a file to upload.');
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div 
            className={`card text-center p-4 ${dragging ? 'border-primary' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? '#007bff' : '#ced4da'}`,
              backgroundColor: dragging ? 'rgba(0,123,255,0.1)' : 'white'
            }}
          >
            <h3 className="mb-4">Upload Appraisal File</h3>
            <p className="text-muted">Drag and drop your XML file here</p>
            <p className="text-muted">or</p>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xml"
              style={{ display: 'none' }}
            />
            <button 
              className="btn btn-primary mx-auto"
              onClick={() => fileInputRef.current.click()}
            >
              Browse Files
            </button>

            {file && (
              <div className="mt-3">
                <strong>Selected File:</strong> {file.name}
              </div>
            )}

            {error && (
              <div className="alert alert-danger mt-3" role="alert">
                {error}
              </div>
            )}

            {file && (
              <button 
                className="btn btn-success mt-3"
                onClick={handleSubmit}
              >
                Continue to Analysis
              </button>
            )}
          </div>
          <div className="text-center mt-3">
            <small className="text-muted">Logged in as: {userEmail}</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadForm;
