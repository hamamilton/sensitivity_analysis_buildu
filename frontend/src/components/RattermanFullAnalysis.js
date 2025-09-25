import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner, Table, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { Scatter } from 'react-chartjs-2';
import ReconciliationDashboard from './ReconciliationDashboard';
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
  const [subjectProperty, setSubjectProperty] = useState({ gla: '', lot_size: '', condition_rating: '', garage_spaces: '' });
  const [adjustmentFactors, setAdjustmentFactors] = useState({ time_adjustment_per_month: '', lot_size_per_sqft: '', condition_per_point: '', garage_per_space: '' });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [comparablesData, setComparablesData] = useState([]);

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

    const processData = (comparables) => {
        setComparablesData(comparables); // Save for reconciliation
        
        const payload = {
          subject_property: subjectProperty,
          comparables: comparables,
          adjustment_factors: adjustmentFactors
        };

          const API_URL = process.env.REACT_APP_RATTERMAN_API_URL || 'https://sensitivity-analysis-backend.onrender.com/api/ratterman-full';        axios.post(API_URL, payload, {
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
              <Col md={3}><Form.Group><Form.Label>GLA</Form.Label><Form.Control type="number" name="gla" value={subjectProperty.gla} onChange={handleSubjectChange} placeholder="e.g., 2500" /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Lot Size</Form.Label><Form.Control type="number" name="lot_size" value={subjectProperty.lot_size} onChange={handleSubjectChange} placeholder="e.g., 10000" /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Condition</Form.Label><Form.Control type="number" name="condition_rating" value={subjectProperty.condition_rating} onChange={handleSubjectChange} placeholder="1-5 rating" /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Garage Spaces</Form.Label><Form.Control type="number" name="garage_spaces" value={subjectProperty.garage_spaces} onChange={handleSubjectChange} placeholder="e.g., 2" /></Form.Group></Col>
            </Row>

            {/* Adjustment Factors Inputs */}
            <h4 className="mt-4">Market-Derived Adjustment Factors</h4>
            <Row>
              <Col md={3}><Form.Group><Form.Label>Time Adj/Month</Form.Label><Form.Control type="number" name="time_adjustment_per_month" value={adjustmentFactors.time_adjustment_per_month} onChange={handleAdjustmentChange} placeholder="$" /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Lot Size Adj/SqFt</Form.Label><Form.Control type="number" name="lot_size_per_sqft" value={adjustmentFactors.lot_size_per_sqft} onChange={handleAdjustmentChange} placeholder="$" /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Condition Adj/Point</Form.Label><Form.Control type="number" name="condition_per_point" value={adjustmentFactors.condition_per_point} onChange={handleAdjustmentChange} placeholder="$" /></Form.Group></Col>
              <Col md={3}><Form.Group><Form.Label>Garage Adj/Space</Form.Label><Form.Control type="number" name="garage_per_space" value={adjustmentFactors.garage_per_space} onChange={handleAdjustmentChange} placeholder="$" /></Form.Group></Col>
            </Row>

            <Button variant="primary" type="submit" className="mt-4" disabled={loading}>
              {loading ? <><Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Analyzing...</> : 'Run Full Analysis'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {showReconciliation && <ReconciliationDashboard comparables={comparablesData} />}

      {results && !showReconciliation && (
        <Card className="mt-4 border-success">
          <Card.Header className="bg-success text-white">
            <h3 className="mb-0">Analysis Results</h3>
          </Card.Header>
          <Card.Body>
            <h4>Regression Analysis Summary</h4>
            <p><strong>Market-Derived GLA Adjustment Factor:</strong> ${results.step2_regression_analysis.gla_adjustment_factor} / sq ft</p>
            <p><strong>Regression Equation:</strong> {results.step2_regression_analysis.equation}</p>
            <p><strong>R-Squared:</strong> {results.step2_regression_analysis.r_squared} (Confidence: {results.summary.confidence_level})</p>
            
            {/* Regression Chart */}
            <div style={{ height: '400px', marginBottom: '2rem' }}>
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

            <h5 className="mt-4">Comparables Adjusted to "Bare Price"</h5>
            <Table responsive bordered hover>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Address</th>
                  <th>Original Price</th>
                  <th>GLA</th>
                  <th>Total Adjustments</th>
                  <th>Bare Price</th>
                </tr>
              </thead>
              <tbody>
                {results.step1_comparables.map(comp => (
                  <tr key={comp.comparable_number}>
                    <td>{comp.comparable_number}</td>
                    <td>{comp.address}</td>
                    <td>${comp.original_sale_price.toLocaleString()}</td>
                    <td>{comp.gla.toLocaleString()} sq ft</td>
                    <td>${comp.total_adjustments.toLocaleString()}</td>
                    <td>${comp.bare_price.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {results.step3_final_adjustments && (
              <>
                <h5 className="mt-4">Final Adjustments Using Derived Factor</h5>
                <Table responsive bordered hover>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Address</th>
                      <th>Bare Price</th>
                      <th>GLA Difference</th>
                      <th>GLA Adjustment</th>
                      <th>Final Adjusted Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.step3_final_adjustments.map(comp => (
                      <tr key={comp.comparable_number}>
                        <td>{comp.comparable_number}</td>
                        <td>{comp.address}</td>
                        <td>${comp.bare_price.toLocaleString()}</td>
                        <td>{comp.gla_difference.toLocaleString()} sq ft</td>
                        <td>${comp.gla_adjustment.toLocaleString()}</td>
                        <td>${comp.final_adjusted_price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default RattermanFullAnalysis;
