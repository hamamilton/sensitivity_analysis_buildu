# Sensitivity Analysis Application

This project is a React-based application designed to perform sensitivity analysis on real estate properties using XML data files. The application allows users to upload XML files containing property data, analyze the data, and visualize the results through various components.

## Project Structure

The project is organized as follows:

```
frontend
├── public
│   └── index.html          # Main HTML file serving as the entry point
├── src
│   ├── components          # Contains all React components
│   │   ├── Header.js       # Header component with logo and gradient background
│   │   ├── Footer.js       # Footer component with application information
│   │   ├── UploadCard.js    # Component for uploading XML files
│   │   ├── SummaryResultsCard.js # Displays summary results of the analysis
│   │   ├── PropertyListCard.js    # Displays a list of comparable properties
│   │   ├── ScatterGraphCard.js     # Renders the scatter graph
│   │   └── SensitivityCalculator.js # Main container integrating all components
│   ├── styles              # Contains CSS styles for components
│   │   ├── Header.css
│   │   ├── Footer.css
│   │   ├── UploadCard.css
│   │   ├── SummaryResultsCard.css
│   │   ├── PropertyListCard.css
│   │   └── ScatterGraphCard.css
│   ├── App.js              # Main application component
│   └── index.js            # Entry point for the React application
├── package.json            # npm configuration file
└── README.md               # Project documentation
```

## Features

- **File Upload**: Users can upload XML files containing property data for analysis.
- **Data Analysis**: The application processes the uploaded data and calculates various metrics.
- **Visualization**: Results are displayed in a user-friendly format, including summary results and a scatter graph.
- **Responsive Design**: The application is designed to be responsive and user-friendly.

## Getting Started

To get started with the project, follow these steps:

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd frontend
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Run the application**:
   ```
   npm start
   ```

4. **Open your browser** and navigate to `http://localhost:3000` to view the application.

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.