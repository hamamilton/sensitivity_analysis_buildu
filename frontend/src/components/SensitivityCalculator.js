import React, { useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import UploadCard from "./UploadCard";
import SummaryResultsCard from "./SummaryResultsCard";
import PropertyListCard from "./PropertyListCard";
import ScatterGraphCard from "./ScatterGraphCard";
import "bootstrap/dist/css/bootstrap.min.css";

const SensitivityCalculator = () => {
  const [comparables, setComparables] = useState([]);
  const [subjectProperty, setSubjectProperty] = useState(null);
  const [error, setError] = useState(null);

  const handleDataUpdate = (data) => {
    if (data.subject_property && data.comparables) {
      setSubjectProperty(data.subject_property);
      setComparables(data.comparables);
      setError(null);
    } else {
      setError(data.error || "An error occurred.");
      setSubjectProperty(null);
      setComparables([]);
    }
  };

  return (
    <div className="sensitivity-calculator">
      <Header />
      <div className="container mt-4">
        <UploadCard onDataUpdate={handleDataUpdate} setError={setError} />
        {comparables.length > 0 && (
          <>
            <SummaryResultsCard comparables={comparables} />
            <PropertyListCard comparables={comparables} />
            <ScatterGraphCard comparables={comparables} subjectProperty={subjectProperty} />
          </>
        )}
        {error && <p className="text-danger mt-3">{error}</p>}
      </div>
      <Footer />
    </div>
  );
};

export default SensitivityCalculator;