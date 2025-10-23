import React, { useState, useCallback, useMemo } from 'react';

// Get required fields based on analysis type
const getRequiredFields = (analysisType) => {
  if (analysisType === 'ratterman') {
    return ['sale_price', 'gla', 'address'];
  }
  return ['sale_price', 'gla', 'address'];  // Both use same backend fields now
};

const getFieldDisplayName = (field) => {
  const displayNames = {
    'sale_price': 'Sale Price',
    'price': 'Price',
    'gla': 'GLA (Square Feet)',
    'address': 'Address'
  };
  return displayNames[field] || field;
};

const getFieldDescription = (field) => {
  const descriptions = {
    'sale_price': 'The final sale price of the property',
    'price': 'The price or value of the property',
    'gla': 'Gross Living Area in square feet',
    'address': 'Property address or identifier'
  };
  return descriptions[field] || '';
};

const ColumnMappingModal = ({ 
  isOpen, 
  onClose, 
  columnAnalysis, 
  onConfirmMapping,
  analysisType = 'gla' // 'gla' or 'ratterman'
}) => {
  const [selectedMappings, setSelectedMappings] = useState({});
  const [errors, setErrors] = useState([]);

  const handleMappingChange = (field, selectedColumn) => {
    setSelectedMappings(prev => ({
      ...prev,
      [field]: selectedColumn
    }));
  };

  const validateMappings = useCallback(() => {
    const requiredFields = getRequiredFields(analysisType);
    const newErrors = [];
    
    for (const field of requiredFields) {
      if (!selectedMappings[field]) {
        newErrors.push(`Please select a column for ${getFieldDisplayName(field)}`);
      }
    }
    
    // Check for duplicate mappings
    const mappedColumns = Object.values(selectedMappings).filter(Boolean);
    const duplicates = mappedColumns.filter((column, index) => 
      mappedColumns.indexOf(column) !== index
    );
    
    if (duplicates.length > 0) {
      newErrors.push(`Columns cannot be mapped to multiple fields: ${duplicates.join(', ')}`);
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  }, [selectedMappings, analysisType]);

  // Memoize if mappings are valid to prevent re-renders
  const isValid = useMemo(() => {
    const requiredFields = getRequiredFields(analysisType);
    
    // Check if all required fields are mapped
    const allMapped = requiredFields.every(field => selectedMappings[field]);
    if (!allMapped) return false;
    
    // Check for duplicates
    const mappedColumns = Object.values(selectedMappings).filter(Boolean);
    const hasDuplicates = mappedColumns.length !== new Set(mappedColumns).size;
    
    return !hasDuplicates;
  }, [selectedMappings, analysisType]);

  const handleConfirm = () => {
    if (validateMappings()) {
      onConfirmMapping(selectedMappings);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedMappings({});
    setErrors([]);
    onClose();
  };

  // Initialize mappings with AI suggestions when modal opens
  React.useEffect(() => {
    if (isOpen && columnAnalysis?.potential_mappings) {
      const initialMappings = {};
      const requiredFields = getRequiredFields(analysisType);
      
      for (const field of requiredFields) {
        const mappingData = columnAnalysis.potential_mappings[field];
        if (mappingData?.best_match) {
          initialMappings[field] = mappingData.best_match;
        }
      }
      
      setSelectedMappings(initialMappings);
    }
  }, [isOpen, columnAnalysis, analysisType]);

  if (!isOpen || !columnAnalysis) return null;

  const requiredFields = getRequiredFields(analysisType);

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-columns me-2"></i>
              Column Mapping Required
            </h5>
          </div>
          
          <div className="modal-body">
            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>
              We found <strong>{columnAnalysis.total_comparables}</strong> rows of data, but need help mapping your columns. 
              Please verify the suggested mappings below or choose different columns.
            </div>

            {errors.length > 0 && (
              <div className="alert alert-danger">
                <strong>Please fix the following issues:</strong>
                <ul className="mb-0 mt-2">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="row">
              {requiredFields.map(field => {
                const mappingData = columnAnalysis.potential_mappings[field];
                const hasGoodMatch = mappingData?.confidence > 0.8;
                
                return (
                  <div key={field} className="col-12 mb-4">
                    <div className={`card ${hasGoodMatch ? 'border-success' : 'border-warning'}`}>
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{getFieldDisplayName(field)}</strong>
                          <small className="text-muted d-block">{getFieldDescription(field)}</small>
                        </div>
                        {hasGoodMatch && (
                          <span className="badge bg-success">
                            <i className="fas fa-check me-1"></i>
                            High Confidence
                          </span>
                        )}
                      </div>
                      
                      <div className="card-body">
                        <div className="form-group">
                          <label className="form-label">Select Column:</label>
                          <select 
                            className="form-select"
                            value={selectedMappings[field] || ''}
                            onChange={(e) => handleMappingChange(field, e.target.value)}
                          >
                            <option value="">-- Choose a column --</option>
                            {mappingData?.candidates.map(candidate => (
                              <option 
                                key={candidate.column} 
                                value={candidate.column}
                              >
                                {candidate.column}
                                {candidate.confidence > 0.7 && ' ⭐ (Recommended)'}
                                {candidate.sample_value && ` - Sample: "${candidate.sample_value}"`}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {mappingData?.candidates.length === 0 && (
                          <div className="alert alert-warning mt-2">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            No suitable columns found for this field. Please check your data.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!columnAnalysis.analysis_feasible && (
              <div className="alert alert-warning">
                <i className="fas fa-exclamation-triangle me-2"></i>
                <strong>Data Quality Note:</strong> You have {columnAnalysis.total_comparables} comparables. 
                For reliable analysis, we recommend at least {columnAnalysis.recommended_minimum} comparables.
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleConfirm}
              disabled={!isValid}
            >
              <i className="fas fa-check me-2"></i>
              Confirm Mapping & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnMappingModal;