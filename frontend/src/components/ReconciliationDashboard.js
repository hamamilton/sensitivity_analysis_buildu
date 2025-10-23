import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Row, Col, Table, Spinner } from 'react-bootstrap';
import axios from 'axios';

const ReconciliationDashboard = ({ comparables }) => {
  const [pairedSales, setPairedSales] = useState({ compA: '', compB: '', result: null, loading: false });
  const [depreciatedCost, setDepreciatedCost] = useState({ cost: '', rate: '', result: null, loading: false });
  const [marketRatio, setMarketRatio] = useState({ percentage: '', result: null, loading: false });
  const [finalAdjustment, setFinalAdjustment] = useState('');
  const [justification, setJustification] = useState('');

  const handlePairedSales = async () => {
    if (!pairedSales.compA || !pairedSales.compB) return;
    setPairedSales(prev => ({ ...prev, loading: true }));
    try {
      const response = await axios.post('http://localhost:8080/api/paired-sales', {
        comp_a: comparables[pairedSales.compA],
        comp_b: comparables[pairedSales.compB],
      });
      setPairedSales(prev => ({ ...prev, result: response.data, loading: false }));
    } catch (error) {
      console.error('Paired Sales Error:', error);
      setPairedSales(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDepreciatedCost = async () => {
    if (!depreciatedCost.cost || !depreciatedCost.rate) return;
    setDepreciatedCost(prev => ({ ...prev, loading: true }));
    try {
      const response = await axios.post('http://localhost:8080/api/depreciated-cost', {
        replacement_cost_sf: depreciatedCost.cost,
        depreciation_rate: depreciatedCost.rate,
      });
      setDepreciatedCost(prev => ({ ...prev, result: response.data, loading: false }));
    } catch (error) {
      console.error('Depreciated Cost Error:', error);
      setDepreciatedCost(prev => ({ ...prev, loading: false }));
    }
  };

  const handleMarketRatio = async () => {
    if (!marketRatio.percentage) return;
    setMarketRatio(prev => ({ ...prev, loading: true }));
    const avgPriceSf = comparables.reduce((acc, c) => acc + (parseFloat(c.sale_price) / parseFloat(c.gla)), 0) / comparables.length;
    try {
      const response = await axios.post('http://localhost:8080/api/market-ratio', {
        avg_price_sf: avgPriceSf,
        contrib_percent: marketRatio.percentage,
      });
      setMarketRatio(prev => ({ ...prev, result: response.data, loading: false }));
    } catch (error) {
      console.error('Market Ratio Error:', error);
      setMarketRatio(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <Container className="mt-4">
      <Card className="border-warning">
        <Card.Header className="bg-warning text-dark">
          <h3>Reconciliation Dashboard</h3>
          <p className="mb-0">Use these alternative methods to support your conclusion when regression analysis is not credible.</p>
        </Card.Header>
        <Card.Body>
          <Row>
            {/* Paired Sales */}
            <Col md={4}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>A. Paired Sales Analysis</Card.Title>
                  <Form.Group className="mb-2">
                    <Form.Label>Select Comp A</Form.Label>
                    <Form.Select onChange={e => setPairedSales(prev => ({ ...prev, compA: e.target.value }))}>
                      <option value="">Select...</option>
                      {comparables.map((c, i) => <option key={i} value={i}>{c.address || `Comp ${i+1}`}</option>)}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Select Comp B</Form.Label>
                    <Form.Select onChange={e => setPairedSales(prev => ({ ...prev, compB: e.target.value }))}>
                      <option value="">Select...</option>
                      {comparables.map((c, i) => <option key={i} value={i}>{c.address || `Comp ${i+1}`}</option>)}
                    </Form.Select>
                  </Form.Group>
                  <Button onClick={handlePairedSales} disabled={pairedSales.loading}>
                    {pairedSales.loading ? <Spinner size="sm" /> : 'Calculate'}
                  </Button>
                  {pairedSales.result && (
                    <Alert variant="success" className="mt-3">
                      <strong>Result: ${pairedSales.result.gla_adjustment_per_sf}/SF</strong><br/>
                      Credibility: {pairedSales.result.credibility_score}
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Depreciated Cost */}
            <Col md={4}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>B. Depreciated Cost Method</Card.Title>
                  <Form.Group className="mb-2">
                    <Form.Label>Replacement Cost/SF</Form.Label>
                    <Form.Control type="number" placeholder="e.g., 250" onChange={e => setDepreciatedCost(prev => ({ ...prev, cost: e.target.value }))} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Depreciation Rate</Form.Label>
                    <Form.Control type="number" placeholder="e.g., 0.25 for 25%" onChange={e => setDepreciatedCost(prev => ({ ...prev, rate: e.target.value }))} />
                  </Form.Group>
                  <Button onClick={handleDepreciatedCost} disabled={depreciatedCost.loading}>
                    {depreciatedCost.loading ? <Spinner size="sm" /> : 'Calculate'}
                  </Button>
                  {depreciatedCost.result && (
                    <Alert variant="success" className="mt-3">
                      <strong>Result: ${depreciatedCost.result.gla_adjustment_per_sf}/SF</strong>
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Market Ratio */}
            <Col md={4}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>C. Market Ratio Method</Card.Title>
                  <Form.Group className="mb-3">
                    <Form.Label>Contributory Percentage</Form.Label>
                    <Form.Control type="number" placeholder="e.g., 0.4 for 40%" onChange={e => setMarketRatio(prev => ({ ...prev, percentage: e.target.value }))} />
                    <Form.Text>Represents Improvement Value / Total Value ratio.</Form.Text>
                  </Form.Group>
                  <Button onClick={handleMarketRatio} disabled={marketRatio.loading}>
                    {marketRatio.loading ? <Spinner size="sm" /> : 'Calculate'}
                  </Button>
                  {marketRatio.result && (
                    <Alert variant="success" className="mt-3">
                      <strong>Result: ${marketRatio.result.gla_adjustment_per_sf}/SF</strong>
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Reconciliation */}
          <Card className="mt-4">
            <Card.Header><h4>Final Reconciliation</h4></Card.Header>
            <Card.Body>
              <Table bordered>
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Result ($/SF)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Paired Sales</td>
                    <td>{pairedSales.result ? pairedSales.result.gla_adjustment_per_sf : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Depreciated Cost</td>
                    <td>{depreciatedCost.result ? depreciatedCost.result.gla_adjustment_per_sf : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Market Ratio</td>
                    <td>{marketRatio.result ? marketRatio.result.gla_adjustment_per_sf : 'N/A'}</td>
                  </tr>
                </tbody>
              </Table>
              <Form.Group className="mb-3">
                <Form.Label><strong>Concluded GLA Adjustment ($/SF)</strong></Form.Label>
                <Form.Control type="number" value={finalAdjustment} onChange={e => setFinalAdjustment(e.target.value)} placeholder="Enter your final concluded value" />
              </Form.Group>
              <Form.Group>
                <Form.Label><strong>Justification</strong></Form.Label>
                <Form.Control as="textarea" rows={3} value={justification} onChange={e => setJustification(e.target.value)} placeholder="Explain your reasoning for the final conclusion, referencing the methods above." />
              </Form.Group>
            </Card.Body>
          </Card>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ReconciliationDashboard;
