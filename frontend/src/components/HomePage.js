import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return (
      <Container className="mt-5">
        <div className="text-center mb-5">
          <h1 className="display-4">Property Analysis Tools</h1>
          <p className="lead text-muted">
            Professional tools for property appraisers and real estate professionals
          </p>
          <Button 
            variant="info" 
            size="lg" 
            onClick={() => navigate('/login')}
            className="mt-3"
          >
            Get Started - Access Tools
          </Button>
        </div>

        <Row className="justify-content-center">
          <Col md={10}>
            <Card className="border-info">
              <Card.Header className="bg-info text-white text-center">
                <h3>Professional Property Analysis Suite</h3>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6} className="mb-4">
                    <div className="text-center">
                      <h4 className="text-info">Adjustment Sensitivity Analysis</h4>
                      <p>
                        Analyze how adjustments affect comparable property values to determine 
                        if your adjustments are credible and reflective of the market.
                      </p>
                      <ul className="list-unstyled">
                        <li>✓ XML file processing</li>
                        <li>✓ Pre/post adjustment analysis</li>
                        <li>✓ Interactive charts and graphs</li>
                        <li>✓ Market credibility assessment</li>
                      </ul>
                    </div>
                  </Col>
                  <Col md={6} className="mb-4">
                    <div className="text-center">
                      <h4 className="text-info">GLA Adjustment Calculator</h4>
                      <p>
                        Calculate Gross Living Area (GLA) adjustments using the Ratterman 
                        method with support for file imports and manual entry.
                      </p>
                      <ul className="list-unstyled">
                        <li>✓ Ratterman method calculations</li>
                        <li>✓ CSV/Excel file import</li>
                        <li>✓ Manual data entry</li>
                        <li>✓ Detailed adjustment reports</li>
                      </ul>
                    </div>
                  </Col>
                </Row>
                <div className="text-center">
                  <Button 
                    variant="info" 
                    size="lg" 
                    onClick={() => navigate('/login')}
                  >
                    Access Professional Tools
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mt-4">
          <Col className="text-center">
            <Card className="border-light">
              <Card.Body>
                <h5>For Licensed Professionals</h5>
                <p className="text-muted">
                  These tools are designed for licensed appraisers and real estate professionals 
                  to assist with property valuation analysis. All calculations should be reviewed 
                  and validated by qualified professionals.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="mt-5">
      <div className="text-center mb-5">
        <h2 className="mb-3">Welcome back, {user?.email}!</h2>
        <p className="lead text-muted">
          Choose a tool to get started with your property analysis
        </p>
      </div>

      <Row className="justify-content-center">
        <Col md={6} className="mb-4">
          <Card className="h-100 border-info">
            <Card.Header className="bg-info text-white text-center">
              <h3>Adjustment Sensitivity Analysis</h3>
            </Card.Header>
            <Card.Body className="d-flex flex-column">
              <Card.Text>
                Analyze how adjustments affect comparable property values to determine 
                if your adjustments are credible and reflective of the market. Upload 
                XML files and get detailed sensitivity analysis reports.
              </Card.Text>
              <div className="mt-auto">
                <ul className="list-unstyled mb-3">
                  <li>✓ XML file processing</li>
                  <li>✓ Pre/post adjustment analysis</li>
                  <li>✓ Interactive charts and graphs</li>
                  <li>✓ Market credibility assessment</li>
                </ul>
                <Button 
                  variant="info" 
                  size="lg" 
                  className="w-100"
                  onClick={() => navigate('/sensitivity-analysis')}
                >
                  Start Sensitivity Analysis
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} className="mb-4">
          <Card className="h-100 border-info">
            <Card.Header className="bg-info text-white text-center">
              <h3>GLA Adjustment Calculator</h3>
            </Card.Header>
            <Card.Body className="d-flex flex-column">
              <Card.Text>
                Calculate Gross Living Area (GLA) adjustments using the Ratterman 
                method. Import data from CSV/Excel files or enter manually to get 
                precise adjustment calculations.
              </Card.Text>
              <div className="mt-auto">
                <ul className="list-unstyled mb-3">
                  <li>✓ Ratterman method calculations</li>
                  <li>✓ CSV/Excel file import</li>
                  <li>✓ Manual data entry</li>
                  <li>✓ Detailed adjustment reports</li>
                </ul>
                <Button 
                  variant="info" 
                  size="lg" 
                  className="w-100"
                  onClick={() => navigate('/gla-calculator')}
                >
                  Start GLA Calculator
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-5">
        <Col className="text-center">
          <Card className="border-light">
            <Card.Body>
              <h4>Professional Property Analysis</h4>
              <p className="text-muted">
                These tools are designed for licensed appraisers and real estate professionals 
                to assist with property valuation analysis. All calculations should be reviewed 
                and validated by qualified professionals.
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default HomePage;