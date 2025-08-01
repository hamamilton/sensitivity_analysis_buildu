import React, { useState } from 'react';
import '../styles/EmailCapture.css'; // Will point to the new CSS file path

const EmailCapture = ({ onEmailSubmit }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      onEmailSubmit(email);
    } else {
      alert('Please enter a valid email address.');
    }
  };

  return (
    <div className="email-capture-container">
      <h2>Access Calculator</h2>
      <p>Please enter your email to access the calculator.</p>
      <form onSubmit={handleSubmit} className="email-capture-form">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default EmailCapture;