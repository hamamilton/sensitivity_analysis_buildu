import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FileImporter from './FileImporter';
import { Container, Card, Table, Button, Form, Alert, Row, Col } from 'react-bootstrap';

// Formatting utility functions
const formatCurrency = (amount, decimals = 0) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch (error) {
    return `$${parseFloat(amount).toLocaleString('en-US', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    })}`;
  }
};

const formatNumber = (number) => {
  try {
    return parseFloat(number).toLocaleString('en-US');
  } catch (error) {
    return number.toString();
  }
};

const GLACalculator = () => {
  const [subjectGLA, setSubjectGLA] = useState('');
  const [comparables, setComparables] = useState([
    { sale_price: '', gla: '', address: '' }
  ]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedMapping, setSavedMapping] = useState(null);
  const [editingField, setEditingField] = useState(null);

  // Get API URL from environment variable
  const API_URL = process.env.REACT_APP_GLA_API_URL || 'https://sensitivity-analysis-backend.onrender.com/api/calculate';

  // Load saved mapping from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('gla-tool-mapping');
    if (saved) {
      try {
        setSavedMapping(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading saved mapping:', e);
      }
    }
  }, []);

  // Helper function to get display value (formatted or raw based on editing state)
  const getDisplayValue = (value, field, index) => {
    const fieldKey = `${index}-${field}`;
    if (editingField === fieldKey) {
      return value; // Show raw value when editing
    }
    
    if (!value || value === '') return '';
    
    if (field === 'sale_price') {
      return formatCurrency(parseFloat(value) || 0);
    } else if (field === 'gla') {
      return formatNumber(parseFloat(value) || 0);
    }
    return value;
  };

  // Handle focus - switch to raw value for editing
  const handleFocus = (index, field) => {
    setEditingField(`${index}-${field}`);
  };

  // Handle blur - format the value for display
  const handleBlur = (index, field) => {
    setEditingField(null);
  };

  const handleDataImported = (importedData) => {
    setComparables(importedData);
    setResults(null); // Clear previous results
    setError('');
  };

  const handleMappingUpdate = (mapping) => {
    setSavedMapping(mapping);
    localStorage.setItem('gla-tool-mapping', JSON.stringify(mapping));
  };

  const handleChange = (idx, field, value) => {
    const updated = comparables.map((c, i) =>
      i === idx ? { ...c, [field]: value } : c
    );
    setComparables(updated);
  };

  const addRow = () => {
    setComparables([...comparables, { sale_price: '', gla: '', address: '' }]);
  };

  const removeRow = (idx) => {
    setComparables(comparables.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const payload = {
        subject_gla: parseFloat(subjectGLA),
        comparables: comparables.map(c => ({
          price: parseFloat(c.sale_price),
          gla: parseFloat(c.gla),
          address: c.address || 'N/A'
        }))
      };
      
      const response = await axios({
        method: 'post',
        url: API_URL,
        data: payload,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000  // Increased to 60 seconds for Render cold starts
      });
      
      setResults(response.data);
    } catch (err) {
      console.error('Calculation error:', err);
      if (err.response) {
        setError(`Server error: ${err.response.data.error || 'Unknown error'}`);
      } else if (err.request) {
        setError('No response from server. Please check your network connection.');
      } else {
        setError('Calculation failed. Please check your input.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-4">
      <div className="text-center mb-4">
        <h1>GLA Adjustment Tool</h1>
        <p className="text-muted">Ratterman Method Calculator for Property Appraisers</p>
      </div>
      
      {/* File Import Section */}
      <Card className="mb-4 border-info">
        <Card.Header className="bg-info text-white">
          <h3 className="mb-0">Import Data from File</h3>
        </Card.Header>
        <Card.Body>
          <FileImporter 
            onDataImported={handleDataImported}
            savedMapping={savedMapping}
            onMappingUpdate={handleMappingUpdate}
          />
        </Card.Body>
      </Card>
      
      {/* Manual Input Section */}
      <Card className="mb-4 border-info">
        <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
          <h3 className="mb-0">Manual Input</h3>
          <Button 
            variant="danger"
            size="sm"
            onClick={() => setComparables([{ sale_price: '', gla: '', address: '' }])}
          >
            Clear All Data
          </Button>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            {/* Subject Property GLA Input */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label><strong>Subject Property GLA (sq ft)</strong></Form.Label>
                  <Form.Control
                    type="text"
                    required
                    value={subjectGLA}
                    onChange={e => {
                      const rawValue = e.target.value.replace(/[,]/g, '');
                      setSubjectGLA(rawValue);
                    }}
                    placeholder="e.g., 2000"
                    title="Enter the subject property's GLA in square feet"
                  />
                  <Form.Text className="text-muted">
                    Enter the GLA of the property you want to analyze
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <h5 className="mb-3">Comparables</h5>
            <Table responsive bordered>
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Sale Price ($)</th>
                  <th>GLA (sq ft)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {comparables.map((c, idx) => (
                  <tr key={idx}>
                    <td>
                      <Form.Control
                        type="text"
                        value={c.address}
                        onChange={e => handleChange(idx, 'address', e.target.value)}
                        placeholder="Property address"
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="text"
                        required
                        value={getDisplayValue(c.sale_price, 'sale_price', idx)}
                        onChange={e => {
                          const rawValue = e.target.value.replace(/[$,]/g, '');
                          handleChange(idx, 'sale_price', rawValue);
                        }}
                        onFocus={() => handleFocus(idx, 'sale_price')}
                        onBlur={() => handleBlur(idx, 'sale_price')}
                        placeholder="e.g., 525000"
                        title="Enter sale price"
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="text"
                        required
                        value={getDisplayValue(c.gla, 'gla', idx)}
                        onChange={e => {
                          const rawValue = e.target.value.replace(/[,]/g, '');
                          handleChange(idx, 'gla', rawValue);
                        }}
                        onFocus={() => handleFocus(idx, 'gla')}
                        onBlur={() => handleBlur(idx, 'gla')}
                        placeholder="e.g., 2500"
                        title="Enter GLA in square feet"
                      />
                    </td>
                    <td>
                      {comparables.length > 1 && (
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => removeRow(idx)}
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            
            <div className="d-flex gap-2">
              <Button variant="secondary" type="button" onClick={addRow}>
                Add Comparable
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? 'Calculating...' : 'Calculate GLA Adjustments'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger">
          {error}
        </Alert>
      )}
      
      {results && (
        <Card className="mb-4 border-info">
          <Card.Header className="bg-info text-white">
            <h3 className="mb-0">Calculation Results</h3>
          </Card.Header>
          <Card.Body>
            {/* Summary Cards */}
            <Row className="mb-4">
              <Col md={4}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title>Subject Property GLA</Card.Title>
                    <h4 className="text-primary">{formatNumber(results.subject_gla)} sq ft</h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title>Number of Comparables</Card.Title>
                    <h4 className="text-info">{formatNumber(results.summary.number_of_comparables)}</h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={4}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title>Average Adjusted Price</Card.Title>
                    <h4 className="text-success">{formatCurrency(results.summary.average_adjusted_price)}</h4>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
            
            {/* Price Range Analysis Card */}
            <Card className="mb-4 border-secondary">
              <Card.Header className="bg-secondary text-white">
                <h5 className="mb-0">Price Range Analysis</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Card className="h-100">
                      <Card.Body className="text-center">
                        <Card.Title className="text-primary">Original Sale Prices</Card.Title>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-muted">Low:</span>
                          <strong>{formatCurrency(Math.min(...results.comparables_analysis.map(c => c.original_price)))}</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-muted">High:</span>
                          <strong>{formatCurrency(Math.max(...results.comparables_analysis.map(c => c.original_price)))}</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">Range:</span>
                          <strong className="text-info">
                            {formatCurrency(Math.max(...results.comparables_analysis.map(c => c.original_price)) - Math.min(...results.comparables_analysis.map(c => c.original_price)))}
                          </strong>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="h-100">
                      <Card.Body className="text-center">
                        <Card.Title className="text-success">GLA Adjusted Prices</Card.Title>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-muted">Low:</span>
                          <strong>{formatCurrency(Math.min(...results.comparables_analysis.map(c => c.adjusted_price)))}</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-muted">High:</span>
                          <strong>{formatCurrency(Math.max(...results.comparables_analysis.map(c => c.adjusted_price)))}</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-muted">Range:</span>
                          <strong className="text-success">
                            {formatCurrency(Math.max(...results.comparables_analysis.map(c => c.adjusted_price)) - Math.min(...results.comparables_analysis.map(c => c.adjusted_price)))}
                          </strong>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                <div className="text-center mt-3">
                  <small className="text-muted">
                    Range Reduction: {formatCurrency(
                      (Math.max(...results.comparables_analysis.map(c => c.original_price)) - Math.min(...results.comparables_analysis.map(c => c.original_price))) -
                      (Math.max(...results.comparables_analysis.map(c => c.adjusted_price)) - Math.min(...results.comparables_analysis.map(c => c.adjusted_price)))
                    )} 
                    ({(((Math.max(...results.comparables_analysis.map(c => c.original_price)) - Math.min(...results.comparables_analysis.map(c => c.original_price))) -
                      (Math.max(...results.comparables_analysis.map(c => c.adjusted_price)) - Math.min(...results.comparables_analysis.map(c => c.adjusted_price)))) /
                      (Math.max(...results.comparables_analysis.map(c => c.original_price)) - Math.min(...results.comparables_analysis.map(c => c.original_price))) * 100).toFixed(1)}% reduction)
                  </small>
                </div>
              </Card.Body>
            </Card>
            
            {/* Results Table */}
            <Table responsive bordered>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Address</th>
                  <th>Sale Price</th>
                  <th>GLA (sq ft)</th>
                  <th>Price/Sq Ft</th>
                  <th>GLA Adjustment</th>
                  <th>Adjusted Price</th>
                </tr>
              </thead>
              <tbody>
                {results.comparables_analysis.map((c, idx) => (
                  <tr key={idx}>
                    <td>{c.comparable_number || idx + 1}</td>
                    <td>{c.address || 'N/A'}</td>
                    <td>{formatCurrency(c.original_price)}</td>
                    <td>{formatNumber(c.original_gla)}</td>
                    <td>{formatCurrency(c.price_per_sqft, 2)}</td>
                    <td className={c.gla_adjustment >= 0 ? 'text-success' : 'text-danger'}>
                      {c.gla_adjustment >= 0 ? '+' : ''}{formatCurrency(Math.abs(c.gla_adjustment))}
                    </td>
                    <td>{formatCurrency(c.adjusted_price)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default GLACalculator;