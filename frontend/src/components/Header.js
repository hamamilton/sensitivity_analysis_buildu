import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

// Add print styles
const printStyles = `
  @media print {
    .no-print {
      display: none !important;
    }
    header {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .container-fluid {
      margin: 0 !important;
      padding: 0 !important;
    }
    .card {
      break-inside: avoid;
      margin-bottom: 20px !important;
    }
  }
`;

const Header = ({ onReset, onPrint, showButtons = false }) => {
  return (
    <>
      <style>{printStyles}</style>
      <header className="bg-light text-dark py-3 mb-4 border-bottom">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-6">
            <div className="d-flex align-items-center">
              <img 
                src="/logoHorizontal.png" 
                alt="Buildu Logo" 
                className="me-3"
                style={{ height: '40px' }}
              />
              <div>
                <h1 className="h3 mb-0 fw-bold text-primary"><span style={{ display: 'none' }}>BuildU</span>Sensitivity Analysis</h1>
              </div>
            </div>
          </div>
          <div className="col-md-6 text-md-end">
            <nav className="navbar-nav flex-row justify-content-end align-items-center">
              {showButtons && (
                <div className="me-3 no-print">
                  <button 
                    className="btn btn-primary btn-sm me-2"
                    onClick={onReset}
                    title="Reset Calculator"
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Reset
                  </button>
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={onPrint}
                    title="Print Results"
                  >
                    <i className="bi bi-printer me-1"></i>
                    Print
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
    </>
  );
};

export default Header;
