import React from 'react';
import { Modal, Button, Table, Alert } from 'react-bootstrap';

const DataQualityModal = ({ show, onHide, issues, onContinue, totalRows, validRows }) => {
  if (!issues || issues.length === 0) return null;

  const issueCount = issues.length;
  const maxDisplay = 10;
  
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Data Quality Issues Found</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Alert variant="warning">
          <strong>Found {issueCount} problematic rows</strong> out of {totalRows} total rows.
          <br />
          <strong>{validRows} rows are valid</strong> and ready for analysis.
        </Alert>
        
        <p>
          The following rows have data quality issues that prevent them from being used in the analysis:
        </p>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Row #</th>
                <th>Address</th>
                <th>Sale Price</th>
                <th>GLA</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {issues.slice(0, maxDisplay).map((issue, index) => (
                <tr key={index}>
                  <td>{issue.rowNumber}</td>
                  <td>{issue.address}</td>
                  <td>{issue.sale_price}</td>
                  <td>{issue.gla}</td>
                  <td>
                    <small className="text-danger">
                      {issue.issues.join(', ')}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        
        {issueCount > maxDisplay && (
          <Alert variant="info" className="mt-2">
            <small>
              Showing first {maxDisplay} problematic rows. 
              {issueCount - maxDisplay} additional rows also have issues.
            </small>
          </Alert>
        )}
        
        <Alert variant="info" className="mt-3">
          <strong>Your options:</strong>
          <ul className="mb-0 mt-2">
            <li><strong>Continue:</strong> Proceed with analysis using only the {validRows} valid rows</li>
            <li><strong>Cancel:</strong> Fix the data quality issues in your source file and upload again</li>
          </ul>
        </Alert>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel - Fix File First
        </Button>
        <Button variant="primary" onClick={onContinue}>
          Continue with {validRows} Valid Rows
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DataQualityModal;