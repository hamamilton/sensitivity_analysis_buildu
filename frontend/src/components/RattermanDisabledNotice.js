import React from 'react';
import { Container, Card, Alert, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const RattermanDisabledNotice = () => {
  const navigate = useNavigate();

  return (
    <Container className="mt-4">
      <Card className="border-warning">
        <Card.Header className="bg-warning text-dark">
          <h3 className="mb-0">🚧 Feature Under Development</h3>
        </Card.Header>
        <Card.Body>
          <Alert variant="warning">
            <strong>Full Ratterman Analysis is temporarily unavailable</strong>
          </Alert>
          
          <p>
            We're currently refining the Full Ratterman Analysis feature to ensure it provides 
            the most accurate and reliable results for professional appraisal work.
          </p>
          
          <h5>Available Alternatives:</h5>
          <ul className="mb-4">
            <li><strong>GLA Calculator</strong> - Calculate GLA adjustments using proven Ratterman methodology</li>
            <li><strong>Sensitivity Analysis</strong> - Analyze XML appraisal reports for pre/post adjustment ranges</li>
          </ul>
          
          <div className="d-flex gap-3">
            <Button 
              variant="primary" 
              size="lg"
              onClick={() => navigate('/gla-calculator')}
            >
              Use GLA Calculator
            </Button>
            <Button 
              variant="outline-secondary" 
              size="lg"
              onClick={() => navigate('/sensitivity-analysis')}
            >
              Try Sensitivity Analysis
            </Button>
            <Button 
              variant="outline-info" 
              size="lg"
              onClick={() => navigate('/')}
            >
              Back to Home
            </Button>
          </div>
        </Card.Body>
      </Card>
      
      <Card className="mt-4 border-light">
        <Card.Body className="text-muted">
          <small>
            <strong>For Developers:</strong> To re-enable this feature, uncomment the route in App.js 
            and update the backend endpoint in application.py.
          </small>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default RattermanDisabledNotice;