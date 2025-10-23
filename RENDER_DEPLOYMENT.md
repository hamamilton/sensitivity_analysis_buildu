# Render.com Deployment Guide

## Pre-deployment Checklist

1. **Update CORS Origins**: In `backend/application.py`, replace `https://your-frontend-domain.onrender.com` with your actual frontend domain.

2. **Verify Configuration Files**:
   - `render.yaml` - main deployment configuration
   - `backend/requirements.txt` - Python dependencies
   - `backend/runtime.txt` - Python version specification
   - `backend/Procfile` - backup deployment command

## Deployment Steps

### Method 1: Using render.yaml (Recommended)

1. Push your code to GitHub (already done)
2. Go to [Render.com Dashboard](https://dashboard.render.com)
3. Click "New +" -> "Blueprint"
4. Connect your GitHub repository: `sensitivity_analysis_buildu`
5. Render will automatically detect the `render.yaml` file
6. Click "Apply" to deploy

### Method 2: Manual Web Service

1. Go to [Render.com Dashboard](https://dashboard.render.com)
2. Click "New +" -> "Web Service"
3. Connect your GitHub repository: `sensitivity_analysis_buildu`
4. Configure:
   - **Name**: `sensitivity-analysis-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT application:app`

### Environment Variables

Set these in Render dashboard:

- `FLASK_ENV` = `production`
- `FLASK_APP` = `application.py`

## Post-Deployment

1. **Test the API**: Visit your Render URL (e.g., `https://your-app-name.onrender.com`)
2. **Check Health**: Visit `https://your-app-name.onrender.com/api/health`
3. **Update Frontend**: Update your frontend to use the new backend URL

## Troubleshooting

### Common Issues:

1. **Build Fails**: Check the build logs for missing dependencies
2. **App Won't Start**: Verify the start command matches your file structure
3. **CORS Errors**: Update the allowed origins in `application.py`
4. **Health Check Fails**: Ensure `/api/health` endpoint is working

### Logs:

- View deployment logs in Render dashboard
- Check for Python import errors
- Verify all dependencies are in `requirements.txt`

### Test Endpoints:

- Root: `https://your-app.onrender.com/`
- Health: `https://your-app.onrender.com/api/health`
- Token Auth: `POST https://your-app.onrender.com/api/auth/token`
- Sensitivity: `POST https://your-app.onrender.com/api/sensitivity/calculate`
- GLA Calculator: `POST https://your-app.onrender.com/api/calculate`

## Frontend Integration

Once deployed, update your frontend API URLs from:
```javascript
const API_URL = 'http://localhost:8080/api/calculate';
```

To:
```javascript
const API_URL = 'https://your-backend-app.onrender.com/api/calculate';
```

## Free Tier Limitations

- Apps go to sleep after 15 minutes of inactivity
- Cold starts may take 30+ seconds
- 750 hours/month limit (sufficient for development)

For production, consider upgrading to a paid plan for better reliability.