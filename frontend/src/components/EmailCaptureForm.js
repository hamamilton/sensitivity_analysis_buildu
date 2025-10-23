import React, { useState } from 'react';

const EmailCaptureForm = ({ onEmailSubmit, initialEmail = 'demo@windsurf.ai' }) => {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) {
      setError('');
      onEmailSubmit(email); // Pass email to parent and proceed
    } else {
      setError('Please enter a valid email address (e.g., name@example.com).');
    }
  };

  const handleReset = () => {
    setEmail(initialEmail);
    setError('');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      //height: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <img src="logo192.png" alt="Logo" width="100" height="100" style={{ marginBottom: '20px' }}/>
      <h2>Access the Property Analysis Tools</h2>
      <p>Please enter your email to continue:</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <input
          type="email"
          id="emailInput"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            padding: '10px',
            marginBottom: '10px',
            width: '250px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        {error && <p style={{ color: 'red', fontSize: '0.9em' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Continue
          </button>
          <button type="button" onClick={handleReset} style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmailCaptureForm;
