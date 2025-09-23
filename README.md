# Sensitivity Analysis Application

A comprehensive real estate analysis tool with AI-powered features for property valuation and GLA (Gross Living Area) calculations.

## 🚀 Features

- **Multi-Page React Application** with authentication
- **Sensitivity Analysis Tool** for property price modeling
- **GLA Calculator** with AI-powered column detection
- **Intelligent File Processing** (CSV/Excel) with automatic column mapping
- **Responsive Bootstrap UI** with professional styling
- **React Router** navigation with protected routes

## 🛠 Technology Stack

### Frontend
- React 19
- React Router DOM
- React Bootstrap
- Chart.js for visualizations
- Papa Parse for CSV processing
- XLSX for Excel file handling
- Axios for API communication

### Backend
- Flask (Python)
- Flask-CORS for cross-origin requests
- Gunicorn for production deployment

## 🏃‍♂️ Quick Start

### Development

1. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

2. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 📁 Project Structure

```
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── contexts/           # React contexts (Auth)
│   │   └── ...
│   ├── public/
│   ├── package.json
│   ├── vercel.json            # Vercel deployment config
│   └── .env.production       # Production environment variables
├── backend/                    # Unified Flask API
│   ├── app.py                # Flask application (Sensitivity + GLA)
│   ├── requirements.txt      # Python dependencies
│   ├── render.yaml          # Render.com deployment config
│   └── Procfile            # Process definition
├── samples/                   # Sample XML files for testing
└── DEPLOYMENT.md           # Deployment guide
```

## 🔑 Key Components

### Authentication System
- Email-based access control
- Protected routes
- Session management via React Context

### AI-Powered Column Detection
- Analyzes file content and headers
- Confidence scoring for mappings
- Smart fallback to pattern matching
- Supports multiple data formats

### GLA Calculator
- Comparable property analysis
- Price per square foot calculations
- Interactive data visualization
- Export capabilities

### Sensitivity Analysis
- Market trend analysis
- Price modeling
- Scenario planning tools

## 🌐 API Endpoints

### Backend (Flask)
- `GET /api/health` - Health check
- `POST /api/calculate` - GLA calculation

## 📊 Data Processing

The application intelligently processes real estate data files:
- **Automatic column detection** using AI analysis
- **Data validation** and cleaning
- **Multiple file format support** (CSV, Excel)
- **Real-time preview** of imported data

## 🎨 UI/UX Features

- **Responsive design** works on all devices
- **Professional styling** with Bootstrap components
- **Interactive charts** for data visualization
- **Real-time feedback** for user actions
- **Loading states** and error handling

## 🔧 Configuration

### Environment Variables

**Frontend (.env.production)**:
```
REACT_APP_API_URL=https://your-backend.onrender.com/api/calculate
REACT_APP_GLA_API_URL=https://your-backend.onrender.com/api/calculate
```

**Backend**:
```
FLASK_ENV=production
FLASK_APP=app.py
PORT=5002
```

## 📈 Performance Optimizations

- **Code splitting** with React lazy loading
- **Static asset caching** via Vercel CDN
- **Optimized bundle size** with tree shaking
- **Compression** enabled for production builds

## 🚀 Deployment Platforms

- **Frontend**: Vercel (Recommended)
- **Backend**: Render.com (Free tier available)

Both platforms offer:
- Automatic deployments from Git
- SSL certificates
- Global CDN
- Monitoring and logs

## 📄 License

This project is proprietary software developed for real estate analysis purposes.

## 🤝 Contributing

This is a private project. For questions or support, contact the development team.

---

Built with ❤️ for real estate professionals