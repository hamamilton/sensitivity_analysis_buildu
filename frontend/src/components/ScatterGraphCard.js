import React from 'react';
import { Scatter } from 'react-chartjs-2';
import './ScatterGraphCard.css';

const ScatterGraphCard = ({ scatterData, scatterOptions }) => {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <h2>Adjustment Directions</h2>
      </div>
      <div className="card-body">
        {scatterData ? (
          <Scatter data={scatterData} options={scatterOptions} />
        ) : (
          <p>No data available for the scatter graph.</p>
        )}
      </div>
    </div>
  );
};

export default ScatterGraphCard;