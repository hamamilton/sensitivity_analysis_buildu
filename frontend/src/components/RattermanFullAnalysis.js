import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Table, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { Scatter } from 'react-chartjs-2';
import ReconciliationDashboard from './ReconciliationDashboard';
import ColumnMappingModal from './ColumnMappingModal';
import DataQualityModal from './DataQualityModal';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  annotationPlugin
);

const RattermanFullAnalysis = () => {
  const [file, setFile] = useState(null);
  const [subjectProperty, setSubjectProperty] = useState({ gla: '', lot_size: '', garage_spaces: '' });
  const [adjustmentFactors, setAdjustmentFactors] = useState({ time_adjustment_per_month: '', lot_size_per_sqft: '', garage_per_space: '' });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [comparablesData, setComparablesData] = useState([]);
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [showDataQuality, setShowDataQuality] = useState(false);
  const [dataQualityIssues, setDataQualityIssues] = useState([]);
  const [pendingFilteredData, setPendingFilteredData] = useState([]);
  const [pendingFileData, setPendingFileData] = useState(null);
  const [columnAnalysis, setColumnAnalysis] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubjectChange = (e) => {
    const { name, value } = e.target;
    setSubjectProperty(prev => ({ ...prev, [name]: value }));
  };

  const handleAdjustmentChange = (e) => {
    const { name, value } = e.target;
    setAdjustmentFactors(prev => ({ ...prev, [name]: value }));
  };

  // Helper function to apply column mappings to raw data
  const applyColumnMappings = (rawData, mappings) => {
    return rawData.map(row => {
      const mappedRow = {};
      
      // Map the columns according to the user's selections
      Object.keys(mappings).forEach(targetField => {
        const sourceColumn = mappings[targetField];
        if (sourceColumn && row[sourceColumn] !== undefined) {
          mappedRow[targetField] = row[sourceColumn];
        }
      });
      
      return mappedRow;
    });
  };

  // Handle confirmed column mapping from modal
  const handleColumnMappingConfirmed = (selectedMappings) => {
    if (pendingFileData) {
      const mappedData = applyColumnMappings(pendingFileData, selectedMappings);
      
      // Filter out rows with missing required data
      const filteredData = mappedData.filter((row, index) => {
        const hasPrice = row.sale_price && !isNaN(parseFloat(row.sale_price)) && parseFloat(row.sale_price) > 0;
        const hasGLA = row.gla && !isNaN(parseFloat(row.gla)) && parseFloat(row.gla) > 0;
        const hasAddress = row.address && row.address.trim() !== '';
        
        const isValid = hasPrice && hasGLA && hasAddress;
        if (!isValid) {
          console.log(`Ratterman: Filtering out row ${index + 1}:`, row, 'Reasons:', {hasPrice, hasGLA, hasAddress});
        }
        return isValid;
      });
      
      console.log(`Ratterman: Manual mapping filtered data from ${mappedData.length} to ${filteredData.length} rows`);
      
      processAnalysis(filteredData);
      
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
    setLoading(false);
  };

  const handleDataQualityContinue = () => {
    setShowDataQuality(false);
    setLoading(true);
    processAnalysis(pendingFilteredData);
  };

  const handleDataQualityCancel = () => {
    setShowDataQuality(false);
    setError('Analysis cancelled. Please fix the data quality issues in your file and try again.');
    setDataQualityIssues([]);
    setPendingFilteredData([]);
  };

  const processAnalysis = (comparablesData) => {
    setComparablesData(comparablesData); // Save for reconciliation
    
    console.log('Ratterman: About to send to backend - sample data:', comparablesData[0]);
    console.log('Ratterman: About to send - subject property:', subjectProperty);
    console.log('Ratterman: About to send - adjustment factors:', adjustmentFactors);
    
    const payload = {
      subject_property: subjectProperty,
      comparables: comparablesData,
      adjustment_factors: adjustmentFactors
    };

    const API_URL = `${process.env.REACT_APP_API_BASE_URL}/api/ratterman-full`;
    
    axios.post(API_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 120000 // 2 minute timeout for complex analysis
    }).then(response => {
        if (response.data.guidance) {
            setError(response.data.guidance);
            setShowReconciliation(true);
            setResults(null);
        } else {
            setResults(response.data);
            setShowReconciliation(false);
        }
    }).catch(err => {
        setError(`Analysis failed: ${err.response ? err.response.data.error : err.message}`);
    }).finally(() => {
        setLoading(false);
    });
  };

  const handleReset = () => {
    setFile(null);
    setSubjectProperty({ gla: '', lot_size: '', garage_spaces: '' });
    setAdjustmentFactors({ time_adjustment_per_month: '', lot_size_per_sqft: '', garage_per_space: '' });
    setResults(null);
    setError('');
    setLoading(false);
    setShowReconciliation(false);
    setComparablesData([]);
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResults(null);

    if (!file) {
      setError('Please select a file to upload.');
      setLoading(false);
      return;
    }

    const processData = async (comparables) => {
        console.log('Ratterman: Processing data, sample:', comparables[0]); // Debug log
        // Try column analysis first
        try {
          const analysisResponse = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/analyze-columns`, {
            data: comparables
          });
          
          const analysis = analysisResponse.data;
          console.log('Ratterman: Column analysis result:', analysis); // Debug log
          
          // Check if we have high-confidence mappings for all required fields
          const requiredFields = ['sale_price', 'gla', 'address'];
          const hasHighConfidenceMappings = requiredFields.every(field => 
            analysis.potential_mappings[field]?.confidence > 0.8
          );
          
          console.log('Ratterman: High confidence mappings?', hasHighConfidenceMappings); // Debug log
          
          if (hasHighConfidenceMappings) {
            // Auto-apply high confidence mappings
            const autoMappings = {};
            requiredFields.forEach(field => {
              const mappingData = analysis.potential_mappings[field];
              if (mappingData?.best_match) {
                autoMappings[field] = mappingData.best_match;
              }
            });
            
            console.log('Ratterman: Auto mappings:', autoMappings); // Debug log
            const mappedData = applyColumnMappings(comparables, autoMappings);
            console.log('Ratterman: Mapped data sample:', mappedData[0]); // Debug log
            
            // Analyze data quality and identify problematic rows
            const dataQualityIssues = [];
            const filteredData = mappedData.filter((row, index) => {
              const issues = [];
              const hasPrice = row.sale_price && !isNaN(parseFloat(row.sale_price)) && parseFloat(row.sale_price) > 0;
              const hasGLA = row.gla && !isNaN(parseFloat(row.gla)) && parseFloat(row.gla) > 0;
              const hasAddress = row.address && row.address.trim() !== '';
              
              if (!hasPrice) {
                issues.push('Missing or invalid sale price');
              }
              if (!hasGLA) {
                issues.push('Missing or invalid GLA');
              }
              if (!hasAddress) {
                issues.push('Missing address');
              }
              
              if (issues.length > 0) {
                dataQualityIssues.push({
                  rowNumber: index + 1,
                  address: row.address || 'N/A',
                  sale_price: row.sale_price || 'N/A',
                  gla: row.gla || 'N/A',
                  issues: issues
                });
                return false; // Filter out this row
              }
              return true; // Keep this row
            });
            
            console.log(`Ratterman: Filtered data from ${mappedData.length} to ${filteredData.length} rows`); // Debug log
            console.log('Ratterman: First filtered row:', filteredData[0]);
            console.log('Ratterman: Sample filtered data fields:', Object.keys(filteredData[0] || {}));
            
            // If there are data quality issues, show them to the user
            if (dataQualityIssues.length > 0) {
              // Store the data and issues for the modal
              setDataQualityIssues(dataQualityIssues);
              setPendingFilteredData(filteredData);
              setShowDataQuality(true);
              setLoading(false); // Stop loading while user decides
              return;
            }
            
            processAnalysis(filteredData);
          } else {
            // Show column mapping modal for user selection
            setPendingFileData(comparables);
            setColumnAnalysis(analysis);
            setShowColumnMapping(true);
          }
        } catch (error) {
          console.error('Column analysis failed:', error);
          // Fall back to direct analysis if column analysis fails
          processAnalysis(comparables);
        }
    };

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
            const fileExtension = file.name.split('.').pop().toLowerCase();
            if (fileExtension === 'json') {
                const comparables = JSON.parse(event.target.result);
                processData(comparables);
            } else if (fileExtension === 'csv') {
                Papa.parse(event.target.result, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: true,
                    complete: (result) => {
                        processData(result.data);
                    }
                });
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                const workbook = XLSX.read(event.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const comparables = XLSX.utils.sheet_to_json(sheet);
                processData(comparables);
            } else {
                setError('Unsupported file type. Please upload JSON, CSV, or Excel files.');
                setLoading(false);
            }
        } catch (parseError) {
          setError(`Failed to parse file. Please ensure it is valid. Error: ${parseError.message}`);
          setLoading(false);
        }
      };
      
      if (file.name.split('.').pop().toLowerCase() === 'xlsx' || file.name.split('.').pop().toLowerCase() === 'xls') {
          reader.readAsBinaryString(file);
      } else {
          reader.readAsText(file);
      }

    } catch (err) {
      setError('An error occurred while reading the file.');
      setLoading(false);
    }
  };

  return (
    <Container className="mt-4">
      <Card className="mb-4 border-primary">
        <Card.Header className="bg-primary text-white">
          <h2 className="mb-0">Full Ratterman Method Analysis (Linear Regression)</h2>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            {/* File Upload */}
            <Form.Group controlId="formFile" className="mb-3">
              <Form.Label><strong>Upload Comparables Data (JSON, CSV, or Excel)</strong></Form.Label>
              <Form.Control type="file" accept=".json,.csv,.xlsx,.xls" onChange={handleFileChange} required />
              <Form.Text className="text-muted">
                Upload a JSON, CSV, or Excel file containing an array of comparable properties. Each property should be an object with fields like `sale_price`, `gla`, `lot_size`, etc.
              </Form.Text>
            </Form.Group>

            {/* Subject Property Inputs */}
            <h4 className="mt-4">Subject Property Details</h4>
            <Row>
              <Col md={4}><Form.Group><Form.Label>GLA</Form.Label><Form.Control type="number" name="gla" value={subjectProperty.gla} onChange={handleSubjectChange} placeholder="e.g., 2500" /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Lot Size</Form.Label><Form.Control type="number" name="lot_size" value={subjectProperty.lot_size} onChange={handleSubjectChange} placeholder="e.g., 10000" /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Garage Spaces</Form.Label><Form.Control type="number" name="garage_spaces" value={subjectProperty.garage_spaces} onChange={handleSubjectChange} placeholder="e.g., 2" /></Form.Group></Col>
            </Row>

            {/* Adjustment Factors Inputs */}
            <h4 className="mt-4">Market-Derived Adjustment Factors</h4>
            <Row>
              <Col md={4}><Form.Group><Form.Label>Time Adj/Month</Form.Label><Form.Control type="number" name="time_adjustment_per_month" value={adjustmentFactors.time_adjustment_per_month} onChange={handleAdjustmentChange} placeholder="Leave blank for auto-derived" /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Lot Size Adj/SqFt</Form.Label><Form.Control type="number" name="lot_size_per_sqft" value={adjustmentFactors.lot_size_per_sqft} onChange={handleAdjustmentChange} placeholder="Leave blank for auto-derived" /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Garage Adj/Space</Form.Label><Form.Control type="number" name="garage_per_space" value={adjustmentFactors.garage_per_space} onChange={handleAdjustmentChange} placeholder="Leave blank for auto-derived" /></Form.Group></Col>
            </Row>

            <div className="d-flex gap-3 mt-4">
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Analyzing...</> : 'Run Full Analysis'}
              </Button>
              <Button variant="secondary" type="button" onClick={handleReset} disabled={loading}>
                Reset Form
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {showReconciliation && <ReconciliationDashboard comparables={comparablesData} />}

      {results && !showReconciliation && (
        <Card className="mt-4 border-success">
          <Card.Header className="bg-success text-white">
            <h3 className="mb-0">Ratterman Analysis Results</h3>
          </Card.Header>
          <Card.Body>
            {/* Summary Cards */}
            <Row className="mb-4">
              <Col md={2}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title>GLA Adjustment Factor</Card.Title>
                    <h4 className="text-success">
                      ${Math.abs(parseFloat(results.step2_regression_analysis.gla_adjustment_factor)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} / sq ft
                    </h4>
                    <small className="text-muted">Market-Derived</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={2}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title>R-Squared</Card.Title>
                    <h4 className="text-info">{parseFloat(results.step2_regression_analysis.r_squared).toFixed(3)}</h4>
                    <small className="text-muted">{results.summary.confidence_level}</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={2}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title>Comparables Used</Card.Title>
                    <h4 className="text-warning">{results.step1_comparables.length}</h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={2}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title>Average GLA</Card.Title>
                    <h4 className="text-primary">
                      {Math.round(results.step1_comparables.reduce((avg, c, _, arr) => avg + c.gla / arr.length, 0)).toLocaleString()} sq ft
                    </h4>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={2}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title>Market Factors</Card.Title>
                    <h4 className="text-success">{results.summary.factors_derived_from_market}</h4>
                    <small className="text-muted">Auto-Derived</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={2}>
                <Card className="text-center">
                  <Card.Body>
                    <Card.Title>User Factors</Card.Title>
                    <h4 className="text-primary">{results.summary.factors_user_provided}</h4>
                    <small className="text-muted">Manual Entry</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Method Explanation */}
            <Alert variant="info" className="mb-4">
              <strong>Ratterman Method:</strong> Market-derived GLA adjustment factors through regression analysis.
              <br />
              <small className="text-muted">
                <strong>Regression Equation:</strong> {results.step2_regression_analysis.equation}
              </small>
            </Alert>

            {/* Price Range Analysis for Bare Prices */}
            <Card className="mb-4 border-secondary">
              <Card.Header className="bg-secondary text-white">
                <h5 className="mb-0">Bare Price Range Analysis</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Card className="h-100">
                      <Card.Body className="text-center">
                        <Card.Title className="text-primary">Minimum Bare Price</Card.Title>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <strong>${Math.min(...results.step1_comparables.map(c => c.bare_price)).toLocaleString()}</strong>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="h-100">
                      <Card.Body className="text-center">
                        <Card.Title className="text-danger">Maximum Bare Price</Card.Title>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <strong>${Math.max(...results.step1_comparables.map(c => c.bare_price)).toLocaleString()}</strong>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
                <Row className="mt-3">
                  <Col md={12}>
                    <div className="text-center p-3 bg-light rounded">
                      <h6 className="mb-1">Bare Price Range</h6>
                      <strong className="text-success">
                        ${(Math.max(...results.step1_comparables.map(c => c.bare_price)) - Math.min(...results.step1_comparables.map(c => c.bare_price))).toLocaleString()}
                      </strong>
                      <small className="d-block text-muted">
                        Difference between highest and lowest bare prices after adjustments
                      </small>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Final Adjusted Price Range Analysis (if available) */}
            {results.step3_final_adjustments && (
              <Card className="mb-4 border-primary">
                <Card.Header className="bg-primary text-white">
                  <h5 className="mb-0">Final Adjusted Price Range</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={4}>
                      <Card className="h-100">
                        <Card.Body className="text-center">
                          <Card.Title className="text-primary">Minimum Price</Card.Title>
                          <h5 className="text-primary">
                            ${Math.min(...results.step3_final_adjustments.map(c => c.final_adjusted_price)).toLocaleString()}
                          </h5>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={4}>
                      <Card className="h-100">
                        <Card.Body className="text-center">
                          <Card.Title className="text-danger">Maximum Price</Card.Title>
                          <h5 className="text-danger">
                            ${Math.max(...results.step3_final_adjustments.map(c => c.final_adjusted_price)).toLocaleString()}
                          </h5>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={4}>
                      <Card className="h-100">
                        <Card.Body className="text-center">
                          <Card.Title className="text-success">Average Price</Card.Title>
                          <h5 className="text-success">
                            ${Math.round(results.step3_final_adjustments.reduce((sum, c) => sum + c.final_adjusted_price, 0) / results.step3_final_adjustments.length).toLocaleString()}
                          </h5>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                  <Row className="mt-3">
                    <Col md={12}>
                      <div className="text-center p-3 bg-light rounded">
                        <h6 className="mb-1">Final Price Range</h6>
                        <strong className="text-success">
                          ${(Math.max(...results.step3_final_adjustments.map(c => c.final_adjusted_price)) - Math.min(...results.step3_final_adjustments.map(c => c.final_adjusted_price))).toLocaleString()}
                        </strong>
                        <small className="d-block text-muted">
                          Range tightening indicates more credible adjustments
                        </small>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            )}
            
            {/* Regression Chart */}
            <Card className="mb-4 border-info">
              <Card.Header className="bg-info text-white">
                <h5 className="mb-0">GLA vs Bare Price Regression</h5>
              </Card.Header>
              <Card.Body>
                <div style={{ height: '400px', marginBottom: '1rem' }}>
                  <Scatter 
                    data={{
                      datasets: [
                        {
                          label: 'Comparable Properties',
                          data: results.step1_comparables.map(c => ({ x: c.gla, y: c.bare_price })),
                          backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          type: 'linear',
                          position: 'bottom',
                          title: {
                            display: true,
                            text: 'Gross Living Area (GLA)',
                          },
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Bare Price',
                          },
                        },
                      },
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        title: {
                          display: true,
                          text: 'GLA vs. Bare Price Regression Analysis',
                        },
                        annotation: {
                          annotations: {
                            line1: {
                              type: 'line',
                              scaleID: 'x',
                              value: results.step1_comparables.reduce((avg, c, _, arr) => avg + c.gla / arr.length, 0),
                              borderColor: 'rgba(255, 99, 132, 0.8)',
                              borderWidth: 2,
                              label: {
                                content: 'Avg GLA',
                                enabled: true,
                                position: 'start',
                              },
                            },
                            regressionLine: {
                              type: 'line',
                              scaleID: 'x',
                              borderColor: 'rgba(255, 99, 132, 1)',
                              borderWidth: 2,
                              endValue: Math.max(...results.step1_comparables.map(c => c.gla)),
                              value: Math.min(...results.step1_comparables.map(c => c.gla)),
                              yMin: results.step2_regression_analysis.intercept + results.step2_regression_analysis.gla_adjustment_factor * Math.min(...results.step1_comparables.map(c => c.gla)),
                              yMax: results.step2_regression_analysis.intercept + results.step2_regression_analysis.gla_adjustment_factor * Math.max(...results.step1_comparables.map(c => c.gla)),
                            }
                          }
                        }
                      },
                    }}
                  />
                </div>
              </Card.Body>
            </Card>

            {/* Step 1 Results */}
            <Card className="mb-4">
              <Card.Header className="bg-light">
                <h5 className="mb-0">Step 1: Comparables Adjusted to "Bare Price"</h5>
              </Card.Header>
              <Card.Body>
                {/* Adjustment Factors Used */}
                <Alert variant="info" className="mb-3">
                  <strong>Adjustment Factors Used:</strong>
                  <div className="mt-2">
                    <div className="row">
                      <div className="col-md-6">
                        <small>
                          <strong>Market-Derived Factors:</strong><br />
                          {results.market_derived_factors && Object.keys(results.market_derived_factors).length > 0 ? (
                            Object.entries(results.market_derived_factors).map(([key, value]) => (
                              <span key={key} className="text-success">
                                {key.replace(/_/g, ' ')}: ${value}{key.includes('per_sqft') ? '/sqft' : key.includes('per_space') ? '/space' : key.includes('per_point') ? '/point' : key.includes('per_month') ? '/month' : ''}<br />
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">None derived from data</span>
                          )}
                        </small>
                      </div>
                      <div className="col-md-6">
                        <small>
                          <strong>User-Provided Factors:</strong><br />
                          {results.user_provided_factors && Object.values(results.user_provided_factors).some(v => v && parseFloat(v) !== 0) ? (
                            Object.entries(results.user_provided_factors).filter(([k, v]) => v && parseFloat(v) !== 0).map(([key, value]) => (
                              <span key={key} className="text-primary">
                                {key.replace(/_/g, ' ')}: ${value}{key.includes('per_sqft') ? '/sqft' : key.includes('per_space') ? '/space' : key.includes('per_point') ? '/point' : key.includes('per_month') ? '/month' : ''}<br />
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">None provided by user</span>
                          )}
                        </small>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <small>
                        <strong>Final Factors Applied:</strong><br />
                        Time: <span className="fw-bold">${results.adjustment_factors_used?.time_adjustment_per_month || '0'}/month</span> • 
                        Lot Size: <span className="fw-bold">${results.adjustment_factors_used?.lot_size_per_sqft || '0'}/sqft</span> • 
                        Garage: <span className="fw-bold">${results.adjustment_factors_used?.garage_per_space || '0'}/space</span>
                      </small>
                      
                      {(!results.adjustment_factors_used?.time_adjustment_per_month && 
                        !results.adjustment_factors_used?.lot_size_per_sqft && 
                        !results.adjustment_factors_used?.garage_per_space) && (
                        <div className="mt-2">
                          <small className="text-warning">
                            ⚠️ All adjustment factors are 0 - this means only GLA adjustments will be calculated. 
                            The system attempted to derive factors from your data but may need more complete data fields (lot sizes, garage counts) to calculate meaningful adjustments.
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>

                <div className="table-responsive">
                  <Table bordered hover>
                    <thead className="table-light">
                      <tr>
                        <th className="text-center">#</th>
                        <th>Address</th>
                        <th className="text-end">Original Price</th>
                        <th className="text-end">GLA</th>
                        <th className="text-end">Time Adj</th>
                        <th className="text-end">Lot Adj</th>
                        <th className="text-end">Garage Adj</th>
                        <th className="text-end">Total Adjustments</th>
                        <th className="text-end">Bare Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.step1_comparables.map(comp => (
                        <tr key={comp.comparable_number}>
                          <td className="text-center fw-bold">{comp.comparable_number}</td>
                          <td>{comp.address}</td>
                          <td className="text-end">${comp.original_sale_price.toLocaleString()}</td>
                          <td className="text-end">{comp.gla.toLocaleString()} sq ft</td>
                          <td className="text-end">
                            {comp.time_adjustment === 0 ? (
                              <span className="text-muted">$0</span>
                            ) : (
                              <span className={comp.time_adjustment > 0 ? 'text-success' : 'text-danger'}>
                                ${Math.abs(comp.time_adjustment).toLocaleString()}
                                {comp.time_adjustment > 0 ? ' ↑' : ' ↓'}
                              </span>
                            )}
                          </td>
                          <td className="text-end">
                            {comp.lot_adjustment === 0 ? (
                              <span className="text-muted">$0</span>
                            ) : (
                              <span className={comp.lot_adjustment > 0 ? 'text-success' : 'text-danger'}>
                                ${Math.abs(comp.lot_adjustment).toLocaleString()}
                                {comp.lot_adjustment > 0 ? ' ↑' : ' ↓'}
                              </span>
                            )}
                          </td>
                          <td className="text-end">
                            {comp.garage_adjustment === 0 ? (
                              <span className="text-muted">$0</span>
                            ) : (
                              <span className={comp.garage_adjustment > 0 ? 'text-success' : 'text-danger'}>
                                ${Math.abs(comp.garage_adjustment).toLocaleString()}
                                {comp.garage_adjustment > 0 ? ' ↑' : ' ↓'}
                              </span>
                            )}
                          </td>
                          <td className="text-end">
                            {comp.total_adjustments === 0 ? (
                              <span className="text-muted">$0</span>
                            ) : (
                              <span className={comp.total_adjustments > 0 ? 'text-success' : 'text-danger'}>
                                ${Math.abs(comp.total_adjustments).toLocaleString()}
                                {comp.total_adjustments > 0 ? ' ↑' : ' ↓'}
                              </span>
                            )}
                          </td>
                          <td className="text-end fw-bold">${comp.bare_price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>

            {/* Step 3 Results */}
            {results.step3_final_adjustments && (
              <Card className="mb-4 border-success">
                <Card.Header className="bg-success text-white">
                  <h5 className="mb-0">Step 3: Final Adjustments Using Derived Factor</h5>
                </Card.Header>
                <Card.Body>
                  <Alert variant="success" className="mb-3">
                    <strong>GLA Adjustments Applied:</strong> Using market-derived factor of 
                    ${Math.abs(parseFloat(results.step2_regression_analysis.gla_adjustment_factor)).toFixed(2)}/sq ft
                    <br />
                    <small>Subject Property GLA: {results.subject_property.gla} sq ft</small>
                  </Alert>
                  <div className="table-responsive">
                    <Table bordered hover>
                      <thead className="table-light">
                        <tr>
                          <th className="text-center">#</th>
                          <th>Address</th>
                          <th className="text-end">Bare Price</th>
                          <th className="text-end">GLA Difference</th>
                          <th className="text-end">GLA Adjustment</th>
                          <th className="text-end">Final Adjusted Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.step3_final_adjustments.map(comp => (
                          <tr key={comp.comparable_number}>
                            <td className="text-center fw-bold">{comp.comparable_number}</td>
                            <td>{comp.address}</td>
                            <td className="text-end">${comp.bare_price.toLocaleString()}</td>
                            <td className="text-end">{comp.gla_difference.toLocaleString()} sq ft</td>
                            <td className="text-end">
                              <span className={comp.gla_adjustment > 0 ? 'text-success' : comp.gla_adjustment < 0 ? 'text-danger' : 'text-muted'}>
                                ${Math.abs(comp.gla_adjustment).toLocaleString()}
                                {comp.gla_adjustment > 0 ? ' ↑' : comp.gla_adjustment < 0 ? ' ↓' : ''}
                              </span>
                            </td>
                            <td className="text-end fw-bold text-success">${comp.final_adjusted_price.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Explain why Step 3 might not be showing */}
            {!results.step3_final_adjustments && (
              <Alert variant="warning" className="mb-4">
                <strong>No GLA Adjustments Applied</strong>
                <br />
                GLA adjustments (Step 3) are only shown when the subject property has a GLA value. 
                {!results.subject_property.gla ? (
                  <span>Current subject property GLA: <em>Not provided</em></span>
                ) : (
                  <span>Current subject property GLA: {results.subject_property.gla} sq ft</span>
                )}
                <br />
                <small className="text-muted">
                  To see GLA adjustments, ensure the subject property section includes a valid GLA value.
                </small>
              </Alert>
            )}

            {/* Final Summary */}
            <Card className="mt-4 border-success">
              <Card.Header className="bg-success text-white">
                <h5 className="mb-0">Analysis Summary</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <h6>Market-Derived GLA Adjustment Factor:</h6>
                    <h4 className="text-success">
                      ${Math.abs(parseFloat(results.step2_regression_analysis.gla_adjustment_factor)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} per sq ft
                    </h4>
                  </Col>
                  <Col md={6}>
                    <h6>Regression Confidence:</h6>
                    <h4 className="text-info">
                      R² = {parseFloat(results.step2_regression_analysis.r_squared).toFixed(3)}
                    </h4>
                    <p className="mb-0 text-muted">{results.summary.confidence_level}</p>
                  </Col>
                </Row>
                {results.step3_final_adjustments && (
                  <Row className="mt-3">
                    <Col md={12}>
                      <div className="p-3 bg-light rounded">
                        <h6>Final Value Indication Range:</h6>
                        <h4 className="text-success">
                          ${Math.min(...results.step3_final_adjustments.map(c => c.final_adjusted_price)).toLocaleString()} - ${Math.max(...results.step3_final_adjustments.map(c => c.final_adjusted_price)).toLocaleString()}
                        </h4>
                        <small className="text-muted">
                          Average: ${Math.round(results.step3_final_adjustments.reduce((sum, c) => sum + c.final_adjusted_price, 0) / results.step3_final_adjustments.length).toLocaleString()}
                        </small>
                      </div>
                    </Col>
                  </Row>
                )}
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
        analysisType="ratterman"
      />

      {/* Data Quality Modal */}
      <DataQualityModal
        show={showDataQuality}
        onHide={handleDataQualityCancel}
        issues={dataQualityIssues}
        onContinue={handleDataQualityContinue}
        totalRows={dataQualityIssues.length + pendingFilteredData.length}
        validRows={pendingFilteredData.length}
      />
    </Container>
  );
};

export default RattermanFullAnalysis;
