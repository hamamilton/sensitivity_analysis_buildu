import React, { useState } from 'react';
import '../styles/EmailCapture.css'; // Import the CSS file

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
    // Apply the main container class
    <div className="email-capture-container">
      <h2>Access Calculator</h2>
      <p>Please enter your email to access the calculator.</p>
      {/* Apply a class to the form for more specific targeting if needed */}
      <form onSubmit={handleSubmit} className="email-capture-form">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          // Inline styles for input width can be kept or moved to CSS
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default EmailCapture;