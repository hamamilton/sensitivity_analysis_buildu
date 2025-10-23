import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap CSS
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineController,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Scatter } from "react-chartjs-2";

// Register Chart.js components with the corrected capitalization
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineController, // Corrected from 'Linecontroller'
  LineElement,
  Tooltip,
  Legend
);

const SensitivityCalculator = ({ userEmail, initialFile, onReset }) => {
  const [subjectProperty, setSubjectProperty] = useState(null);
  const [comparables, setComparables] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('SensitivityCalculator - Received Email:', userEmail);
    console.log('SensitivityCalculator - Received Initial File:', initialFile);
  }, [userEmail, initialFile]);

  // Process uploaded file when initialFile changes
  useEffect(() => {
    const processUploadedFile = async () => {
      if (!initialFile) return;

      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', initialFile);

        const response = await axios({
          method: 'post',
          url: 'http://localhost:8080/api/sensitivity/calculate',
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000  // Increased to 60 seconds for Render cold starts
        });

        if (response.data) {
          setSubjectProperty(response.data.subject_property);
          setComparables(response.data.comparables);
        } else {
          setError('No data received from the server');
        }
      } catch (err) {
        console.error('File processing error:', err);
        
        if (err.response) {
          console.error('Server responded with:', err.response.data);
          console.error('Status code:', err.response.status);
          setError(`Server error: ${err.response.data.message || 'Unknown error'}`);
        } else if (err.request) {
          console.error('No response received:', err.request);
          setError('No response from server. Please check your network connection.');
        } else {
          console.error('Error setting up request:', err.message);
          setError(`Request setup error: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    processUploadedFile();
  }, [initialFile]);

  const scatterData = () => {
    if (!comparables.length) return null;

    const salesOnly = comparables.filter((comp) => comp.comp_type === "Sale");

    const createRotatedTriangle = (rotation) => {
      const size = 10;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = size * 2;
      canvas.height = size * 2;
      ctx.translate(size, size);
      ctx.rotate(rotation);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, size);
      ctx.lineTo(-size, size);
      ctx.closePath();
      ctx.fillStyle = "blue";
      ctx.fill();
      return canvas;
    };

    const upwardTriangle = createRotatedTriangle(0);
    const downwardTriangle = createRotatedTriangle(Math.PI);

    const preAdjPoints = salesOnly.map((comp, index) => ({
      x: index + 1,
      y: comp.pre_adj,
      address: comp.address,
      postAdj: comp.post_adj,
      percentChange: (comp.post_adj - comp.pre_adj) / comp.pre_adj,
      pointStyle:
        comp.post_adj > comp.pre_adj ? upwardTriangle : downwardTriangle,
    }));

    const postAdjPoints = salesOnly.map((comp, index) => ({
      x: index + 1,
      y: comp.post_adj,
      address: comp.address,
      preAdj: comp.pre_adj,
      percentChange: (comp.post_adj - comp.pre_adj) / comp.pre_adj,
      pointStyle: "circle",
    }));

    const subjectLine = Array.from(
      { length: salesOnly.length + 1 },
      (_, i) => ({
        x: i,
        y: subjectProperty?.pre_adj || 0,
      })
    );

    return {
      datasets: [
        {
          label: "Pre-Adjustment Sale Price",
          data: preAdjPoints,
          backgroundColor: "blue",
          pointStyle: preAdjPoints.map((point) => point.pointStyle),
          radius: 10,
        },
        {
          label: "Post-Adjustment Sale Price",
          data: postAdjPoints,
          backgroundColor: "green",
          pointStyle: "circle",
          radius: 10,
        },
        {
          label: `Subject Sale Price: ${formatCurrency(
            subjectProperty?.pre_adj || 0
          )}`,
          data: subjectLine,
          borderColor: "red",
          borderWidth: 2,
          pointRadius: 0,
          type: "line",
        },
      ],
    };
  };

  const formatCurrency = (value) => {
    if (value === "N/A") return value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatPercent = (value, multiplyBy100 = true) => {
    if (value === "N/A") return value;
    const percentValue = multiplyBy100
      ? parseFloat(value) * 100
      : parseFloat(value);
    return `${percentValue.toFixed(2)}%`;
  };

  const scatterOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const datasetLabel = context.dataset.label;
            const dataPoint = context.raw || {};

            if (datasetLabel === "Subject Sale Price") {
              return `Subject Property Sold Price: ${formatCurrency(
                dataPoint.y
              )}`;
            }

            return [
              `Address: ${dataPoint.address || "N/A"}`,
              `Pre-Adjustment Sale Price: ${formatCurrency(
                dataPoint.preAdj || dataPoint.y || 0
              )}`,
              `Post-Adjustment Sale Price: ${formatCurrency(
                dataPoint.postAdj || dataPoint.y || 0
              )}`,
              `Percent Change: ${formatPercent(dataPoint.percentChange || 0)}`,
            ];
          },
        },
      },
      afterDatasetsDraw: (chart) => {
        const { ctx, data } = chart;
        const preDataset = data.datasets[0].data;
        const postDataset = data.datasets[1].data;

        ctx.save();
        ctx.strokeStyle = "gray";
        ctx.lineWidth = 1;

        preDataset.forEach((prePoint, index) => {
          const postPoint = postDataset[index];
          if (prePoint && postPoint) {
            const x1 = chart.scales.x.getPixelForValue(prePoint.x);
            const y1 = chart.scales.y.getPixelForValue(prePoint.y);
            const x2 = chart.scales.x.getPixelForValue(postPoint.x);
            const y2 = chart.scales.y.getPixelForValue(postPoint.y);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        });

        ctx.restore();
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Comparable Sales",
        },
        ticks: {
          stepSize: 1,
          min: 1,
        },
      },
      y: {
        title: {
          display: true,
          text: "Sale Price",
        },
      },
    },
    elements: {
      point: {
        radius: 10,
        hoverRadius: 10,
      },
    },
  };

  return (
    <div className="container mt-5">
      {loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p>Processing your file...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : !subjectProperty || comparables.length === 0 ? (
        <div className="alert alert-warning" role="alert">
          No data available. Please ensure you've uploaded a valid XML file.
        </div>
      ) : (
        <div className="container-fluid mt-5">
          <h1 className="mb-4 text-center">Adjustment Sensitivity Analysis</h1>
          <div className="row justify-content-center">
            <div className="col-lg-10 col-md-12">
              {comparables.length > 0 && (
                <div className="card mb-4 border-info">
                  <div className="card-header text-white bg-info">
                    <h2>Summary Results</h2>
                  </div>
                  <div className="card-body">
                    <table className="table table-bordered table-responsive">
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
                          <td>
                            {formatCurrency(
                              Math.max(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.pre_adj)
                              )
                            )}
                          </td>
                          <td>
                            {formatCurrency(
                              Math.max(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.post_adj)
                              )
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td>Minimum Sale Price</td>
                          <td>
                            {formatCurrency(
                              Math.min(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.pre_adj)
                              )
                            )}
                          </td>
                          <td>
                            {formatCurrency(
                              Math.min(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.post_adj)
                              )
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td>Range of Sale Prices</td>
                          <td>
                            {formatCurrency(
                              Math.max(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.pre_adj)
                              ) -
                                Math.min(
                                  ...comparables
                                    .filter((c) => c.comp_type === "Sale")
                                    .map((c) => c.pre_adj)
                                )
                            )}
                          </td>
                          <td>
                            {formatCurrency(
                              Math.max(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.post_adj)
                              ) -
                                Math.min(
                                  ...comparables
                                    .filter((c) => c.comp_type === "Sale")
                                    .map((c) => c.post_adj)
                                )
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td>Percent Change</td>
                          <td>
                            {formatPercent(
                              (Math.max(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.pre_adj)
                              ) -
                                Math.min(
                                  ...comparables
                                    .filter((c) => c.comp_type === "Sale")
                                    .map((c) => c.pre_adj)
                                )) /
                                Math.min(
                                  ...comparables
                                    .filter((c) => c.comp_type === "Sale")
                                    .map((c) => c.pre_adj)
                                )
                            )}
                          </td>
                          <td>
                            {formatPercent(
                              (Math.max(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.post_adj)
                              ) -
                                Math.min(
                                  ...comparables
                                    .filter((c) => c.comp_type === "Sale")
                                    .map((c) => c.post_adj)
                                )) /
                                Math.min(
                                  ...comparables
                                    .filter((c) => c.comp_type === "Sale")
                                    .map((c) => c.post_adj)
                                )
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td>Included Properties</td>
                          <td colSpan="2">
                            {comparables.filter((c) => c.comp_type === "Sale").length}
                          </td>
                        </tr>
                        <tr>
                          <td>Excluded Properties (Listings)</td>
                          <td colSpan="2">
                            {comparables.filter((c) => c.comp_type !== "Sale").length}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {comparables.length > 0 && (
                <div className="card mb-4 border-info">
                  <div className="card-header text-white bg-info">
                    <h2>Analysis Explanation</h2>
                  </div>
                  <div className="card-body">
                    <textarea
                      className="form-control"
                      rows="5"
                      readOnly
                      value={`A good indication that the individual adjustments represent the market reaction can be seen in the difference between the pre-adjusted sale price range of ${formatCurrency(
                        Math.max(
                          ...comparables
                            .filter((c) => c.comp_type === "Sale")
                            .map((c) => c.pre_adj)
                        ) -
                          Math.min(
                            ...comparables
                              .filter((c) => c.comp_type === "Sale")
                              .map((c) => c.pre_adj)
                          )
                      )} or ${formatPercent(
                        (Math.max(
                          ...comparables
                            .filter((c) => c.comp_type === "Sale")
                            .map((c) => c.pre_adj)
                        ) -
                          Math.min(
                            ...comparables
                              .filter((c) => c.comp_type === "Sale")
                              .map((c) => c.pre_adj)
                          )) /
                          Math.min(
                            ...comparables
                              .filter((c) => c.comp_type === "Sale")
                              .map((c) => c.pre_adj)
                          )
                      )} to the post-adjusted sale price range of ${formatCurrency(
                        Math.max(
                          ...comparables
                            .filter((c) => c.comp_type === "Sale")
                            .map((c) => c.post_adj)
                        ) -
                          Math.min(
                            ...comparables
                              .filter((c) => c.comp_type === "Sale")
                              .map((c) => c.post_adj)
                          )
                      )} or ${formatPercent(
                        (Math.max(
                          ...comparables
                            .filter((c) => c.comp_type === "Sale")
                            .map((c) => c.post_adj)
                        ) -
                          Math.min(
                            ...comparables
                              .filter((c) => c.comp_type === "Sale")
                              .map((c) => c.post_adj)
                          )) /
                          Math.min(
                            ...comparables
                              .filter((c) => c.comp_type === "Sale")
                              .map((c) => c.post_adj)
                          )
                      )}. The tighter the adjusted range suggests that the adjustments are more credible and reflective of the market.`}
                    ></textarea>
                    <button
                      className="btn btn-primary mt-3"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `A good indication that the individual adjustments represent the market reaction can be seen in the difference between the pre-adjusted sale price range of ${formatCurrency(
                            Math.max(
                              ...comparables
                                .filter((c) => c.comp_type === "Sale")
                                .map((c) => c.pre_adj)
                            ) -
                              Math.min(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.pre_adj)
                              )
                          )} or ${formatPercent(
                            (Math.max(
                              ...comparables
                                .filter((c) => c.comp_type === "Sale")
                                .map((c) => c.pre_adj)
                            ) -
                              Math.min(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.pre_adj)
                              )) /
                              Math.min(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.pre_adj)
                              )
                          )} to the post-adjusted sale price range of ${formatCurrency(
                            Math.max(
                              ...comparables
                                .filter((c) => c.comp_type === "Sale")
                                .map((c) => c.post_adj)
                            ) -
                              Math.min(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.post_adj)
                              )
                          )} or ${formatPercent(
                            (Math.max(
                              ...comparables
                                .filter((c) => c.comp_type === "Sale")
                                .map((c) => c.post_adj)
                            ) -
                              Math.min(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.post_adj)
                              )) /
                              Math.min(
                                ...comparables
                                  .filter((c) => c.comp_type === "Sale")
                                  .map((c) => c.post_adj)
                              )
                          )}. The tighter the adjusted range suggests that the adjustments are more credible and reflective of the market.`
                        );
                        alert("Text copied to clipboard!");
                      }}
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                </div>
              )}

              {scatterData() && (
                <div className="card mb-4 border-info">
                  <div className="card-header bg-info text-white">
                    <h2>Comparable Property Adjustments</h2>
                  </div>
                  <div className="card-body">
                    <Scatter data={scatterData()} options={scatterOptions} />
                  </div>
                </div>
              )}

              {comparables.length > 0 && (
                <div className="card mb-4 border-info">
                  <div className="card-header text-white bg-info">
                    <h2>Comparable Properties</h2>
                  </div>
                  <div className="card-body">
                    <table className="table table-bordered table-responsive">
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
                            <td>
                              {formatPercent(comp.total_adj_percent, false)}
                            </td>
                            <td>{comp.sale_date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Start Over Button */}
              {onReset && (
                <div className="text-center mt-4">
                  <button 
                    className="btn btn-outline-primary btn-lg"
                    onClick={onReset}
                  >
                    <i className="fas fa-arrow-left me-2"></i>
                    Start Over
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SensitivityCalculator;