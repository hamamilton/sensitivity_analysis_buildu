import React, { useState } from 'react';
import axios from 'axios';

function SensitivityCalculator() {
  const [xmlFile, setXmlFile] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    setXmlFile(event.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!xmlFile) {
      setError('Please select an XML file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', xmlFile);

    try {
      const response = await axios.post('/api/calculate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResults(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred.');
      setResults(null);
    }
  };

  return (
    <div>
      <input type="file" accept=".xml" onChange={handleFileChange} />
      <button onClick={handleSubmit}>Calculate Sensitivity</button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {results && (
        <div>
          <p>Pre-Adjustment Range: {results.pre_adj_range}</p>
          <p>Post-Adjustment Range: {results.post_adj_range}</p>
          <p>Sensitivity: {results.sensitivity}%</p>
        </div>
      )}
    </div>
  );
}

export default SensitivityCalculator;