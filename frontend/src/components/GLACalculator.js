import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FileImporter from './FileImporter';
import ColumnMappingModal from './ColumnMappingModal';
import { Container, Card, Table, Button, Form, Alert, Row, Col } from 'react-bootstrap';

// Formatting utilities
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
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [pendingFileData, setPendingFileData] = useState(null);
  const [columnAnalysis, setColumnAnalysis] = useState(null);

  // Get API URL from environment variable
  const API_URL = process.env.REACT_APP_GLA_API_URL;

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

  // Helper function to apply column mappings to raw data
  const applyColumnMappings = (rawData, mappings) => {
    console.log('Applying mappings:', mappings); // Debug log
    console.log('Raw data sample:', rawData[0]); // Debug log
    
    return rawData.map(row => {
      const mappedRow = {};
      
      // Map the columns according to the user's selections
      Object.keys(mappings).forEach(targetField => {
        const sourceColumn = mappings[targetField];
        if (sourceColumn && row[sourceColumn] !== undefined) {
          mappedRow[targetField] = row[sourceColumn];
        }
      });
      
      console.log('Original row:', row); // Debug log
      console.log('Mapped row:', mappedRow); // Debug log
      return mappedRow;
    });
  };

  // Handle confirmed column mapping from modal
  const handleColumnMappingConfirmed = (selectedMappings) => {
    if (pendingFileData) {
      console.log('Selected mappings:', selectedMappings); // Debug log
      const mappedData = applyColumnMappings(pendingFileData, selectedMappings);
      console.log('Mapped data sample:', mappedData[0]); // Debug log
      
      // Convert to GLA Calculator expected format (keep sale_price field name for table compatibility)
      const convertedData = mappedData.map(item => ({
        sale_price: parseFloat(item.sale_price || item.price || 0),  // Keep as sale_price for table
        gla: parseFloat(item.gla || 0),  // Convert to number
        address: item.address || 'N/A'
      }));
      
      console.log('Converted data sample:', convertedData[0]); // Debug log
      setComparables(convertedData);
      setResults(null);
      setError('');
      
      // Clear pending state
      setPendingFileData(null);
      setColumnAnalysis(null);
    }
  };

  // Handle column mapping modal close
  const handleColumnMappingClose = () => {
    setShowColumnMapping(false);
    setPendingFileData(null);
    setColumnAnalysis(null);
  };

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

  const handleDataImported = async (importedData) => {
    // First try to use the data directly if it looks properly formatted
    const firstItem = importedData[0] || {};
    const hasRequiredFields = firstItem.price && firstItem.gla;
    
    if (hasRequiredFields) {
      // Data is already properly formatted
      setComparables(importedData);
      setResults(null);
      setError('');
      return;
    }

    // If not properly formatted, analyze columns for mapping
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/analyze-columns`, {
        data: importedData
      });
      
      const analysis = response.data;
      
      // Check if we have high-confidence mappings for all required fields
      const requiredFields = ['sale_price', 'gla', 'address'];  // Use sale_price instead of price
      const hasHighConfidenceMappings = requiredFields.every(field => 
        analysis.potential_mappings[field]?.confidence > 0.8
      );
      
      if (hasHighConfidenceMappings) {
        // Auto-apply high confidence mappings
        const autoMappings = {};
        requiredFields.forEach(field => {
          const mappingData = analysis.potential_mappings[field];
          if (mappingData?.best_match) {
            autoMappings[field] = mappingData.best_match;
          }
        });
        
        // Convert to GLA Calculator expected format (keep sale_price field name for table compatibility)
        const mappedData = applyColumnMappings(importedData, autoMappings).map(item => {
          console.log('Mapping item:', item); // Debug log
          const price = parseFloat(item.sale_price || item.price || 0);
          const gla = parseFloat(item.gla || 0);
          const converted = {
            sale_price: price,  // Keep as sale_price for table compatibility
            gla: gla,
            address: item.address || 'N/A'
          };
          console.log('Converted item:', converted); // Debug log
          return converted;
        });
        console.log('Final mapped data:', mappedData); // Debug log
        setComparables(mappedData);
        setResults(null);
        setError('');
      } else {
        // Show column mapping modal for user selection
        setPendingFileData(importedData);
        setColumnAnalysis(analysis);
        setShowColumnMapping(true);
      }
    } catch (error) {
      console.error('Column analysis failed:', error);
      setError('Failed to analyze file columns. Please ensure your file contains price, GLA, and address data.');
    }
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

  const handleReset = () => {
    setSubjectGLA('');
    setComparables([
      { address: '', sale_price: '', gla: '' },
      { address: '', sale_price: '', gla: '' },
      { address: '', sale_price: '', gla: '' }
    ]);
    setResults(null);
    setError(null);
    setLoading(false);
    setSavedMapping(null);
    setEditingField(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const payload = {
        comparables: comparables.map(c => ({
          price: parseFloat(c.sale_price),
          gla: parseFloat(c.gla),
          address: c.address || 'N/A'
        }))
      };

      // Add subject_gla only if provided
      if (subjectGLA && subjectGLA.trim() !== '') {
        payload.subject_gla = parseFloat(subjectGLA);
      }
      
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
        <h1 className="text-buildu-primary"><strong>BuildU</strong> GLA Adjustment Tool</h1>
        <p className="text-buildu-secondary">Ratterman Method Calculator for Property Appraisers</p>
      </div>
      
      {/* File Import Section */}
      <Card className="mb-4 border-accent">
        <Card.Header className="results-header">
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
            {/* Subject Property GLA Input - Optional */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    <strong>Subject Property GLA (sq ft)</strong> 
                    <span className="text-muted"> - optional</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={subjectGLA}
                    onChange={e => {
                      const rawValue = e.target.value.replace(/[,]/g, '');
                      setSubjectGLA(rawValue);
                    }}
                    placeholder="e.g., 2000 (optional - for reference only)"
                    title="Subject property GLA is optional for Ratterman method"
                  />
                  <Form.Text className="text-muted">
                    The Ratterman method uses market averages - subject GLA not required for calculations
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
              <Button variant="outline-secondary" type="button" onClick={handleReset}>
                Reset
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
              <Col md={3}>
                <Card className="summary-card">
                  <Card.Body>
                    <Card.Title>Subject Property GLA</Card.Title>
                    <h4 className="text-buildu-accent">
                      {results.subject_gla ? formatNumber(results.subject_gla) + ' sq ft' : 'Optional'}
                    </h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center border-accent">
                  <Card.Body>
                    <Card.Title>Number of Comparables</Card.Title>
                    <h4 className="text-buildu-primary">{formatNumber(results.summary.number_of_comparables)}</h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center border-accent">
                  <Card.Body>
                    <Card.Title>Average GLA</Card.Title>
                    <h4 className="text-buildu-accent">{formatNumber(results.summary.average_gla)} sq ft</h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center border-accent">
                  <Card.Body>
                    <Card.Title>Market Avg $/Sq Ft</Card.Title>
                    <h4 className="text-buildu-secondary">${formatNumber(results.summary.average_price_per_sqft, 2)}</h4>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Calculation Method */}
            <Alert variant="primary" className="mb-4">
              <strong>Ratterman Method:</strong> Each comparable is adjusted to the market average price per square foot.
              <br />
              <small className="text-muted">
                Formula: (Market Avg $/sqft - Comparable $/sqft) × Comparable GLA = GLA Adjustment
              </small>
            </Alert>
            
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
            <Table responsive bordered className="table-hover">
              <thead className="table-dark">
                <tr>
                  <th className="text-center">#</th>
                  <th>Address</th>
                  <th className="text-center">Sale Price</th>
                  <th className="text-center">GLA (sq ft)</th>
                  <th className="text-center">$/Sq Ft</th>
                  <th className="text-center">GLA vs Avg</th>
                  <th className="text-center">Adj/Sq Ft</th>
                  <th className="text-center">GLA Adjustment</th>
                  <th className="text-center">Adjusted Price</th>
                </tr>
              </thead>
              <tbody>
                {results.comparables_analysis.map((c, idx) => (
                  <tr key={idx}>
                    <td className="text-center">{c.comparable_number || idx + 1}</td>
                    <td>{c.address || 'N/A'}</td>
                    <td className="text-center">{formatCurrency(c.original_price)}</td>
                    <td className="text-center">{formatNumber(c.original_gla)}</td>
                    <td className="text-center">{formatCurrency(c.price_per_sqft, 2)}</td>
                    <td className="text-center">
                      <span className={c.gla_diff_from_avg >= 0 ? 'text-success' : 'text-danger'}>
                        {c.gla_diff_from_avg >= 0 ? '+' : ''}{formatNumber(Math.abs(c.gla_diff_from_avg))}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={c.adjustment_per_sqft >= 0 ? 'text-success' : 'text-danger'}>
                        {c.adjustment_per_sqft >= 0 ? '+' : ''}${formatNumber(Math.abs(c.adjustment_per_sqft), 2)}
                      </span>
                    </td>
                    <td className="text-center">
                      <div>
                        <span className={c.gla_adjustment >= 0 ? 'text-success' : 'text-danger'}>
                          {c.gla_adjustment >= 0 ? '+' : ''}{formatCurrency(Math.abs(c.gla_adjustment))}
                        </span>
                        {c.calculation_breakdown && (
                          <>
                            <br />
                            <small className="text-muted" style={{fontSize: '0.7em'}}>
                              {c.calculation_breakdown.step_by_step}
                            </small>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="text-center fw-bold">{formatCurrency(c.adjusted_price)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Outlier Information Section */}
            {results.outliers && results.outliers.length > 0 && (
              <Card className="mt-4 border-warning">
                <Card.Header className="bg-warning text-dark">
                  <h5 className="mb-0">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Outliers Removed ({results.outliers.length})
                  </h5>
                </Card.Header>
                <Card.Body>
                  <p className="text-muted mb-3">
                    The following comparables were identified as outliers and excluded from the analysis 
                    (price per sqft outside {results.outlier_analysis?.threshold_std_devs || 1.5} standard deviations):
                  </p>
                  <div className="table-responsive">
                    <Table size="sm" className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Comparable</th>
                          <th>Address</th>
                          <th>Price</th>
                          <th>GLA</th>
                          <th>Price/SqFt</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.outliers.map((outlier, idx) => (
                          <tr key={idx}>
                            <td>#{outlier.comparable_number}</td>
                            <td>{outlier.address}</td>
                            <td>{formatCurrency(outlier.original_price)}</td>
                            <td>{outlier.original_gla?.toLocaleString()}</td>
                            <td>
                              <span className={outlier.outlier_type === 'above_threshold' ? 'text-danger' : 'text-primary'}>
                                {formatCurrency(outlier.price_per_sqft)}
                              </span>
                            </td>
                            <td className="small text-muted">{outlier.outlier_reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  {results.outlier_analysis && (
                    <div className="mt-3 p-2 bg-light rounded">
                      <small className="text-muted">
                        <strong>Statistical Summary:</strong> Mean price/sqft: {formatCurrency(results.outlier_analysis.mean_price_per_sqft)} | 
                        Standard Deviation: {formatCurrency(results.outlier_analysis.std_dev_price_per_sqft)} | 
                        Valid Range: {formatCurrency(results.outlier_analysis.lower_bound)} - {formatCurrency(results.outlier_analysis.upper_bound)}
                      </small>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* Display when no outliers were found */}
            {results.outlier_analysis && results.outliers && results.outliers.length === 0 && (
              <div className="mt-3 text-center">
                <small className="text-success">
                  <i className="fas fa-check-circle me-1"></i>
                  No outliers detected - all comparables within {results.outlier_analysis.threshold_std_devs} standard deviations
                </small>
              </div>
            )}

            {/* Final Summary */}
            <Card className="mt-4 border-success">
              <Card.Header className="bg-success text-white">
                <h5 className="mb-0">Final Analysis Summary</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <h6>Average Adjusted Price:</h6>
                    <h4 className="text-success">{formatCurrency(results.summary.average_adjusted_price)}</h4>
                  </Col>
                  <Col md={6}>
                    <h6>Calculation Method:</h6>
                    <p className="mb-0">{results.summary.calculation_method || 'Ratterman Method'}</p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Card.Body>
        </Card>
      )}

      {/* Column Mapping Modal */}
      <ColumnMappingModal
        isOpen={showColumnMapping}
        onClose={handleColumnMappingClose}
        columnAnalysis={columnAnalysis}
        onConfirmMapping={handleColumnMappingConfirmed}
        analysisType="gla"
      />
    </Container>
  );
};

export default GLACalculator;