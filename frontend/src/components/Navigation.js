import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <Navbar bg="info" variant="dark" expand="lg" className="mb-4">
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand className="d-flex align-items-center">
            <img
              src="/logoHorizontal.png"
              height="40"
              alt="BuildU Logo"
              className="me-3"
            />
            <span className="fs-5">Property Analysis Tools</span>
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
            </Nav>
          )}
          <Nav className="ms-auto">
            {isAuthenticated ? (
              <>
                <Nav.Item className="d-flex align-items-center me-3">
                  <small className="text-light">Welcome, {user?.email}</small>
                </Nav.Item>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>
                  Logout
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