import React from "react";
import "./UploadCard.css";

const UploadCard = ({ onFileChange, onSubmit, error }) => {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <h2>Upload XML File</h2>
      </div>
      <div className="card-body">
        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <input
              type="file"
              className="form-control"
              onChange={onFileChange}
              accept=".xml"
            />
          </div>
          <div className="d-flex justify-content-between">
            <button type="submit" className="btn btn-primary">
              Begin Analysis
            </button>
            <button type="button" className="btn btn-secondary" onClick={onReset}>
              Reset Calculator
            </button>
          </div>
        </form>
        {error && <p className="text-danger mt-3">{error}</p>}
      </div>
    </div>
  );
};

export default UploadCard;