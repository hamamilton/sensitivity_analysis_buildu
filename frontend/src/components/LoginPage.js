import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import EmailCaptureForm from './EmailCaptureForm';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from?.pathname || '/';

  const handleEmailSubmit = (email) => {
    login(email);
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
              
              <EmailCaptureForm 
                onEmailSubmit={handleEmailSubmit}
                initialEmail=""
              />
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
                    <h6 className="text-info">Sensitivity Analysis</h6>
                    <p className="small text-muted">
                      Analyze adjustment credibility with XML file processing and detailed reports.
                    </p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <h6 className="text-info">GLA Calculator</h6>
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
    </Container>
  );
};

export default LoginPage;