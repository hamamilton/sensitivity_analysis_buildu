import React, { useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Form, Button, Table, Alert, Row, Col } from 'react-bootstrap';

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

const FileImporter = ({ onDataImported, savedMapping, onMappingUpdate }) => {
  const [fileData, setFileData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [showMapping, setShowMapping] = useState(false);
  const [mapping, setMapping] = useState({
    sale_price: '',
    gla: '',
    address: ''
  });
  const [previewData, setPreviewData] = useState([]);
  const [detectionMethod, setDetectionMethod] = useState('');
  const [confidence, setConfidence] = useState({});
  const [error, setError] = useState('');

  // Load saved mapping when it's available
  useEffect(() => {
    if (savedMapping) {
      setMapping(savedMapping);
    }
  }, [savedMapping]);

  // AI-powered column analysis function
  const analyzeColumnContent = useCallback((data, headers) => {
    const analysis = {};
    
    headers.forEach(header => {
      const columnData = data.slice(0, 10).map(row => row[header]).filter(val => val && val.toString().trim());
      
      analysis[header] = {
        numeric_ratio: 0,
        currency_patterns: 0,
        address_patterns: 0,
        area_patterns: 0,
        avg_value: 0,
        sample_values: columnData.slice(0, 3)
      };
      
      if (columnData.length === 0) return;
      
      let numericCount = 0;
      let currencyCount = 0;
      let addressCount = 0;
      let areaCount = 0;
      let numericValues = [];
      
      columnData.forEach(value => {
        const strValue = value.toString().trim();
        
        // Check if it's numeric (removing common separators)
        const cleanNumeric = strValue.replace(/[$,\s]/g, '');
        if (!isNaN(cleanNumeric) && cleanNumeric !== '') {
          numericCount++;
          numericValues.push(parseFloat(cleanNumeric));
        }
        
        // Check for currency patterns
        if (/\$|USD|dollar|price|cost|value/i.test(strValue) || 
            /^\$?[\d,]+\.?\d*$/.test(strValue.replace(/\s/g, ''))) {
          currencyCount++;
        }
        
        // Check for address patterns
        if (/\d+.*\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|way|ct|court|pl|place)\b/i.test(strValue) ||
            /\b\d{1,5}\s+\w+/i.test(strValue)) {
          addressCount++;
        }
        
        // Check for area/square footage patterns
        if (/sq|square|feet|ft|area/i.test(strValue) || 
            (numericValues.length > 0 && parseFloat(cleanNumeric) > 500 && parseFloat(cleanNumeric) < 10000)) {
          areaCount++;
        }
      });
      
      analysis[header].numeric_ratio = numericCount / columnData.length;
      analysis[header].currency_patterns = currencyCount / columnData.length;
      analysis[header].address_patterns = addressCount / columnData.length;
      analysis[header].area_patterns = areaCount / columnData.length;
      analysis[header].avg_value = numericValues.length > 0 ? 
        numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0;
    });
    
    return analysis;
  }, []);

  // Enhanced AI-powered auto-detection
  const aiDetectMapping = useCallback((headers, data) => {
    const analysis = analyzeColumnContent(data, headers);
    const autoMapping = {
      sale_price: '',
      gla: '',
      address: ''
    };

    let bestSalePriceScore = 0;
    let bestGlaScore = 0;
    let bestAddressScore = 0;

    headers.forEach(header => {
      const columnAnalysis = analysis[header];
      
      // Calculate Sale Price Score
      let salePriceScore = 0;
      
      // Header name patterns (40% weight)
      if (/sale.*price|sold.*price|price|sp|cost|value/i.test(header)) salePriceScore += 0.4;
      
      // Content analysis (60% weight)
      salePriceScore += columnAnalysis.numeric_ratio * 0.2; // Must be mostly numeric
      salePriceScore += columnAnalysis.currency_patterns * 0.3; // Currency indicators
      
      // Value range analysis (typical home prices)
      if (columnAnalysis.avg_value > 50000 && columnAnalysis.avg_value < 2000000) {
        salePriceScore += 0.1;
      }
      
      // Calculate GLA Score
      let glaScore = 0;
      
      // Header name patterns (50% weight)
      if (/gla|gross.*living|living.*area|sqft|sq.*ft|square.*feet|area/i.test(header)) glaScore += 0.5;
      
      // Content analysis (50% weight)
      glaScore += columnAnalysis.numeric_ratio * 0.2; // Must be mostly numeric
      glaScore += columnAnalysis.area_patterns * 0.1;
      
      // Value range analysis (typical GLA range)
      if (columnAnalysis.avg_value > 500 && columnAnalysis.avg_value < 10000) {
        glaScore += 0.2;
      }
      
      // Calculate Address Score
      let addressScore = 0;
      
      // Header name patterns (40% weight)
      if (/address|location|street|property|addr/i.test(header)) addressScore += 0.4;
      
      // Content analysis (60% weight)
      addressScore += columnAnalysis.address_patterns * 0.6;
      
      // Update best matches
      if (salePriceScore > bestSalePriceScore) {
        bestSalePriceScore = salePriceScore;
        autoMapping.sale_price = header;
      }
      
      if (glaScore > bestGlaScore) {
        bestGlaScore = glaScore;
        autoMapping.gla = header;
      }
      
      if (addressScore > bestAddressScore) {
        bestAddressScore = addressScore;
        autoMapping.address = header;
      }
    });

    // Only return mappings with reasonable confidence
    if (bestSalePriceScore < 0.3) autoMapping.sale_price = '';
    if (bestGlaScore < 0.3) autoMapping.gla = '';
    if (bestAddressScore < 0.3) autoMapping.address = '';

    return {
      mapping: autoMapping,
      confidence: {
        sale_price: bestSalePriceScore,
        gla: bestGlaScore,
        address: bestAddressScore
      }
    };
  }, [analyzeColumnContent]);

  // Helper function to auto-detect column mappings based on header names
  const autoDetectMapping = useCallback((headers) => {
    const autoMapping = {
      sale_price: '',
      gla: '',
      address: ''
    };

    // Common patterns for sale price columns
    const salePricePatterns = [
      /sale.*price/i, /price/i, /sold.*price/i, /sales.*price/i, /sp/i, /cost/i, /value/i
    ];

    // Common patterns for GLA columns
    const glaPatterns = [
      /gla/i, /gross.*living.*area/i, /living.*area/i, /sqft/i, /sq.*ft/i, /square.*feet/i, /area/i
    ];

    // Common patterns for address columns
    const addressPatterns = [
      /address/i, /location/i, /street/i, /property/i, /addr/i, /prop.*addr/i
    ];

    headers.forEach(header => {
      const cleanHeader = header.trim();
      
      // Check for sale price patterns
      if (!autoMapping.sale_price && salePricePatterns.some(pattern => pattern.test(cleanHeader))) {
        autoMapping.sale_price = cleanHeader;
      }
      
      // Check for GLA patterns
      if (!autoMapping.gla && glaPatterns.some(pattern => pattern.test(cleanHeader))) {
        autoMapping.gla = cleanHeader;
      }
      
      // Check for address patterns
      if (!autoMapping.address && addressPatterns.some(pattern => pattern.test(cleanHeader))) {
        autoMapping.address = cleanHeader;
      }
    });

    return autoMapping;
  }, []);

  // Helper function to format cell values based on mapping
  const formatCellValue = (value, header) => {
    if (!value) return '';
    
    if (mapping.sale_price === header) {
      const numValue = parseFloat(value);
      return isNaN(numValue) ? value : formatCurrency(numValue);
    } else if (mapping.gla === header) {
      const numValue = parseFloat(value);
      return isNaN(numValue) ? value : formatNumber(numValue);
    }
    return value;
  };

  const handleFileChange = useCallback((event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    setError('');
    const fileName = selectedFile.name.toLowerCase();

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        let data;
        let parsedHeaders;

        if (fileName.endsWith('.csv')) {
          // Parse CSV
          const csvData = Papa.parse(e.target.result, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim()
          });
          
          if (csvData.errors.length > 0) {
            console.warn('CSV parsing warnings:', csvData.errors);
          }
          
          data = csvData.data;
          parsedHeaders = csvData.meta.fields || [];
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          // Parse Excel
          const workbook = XLSX.read(e.target.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            throw new Error('The Excel file appears to be empty');
          }
          
          parsedHeaders = jsonData[0].map(h => h ? h.toString().trim() : '');
          data = jsonData.slice(1).map(row => {
            const obj = {};
            parsedHeaders.forEach((header, index) => {
              obj[header] = row[index] ? row[index].toString().trim() : '';
            });
            return obj;
          }).filter(row => Object.values(row).some(val => val !== ''));
        } else {
          throw new Error('Unsupported file format. Please use CSV or Excel files.');
        }

        if (!data || data.length === 0) {
          throw new Error('No data found in file');
        }

        setFileData(data);
        setHeaders(parsedHeaders);
        setPreviewData(data.slice(0, 5)); // Show first 5 rows for preview
        
        // Auto-detect column mappings
        // Try AI-powered detection first, fallback to simple detection
        let detectedMapping, detectionConfidence;
        
        try {
          const aiResult = aiDetectMapping(parsedHeaders, data);
          detectedMapping = aiResult.mapping;
          detectionConfidence = aiResult.confidence;
          
          // If AI detection has good confidence, use it
          const hasGoodConfidence = Object.values(detectionConfidence).some(conf => conf > 0.5);
          if (hasGoodConfidence) {
            setDetectionMethod('AI-Powered Analysis');
            setConfidence(detectionConfidence);
          } else {
            // Fallback to simple detection
            detectedMapping = autoDetectMapping(parsedHeaders);
            setDetectionMethod('Pattern Matching');
            setConfidence({});
          }
        } catch (error) {
          console.warn('AI detection failed, using simple detection:', error);
          detectedMapping = autoDetectMapping(parsedHeaders);
          setDetectionMethod('Pattern Matching');
          setConfidence({});
        }
        const newMapping = { ...mapping, ...detectedMapping };
        setMapping(newMapping);
        onMappingUpdate(newMapping);
        
        setShowMapping(true);
      } catch (error) {
        console.error('File parsing error:', error);
        setError(`Error reading file: ${error.message}`);
        setFileData(null);
        setHeaders([]);
        setShowMapping(false);
      }
    };

    if (fileName.endsWith('.csv')) {
      reader.readAsText(selectedFile);
    } else {
      reader.readAsBinaryString(selectedFile);
    }
  }, [mapping, onMappingUpdate, aiDetectMapping, autoDetectMapping]);

  const handleMappingChange = (field, value) => {
    const newMapping = { ...mapping, [field]: value };
    setMapping(newMapping);
    onMappingUpdate(newMapping);
  };

  const validateMapping = () => {
    if (!mapping.sale_price || !mapping.gla) {
      setError('Please map at least Sale Price and GLA columns');
      return false;
    }
    return true;
  };

  const handleImport = () => {
    if (!validateMapping() || !fileData) return;

    setError('');
    
    try {
      const mappedData = fileData.map(row => ({
        sale_price: row[mapping.sale_price] || '',
        gla: row[mapping.gla] || '',
        address: mapping.address ? row[mapping.address] || '' : ''
      })).filter(row => row.sale_price && row.gla); // Filter out rows without required data

      if (mappedData.length === 0) {
        setError('No valid data found. Please check your column mappings.');
        return;
      }

      onDataImported(mappedData);
      setShowMapping(false);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      setError(`Error importing data: ${error.message}`);
    }
  };

  const resetImport = () => {
    setFileData(null);
    setHeaders([]);
    setShowMapping(false);
    setPreviewData([]);
    setError('');
    setDetectionMethod('');
    setConfidence({});
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div>
      {!showMapping ? (
        <Row>
          <Col md={8}>
            <Form.Group>
              <Form.Label>Select CSV or Excel file to import</Form.Label>
              <Form.Control
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
              />
              <Form.Text className="text-muted">
                Supported formats: CSV, Excel (.xlsx, .xls)
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>
      ) : (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5>Map Your Columns</h5>
            <div>
              {(mapping.sale_price || mapping.gla || mapping.address) && (
                <div className="d-flex align-items-center">
                  <small className="text-success me-2">
                    ✓ Auto-detected using {detectionMethod}
                  </small>
                  {Object.keys(confidence).length > 0 && (
                    <small className="text-muted">
                      (Confidence: {Math.round(Math.max(...Object.values(confidence)) * 100)}%)
                    </small>
                  )}
                </div>
              )}
              {detectionMethod === 'AI-Powered Analysis' && (
                <div className="text-primary small mb-2">
                  🤖 AI analyzed column content and patterns
                </div>
              )}
              <Button variant="outline-secondary" size="sm" onClick={resetImport}>
                Choose Different File
              </Button>
            </div>
          </div>
          
          <Row className="mb-3">
            <Col md={4}>
              <Form.Group>
                <div className="d-flex justify-content-between align-items-center">
                  <Form.Label>Sale Price Column *</Form.Label>
                  {confidence.sale_price && (
                    <small className="text-success">
                      {Math.round(confidence.sale_price * 100)}% confidence
                    </small>
                  )}
                </div>
                <Form.Select
                  value={mapping.sale_price}
                  onChange={(e) => handleMappingChange('sale_price', e.target.value)}
                >
                  <option value="">Select column...</option>
                  {headers.map((header, idx) => (
                    <option key={idx} value={header}>{header}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <div className="d-flex justify-content-between align-items-center">
                  <Form.Label>GLA Column *</Form.Label>
                  {confidence.gla && (
                    <small className="text-success">
                      {Math.round(confidence.gla * 100)}% confidence
                    </small>
                  )}
                </div>
                <Form.Select
                  value={mapping.gla}
                  onChange={(e) => handleMappingChange('gla', e.target.value)}
                >
                  <option value="">Select column...</option>
                  {headers.map((header, idx) => (
                    <option key={idx} value={header}>{header}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <div className="d-flex justify-content-between align-items-center">
                  <Form.Label>Address Column</Form.Label>
                  {confidence.address && (
                    <small className="text-success">
                      {Math.round(confidence.address * 100)}% confidence
                    </small>
                  )}
                </div>
                <Form.Select
                  value={mapping.address}
                  onChange={(e) => handleMappingChange('address', e.target.value)}
                >
                  <option value="">Select column...</option>
                  {headers.map((header, idx) => (
                    <option key={idx} value={header}>{header}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {previewData.length > 0 && (
            <>
              <h6>Preview (first {previewData.length} rows):</h6>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <Table striped bordered size="sm">
                  <thead>
                    <tr>
                      {headers.map((header, idx) => (
                        <th key={idx} className={
                          header === mapping.sale_price ? 'table-success' :
                          header === mapping.gla ? 'table-info' :
                          header === mapping.address ? 'table-warning' : ''
                        }>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {headers.map((header, colIdx) => (
                          <td key={colIdx} className={
                            header === mapping.sale_price ? 'table-success' :
                            header === mapping.gla ? 'table-info' :
                            header === mapping.address ? 'table-warning' : ''
                          }>
                            {formatCellValue(row[header], header)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}

          <div className="mt-3">
            <Button 
              variant="primary" 
              onClick={handleImport}
              disabled={!mapping.sale_price || !mapping.gla}
            >
              Import Data
            </Button>
            <Form.Text className="text-muted d-block mt-2">
              * Required fields. Green = Sale Price, Blue = GLA, Yellow = Address
            </Form.Text>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}
    </div>
  );
};

export default FileImporter;