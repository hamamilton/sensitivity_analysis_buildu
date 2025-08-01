import React from "react";
import PropTypes from "prop-types";
import "./SummaryResultsCard.css";

const SummaryResultsCard = ({ comparables }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const calculateSummaryCounts = () => {
    const includedProperties = comparables.filter((comp) => comp.comp_type !== "Excluded");
    const excludedProperties = comparables.filter((comp) => comp.comp_type === "Excluded");

    return {
      includedCount: includedProperties.length,
      excludedCount: excludedProperties.length,
    };
  };

  if (comparables.length === 0) return null;

  return (
    <div className="card mb-4">
      <div className="card-header">
        <h2>Summary Results</h2>
      </div>
      <div className="card-body">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th></th>
              <th>Pre-Adjustment</th>
              <th>Post-Adjustment</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Maximum Sale Price</td>
              <td>{formatCurrency(Math.max(...comparables.map(c => c.pre_adj)))}</td>
              <td>{formatCurrency(Math.max(...comparables.map(c => c.post_adj)))}</td>
            </tr>
            <tr>
              <td>Minimum Sale Price</td>
              <td>{formatCurrency(Math.min(...comparables.map(c => c.pre_adj)))}</td>
              <td>{formatCurrency(Math.min(...comparables.map(c => c.post_adj)))}</td>
            </tr>
            <tr>
              <td>Average Sale Price</td>
              <td>{formatCurrency(comparables.reduce((sum, c) => sum + c.pre_adj, 0) / comparables.length)}</td>
              <td>{formatCurrency(comparables.reduce((sum, c) => sum + c.post_adj, 0) / comparables.length)}</td>
            </tr>
            <tr>
              <td>Included Properties</td>
              <td colSpan="2">{calculateSummaryCounts().includedCount}</td>
            </tr>
            <tr>
              <td>Excluded Properties</td>
              <td colSpan="2">{calculateSummaryCounts().excludedCount}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

SummaryResultsCard.propTypes = {
  comparables: PropTypes.array.isRequired,
};

export default SummaryResultsCard;