# Deployment Guide: Sensitivity Analysis App

This guide covers deploying your Sensitivity Analysis application to Vercel (frontend) and Render.com (backend).

## Architecture Overview

- **Frontend**: React application deployed on Vercel
- **Backend**: Unified Flask API deployed on Render.com (handles both Sensitivity Analysis and GLA Calculator)
- **Features**: Authentication, Sensitivity Analysis, GLA Calculator with AI-powered column detection

## Prerequisites
1. GitHub repository connected to both Render and Vercel
2. Render.com account  
3. Vercel account

## Unified Backend

The backend now contains **both** functionalities in a single Flask application:
- **Sensitivity Analysis**: XML file processing and analysis
- **GLA Calculator**: Comparable property analysis with AI column detection
- **Health Check**: Monitoring endpoint

### API Endpoints:
- `GET /api/health` - Health check
- `POST /api/sensitivity/calculate` - Sensitivity analysis (XML files)
- `POST /api/calculate` - GLA calculations (CSV/Excel files)

## Backend Deployment (Render.com)

### Step 1: Create New Web Service on Render
1. Log into your Render dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository: `sensitivity-analysis-frontend` (or your actual repo name)
5. Configure the service:
   - **Name**: `sensitivity-analysis-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT app:app`

### Step 2: Configure Environment Variables
Add these environment variables in Render:
- `FLASK_ENV`: `production`
- `FLASK_APP`: `app.py`

### Step 3: Deploy
1. Click "Create Web Service"
2. Render will automatically deploy from your GitHub repository
3. **Note the URL provided** (e.g., `https://sensitivity-analysis-backend.onrender.com`)

## Frontend Deployment (Vercel)

### Step 1: Deploy to Vercel
1. Log into your Vercel dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Project Name**: `sensitivity-analysis-app`
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `frontend`
   - **Build and Output Settings**: Use default (build command: `npm run build`, output directory: `build`)

### Step 2: Configure Environment Variables
In Vercel project settings, add these environment variables:
- `REACT_APP_API_URL`: `https://sensitivity-analysis-backend.onrender.com/api/sensitivity/calculate`
- `REACT_APP_GLA_API_URL`: `https://sensitivity-analysis-backend.onrender.com/api/calculate`

**Important**: Replace `sensitivity-analysis-backend.onrender.com` with your actual Render backend URL.

## Update Backend URL

### If your Render backend URL is different:
1. Update the `.env.production` file in the frontend folder
2. Update the `vercel.json` file environment variables  
3. Commit and push changes
4. Both services will auto-deploy

## Verification Steps

### 1. Test Backend API
Visit your Render backend URL + `/api/health`:
```
https://your-backend-url.onrender.com/api/health
```
Should return: `{"status": "ok", "message": "Sensitivity Analysis & GLA API is running"}`

### 2. Test Frontend
1. Visit your Vercel frontend URL
2. Navigate to both Sensitivity Analysis and GLA Calculator pages
3. Test file upload and calculations
4. Verify API calls work (check browser developer tools network tab)

## Troubleshooting

### Common Issues:

1. **CORS Errors**: 
   - Ensure Flask-CORS is properly configured in backend
   - Check that frontend is making requests to correct backend URL

2. **Build Failures**:
   - Check that all dependencies are listed in `requirements.txt` (backend) and `package.json` (frontend)
   - Verify Python version compatibility on Render

3. **Environment Variables**:
   - Ensure production environment variables are set correctly in both Vercel and Render
   - Double-check URLs don't have trailing slashes

4. **Backend Cold Starts**:
   - Render free tier has cold starts - first request may be slow
   - Consider upgrading to paid tier for better performance

## Automatic Deployments

Both services are configured for automatic deployments:
- **Backend**: Deploys when you push to `main` branch (backend folder changes)
- **Frontend**: Deploys when you push to `main` branch (frontend folder changes)

## File Structure Summary

```
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── requirements.txt       # Python dependencies
│   ├── render.yaml           # Render deployment config
│   └── xml_parsing.py        # XML parsing utilities
├── frontend/
│   ├── src/                  # React source code
│   ├── package.json          # Node.js dependencies
│   ├── vercel.json          # Vercel deployment config
│   ├── .env                 # Local development environment
│   └── .env.production      # Production environment variables
└── DEPLOYMENT.md            # This guide
```

## Deployment Checklist

### Before Deploying:
- [ ] Backend health endpoint working locally
- [ ] Frontend builds successfully (`npm run build`)
- [ ] All environment variables configured
- [ ] GitHub repository up to date

### Backend Deployment (Render):
- [ ] Create web service on Render
- [ ] Configure build and start commands
- [ ] Set environment variables
- [ ] Note the backend URL
- [ ] Test health endpoint

### Frontend Deployment (Vercel):
- [ ] Update environment variables with real backend URL
- [ ] Deploy to Vercel
- [ ] Configure build settings
- [ ] Test full application functionality

### Post-Deployment:
- [ ] Test sensitivity analysis functionality
- [ ] Test GLA calculator functionality  
- [ ] Test file upload features
- [ ] Test AI column detection
- [ ] Monitor for any errors in logs
   - **Output Directory**: `build`

4. **Environment Variables** (in Vercel dashboard):
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com/api/calculate
   REACT_APP_GLA_API_URL=https://your-backend-url.onrender.com/api/calculate
   ```

### 3. Custom Domain (Optional)

If you have a custom domain, configure it in Vercel dashboard under Domains.

## Testing Deployment

### Backend Testing
1. Visit `https://your-backend-url.onrender.com/api/health`
2. Should return: `{"status": "ok", "message": "GLA Tool API is running"}`

### Frontend Testing
1. Visit your Vercel URL
2. Test login functionality
3. Test both Sensitivity Analysis and GLA Calculator
4. Verify file upload and AI column detection works

## Configuration Files Summary

### Backend Files Created:
- `requirements.txt` - Python dependencies
- `render.yaml` - Render.com configuration
- `Procfile` - Process definition for deployment
- `.gitignore` - Git ignore patterns

### Frontend Files Created:
- `vercel.json` - Vercel deployment configuration
- `.env.production` - Production environment variables

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Backend already configured with Flask-CORS
2. **API Connection**: Check environment variables match your Render URL
3. **Build Failures**: Ensure all dependencies are in package.json/requirements.txt
4. **Route Issues**: vercel.json handles React Router client-side routing

### Monitoring:
- **Render**: Check logs in Render dashboard
- **Vercel**: Check Function logs in Vercel dashboard

## Costs:
- **Render Free Tier**: 750 hours/month (sufficient for demos)
- **Vercel Hobby**: Free for personal projects

Your app is now ready for production deployment! 🚀