import React, { useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap CSS
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement, // Import LineElement
  Tooltip,
  Legend,
} from "chart.js";
import { Scatter } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const SensitivityCalculator = () => {
  const [file, setFile] = useState(null);
  const [subjectProperty, setSubjectProperty] = useState(null);
  const [comparables, setComparables] = useState([]);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        "http://localhost:8080/api/calculate",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data.subject_property && res.data.comparables) {
        setSubjectProperty(res.data.subject_property);
        setComparables(res.data.comparables);
        setError(null);
      } else {
        setError(res.data.error || "An error occurred.");
        setSubjectProperty(null);
        setComparables([]);
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "An error occurred while uploading the file."
      );
      setSubjectProperty(null);
      setComparables([]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSubjectProperty(null);
    setComparables([]);
    setError(null);
  };

  const scatterData = () => {
    if (!comparables.length) return null;

    // Filter out listing properties
    const salesOnly = comparables.filter((comp) => comp.comp_type === "Sale");

    // Function to create a custom rotated triangle canvas
    const createRotatedTriangle = (rotation) => {
      const size = 10; // Size of the triangle
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = size * 2;
      canvas.height = size * 2;
      ctx.translate(size, size); // Move to the center of the canvas
      ctx.rotate(rotation); // Rotate the triangle
      ctx.beginPath();
      ctx.moveTo(0, -size); // Top point
      ctx.lineTo(size, size); // Bottom-right point
      ctx.lineTo(-size, size); // Bottom-left point
      ctx.closePath();
      ctx.fillStyle = "blue"; // Set the fill color
      ctx.fill();
      return canvas;
    };

    // Predefine upward and downward triangles
    const upwardTriangle = createRotatedTriangle(0); // No rotation
    const downwardTriangle = createRotatedTriangle(Math.PI); // 180-degree rotation

    const preAdjPoints = salesOnly.map((comp, index) => ({
      x: index + 1,
      y: comp.pre_adj,
      address: comp.address,
      postAdj: comp.post_adj,
      percentChange: (comp.post_adj - comp.pre_adj) / comp.pre_adj,
      pointStyle:
        comp.post_adj > comp.pre_adj ? upwardTriangle : downwardTriangle, // Use predefined triangles
    }));

    const postAdjPoints = salesOnly.map((comp, index) => ({
      x: index + 1,
      y: comp.post_adj,
      address: comp.address,
      preAdj: comp.pre_adj,
      percentChange: (comp.post_adj - comp.pre_adj) / comp.pre_adj,
      pointStyle: "circle", // Post-adjustment points are always circles
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
          pointStyle: preAdjPoints.map((point) => point.pointStyle), // Apply triangle orientation
          radius: 10, // Increase the size of the triangles
        },
        {
          label: "Post-Adjustment Sale Price",
          data: postAdjPoints,
          backgroundColor: "green",
          pointStyle: "circle", // Post-adjustment points are always circles
          radius: 10, // Increase the size of the circles
        },
        {
          label: `Subject Sale Price: ${formatCurrency(
            subjectProperty?.pre_adj || 0
          )}`,
          data: subjectLine,
          borderColor: "red",
          borderWidth: 2,
          pointRadius: 0, // Hide points for the line
          type: "line", // Render as a line
        },
      ],
    };
  };

  const formatCurrency = (value) => {
    if (value === "N/A") return value; // Handle "N/A" values
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatPercent = (value, multiplyBy100 = true) => {
    if (value === "N/A") return value; // Handle "N/A" values
    const percentValue = multiplyBy100
      ? parseFloat(value) * 100
      : parseFloat(value);
    return `${percentValue.toFixed(2)}%`; // Format to 2 decimal points
  };

  const scatterOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const datasetLabel = context.dataset.label;
            const dataPoint = context.raw || {};

            // Check if the dataset is the Subject Sale Price line
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

        // Draw lines between pre- and post-adjustment points
        const preDataset = data.datasets[0].data; // Pre-Adjustment
        const postDataset = data.datasets[1].data; // Post-Adjustment

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
          stepSize: 1, // Set step size to 1
          min: 1, // Start the x-axis at 1 to hide step "0"
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
        radius: 10, // Increase the size of the dots
        hoverRadius: 10,
      },
    },
  };

  const calculateSummaryCounts = () => {
    const includedProperties = comparables.filter(
      (comp) => comp.comp_type !== "Excluded"
    );
    const excludedProperties = comparables.filter(
      (comp) => comp.comp_type === "Excluded"
    );

    return {
      includedCount: includedProperties.length,
      excludedCount: excludedProperties.length,
    };
  };

  return (
    <div>
      {/* Sticky Header */}
      <header className="sticky-top bg-white py-2 px-3 d-flex align-items-center justify-content-between">
        <div
          className="d-flex align-items-center justify-content-between"
        >
          <img
            src="https://assets.cdn.filesafe.space/xGgJgGxEsn51FF3WiUUW/media/fdddef9b-ce73-4ab0-889a-bb6218f0ec47.png"
            alt="BuildU Logo"
            className="me-2" 
            style={{ width: "300px", height: "auto" }}
          />
          
        </div>
        {/* Print Page Button */}
        <button
          className="btn btn-primary"
          onClick={() => window.print()}
          style={{ height: "40px" }}
        >
          Print Page
        </button>
      </header>

      {/* Main Content */}
      <div className="container mt-4">
        {/* Page Title */}
        <h1 className="mb-4 text-center">Adjustment Sensitivity Analysis</h1>
        {/* Upload Form Card */}
        <div className="card mb-4 border-primary">
          <div className="card-header text-white bg-primary">
            <h2>Upload Appraisal (MISMO) File</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <input
                  type="file"
                  className="form-control"
                  onChange={handleFileChange}
                  accept=".xml"
                />
              </div>
              <div className="d-flex justify-content-between">
                <button type="submit" className="btn btn-primary">
                  Begin Analysis
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleReset}
                >
                  Reset Calculator
                </button>
              </div>
            </form>
            {error && <p className="text-danger mt-3">{error}</p>}
          </div>
        </div>

        {/* Results Summary Card */}
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

        {/* Analysis Explanation Card */}
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

        {/* Scatter Plot Card */}
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

        {/* Properties List Card */}
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
                      </td>{" "}
                      {/* Do not multiply by 100 */}
                      <td>{comp.sale_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SensitivityCalculator;
