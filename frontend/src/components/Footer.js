import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <p className="text-center">
          &copy; {new Date().getFullYear()} Sensitivity Calculator. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;