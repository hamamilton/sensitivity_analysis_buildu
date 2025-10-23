import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import EmailCaptureForm from './EmailCaptureForm';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showTokenError, setShowTokenError] = useState(false);

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    // Check if user came from a failed token/email parameter
    const urlParams = new URLSearchParams(window.location.search);
    const hadToken = urlParams.get('token');
    const hadEmail = urlParams.get('email');
    
    if (hadToken || hadEmail) {
      setShowTokenError(true);
      // Clean the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  const handleEmailSubmit = (email) => {
    login(email, 'manual');
    navigate(from, { replace: true });
  };

  const handleGuestAccess = () => {
    login('guest@buildu.app', 'guest');
    navigate(from, { replace: true });
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="border-info">
            <Card.Header className="bg-info text-white text-center">
              <h2>Access Property Analysis Tools</h2>
            </Card.Header>
            <Card.Body>
              {showTokenError && (
                <Alert variant="warning" className="mb-3">
                  <strong>Authentication Link Expired or Invalid</strong>
                  <br />
                  Please enter your email address below to access the tools.
                </Alert>
              )}
              
              <div className="mb-3">
                <p className="text-muted small text-center">
                  {showTokenError 
                    ? "Don't worry! Just enter your email below to continue."
                    : "Enter your email address to access the property analysis tools."
                  }
                </p>
              </div>
              
              <EmailCaptureForm 
                onEmailSubmit={handleEmailSubmit}
                initialEmail=""
              />
              
              <div className="text-center mt-3">
                <div className="d-flex align-items-center my-3">
                  <hr className="flex-grow-1" />
                  <span className="mx-3 text-muted small">OR</span>
                  <hr className="flex-grow-1" />
                </div>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleGuestAccess}
                >
                  Continue as Guest
                </button>
                <p className="small text-muted mt-2">
                  No email required, but your work won't be saved
                </p>
              </div>
              
              <div className="mt-3 text-center">
                <p className="small text-muted">
                  <strong>🔒 Your email is safe:</strong> We only use it to personalize your experience and don't send marketing emails.
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="justify-content-center mt-4">
        <Col md={8} lg={6}>
          <Card className="border-light">
            <Card.Body className="text-center">
              <h5>Available Tools</h5>
              <Row>
                <Col md={6}>
                  <div className="mb-3">
                    <h6 className="text-info">📊 Sensitivity Analysis</h6>
                    <p className="small text-muted">
                      Analyze adjustment credibility with XML file processing and detailed reports.
                    </p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <h6 className="text-info">📏 GLA Calculator</h6>
                    <p className="small text-muted">
                      Calculate GLA adjustments using the Ratterman method with file import support.
                    </p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Additional Information for Non-GHL Users */}
      <Row className="justify-content-center mt-4">
        <Col md={8} lg={6}>
          <Card className="border-success">
            <Card.Body className="text-center">
              <h6 className="text-success">✨ For Real Estate Professionals</h6>
              <p className="small text-muted mb-0">
                These tools are designed for appraisers, real estate agents, and property analysts. 
                No account required - just enter your email and start analyzing!
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LoginPage;