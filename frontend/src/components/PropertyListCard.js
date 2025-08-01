import React from "react";
import PropTypes from "prop-types";
import "./PropertyListCard.css";

const PropertyListCard = ({ comparables, formatCurrency, formatPercent }) => {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <h2>Comparable Properties</h2>
      </div>
      <div className="card-body">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Property Type</th>
              <th>Address</th>
              <th>Pre-Adjustment Amount</th>
              <th>Post-Adjustment Amount</th>
              <th>Comparable Type</th>
              <th>Total Adjustment Percent</th>
              <th>Sale Date</th>
            </tr>
          </thead>
          <tbody>
            {comparables.map((comp, index) => (
              <tr key={index}>
                <td>{comp.property_type}</td>
                <td>{comp.address}</td>
                <td>{formatCurrency(comp.pre_adj)}</td>
                <td>{formatCurrency(comp.post_adj)}</td>
                <td>{comp.comp_type}</td>
                <td>{formatPercent(comp.total_adj_percent)}</td>
                <td>{comp.sale_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

PropertyListCard.propTypes = {
  comparables: PropTypes.array.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  formatPercent: PropTypes.func.isRequired,
};

export default PropertyListCard;