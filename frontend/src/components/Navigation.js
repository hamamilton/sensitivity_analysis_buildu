import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';

const Navigation = () => {
  const { isAuthenticated, user, authMethod, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <Navbar bg="primary" variant="dark" expand="lg" className="mb-4">
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand className="d-flex align-items-center">
                      <img 
            src="/buildu_logo_reversed.png" 
            alt="BuildU Logo" 
            className="w-60 h-auto me-4" 
            style={{ width: '240px', height: '70px' }}
          />
            <span className="fs-5"><strong>BuildU</strong> Property Analysis</span>
          </Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          {isAuthenticated && (
            <Nav className="me-auto">
              <LinkContainer to="/sensitivity-analysis">
                <Nav.Link>Sensitivity Analysis</Nav.Link>
              </LinkContainer>
              <LinkContainer to="/gla-calculator">
                <Nav.Link>GLA Calculator</Nav.Link>
              </LinkContainer>
              {/* Full Ratterman - Hidden from production */}
              {/*
              <LinkContainer to="/ratterman-full">
                <Nav.Link>Full Ratterman</Nav.Link>
              </LinkContainer>
              */}
            </Nav>
          )}
          <Nav className="ms-auto">
            <Nav.Item className="me-3">
              <ThemeToggle />
            </Nav.Item>
            {isAuthenticated ? (
              <>
                <Nav.Item className="d-flex align-items-center me-3">
                  <small className="text-light">
                    {user?.email === 'guest@buildu.app' ? (
                      <>
                        Guest User
                        <span className="ms-1" title="Guest access">👤</span>
                      </>
                    ) : (
                      <>
                        Welcome, {user?.email}
                        {authMethod === 'manual' && (
                          <span className="ms-1" title="Direct access">👤</span>
                        )}
                        {(authMethod === 'email_param' || authMethod === 'token') && (
                          <span className="ms-1" title="GoHighLevel access">🔗</span>
                        )}
                      </>
                    )}
                  </small>
                </Nav.Item>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>
                  {user?.email === 'guest@buildu.app' ? 'Exit' : 'Logout'}
                </Button>
              </>
            ) : (
              <LinkContainer to="/login">
                <Nav.Link>Login</Nav.Link>
              </LinkContainer>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;