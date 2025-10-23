# GoHighLevel Integration Guide

This document explains how to integrate your GoHighLevel system with the BuildU Property Analysis app to bypass the email entry form. The app also supports non-GoHighLevel users through multiple access methods.

## Access Methods Overview

The app supports four different authentication methods:

1. **GoHighLevel Email Parameter** - Direct email in URL
2. **GoHighLevel Token-Based** - Secure token authentication  
3. **Manual Email Entry** - Standard form for non-GHL users
4. **Guest Access** - Anonymous usage without email

## Method 1: Direct Email Parameter (Simple)

### From GoHighLevel
Link users directly to your app with their email in the URL:

```
https://your-app-domain.com/sensitivity-analysis?email=user@example.com
https://your-app-domain.com/gla-calculator?email=user@example.com
```

### Example GoHighLevel Link Setup
In your GoHighLevel workflows, funnels, or calendars, use dynamic links:
```
https://your-app-domain.com/sensitivity-analysis?email={{contact.email}}
```

### How It Works
1. User clicks link from GoHighLevel
2. App automatically logs them in with the provided email
3. URL parameters are cleaned from the browser address bar
4. User proceeds directly to the tool without entering email

## Method 2: Token-Based Authentication (Secure)

### From GoHighLevel
For enhanced security, encode user data in a token:

```javascript
// In GoHighLevel custom code or webhook
const userData = {
  email: "user@example.com",
  timestamp: Date.now(),
  // Add other user data as needed
};

const token = btoa(JSON.stringify(userData)); // Base64 encode
const link = `https://your-app-domain.com/sensitivity-analysis?token=${token}`;
```

### Example Token Generation (Node.js/PHP/Python)

#### JavaScript (Node.js)
```javascript
function generateUserToken(email) {
  const userData = {
    email: email,
    timestamp: Date.now()
  };
  return Buffer.from(JSON.stringify(userData)).toString('base64');
}

const token = generateUserToken("user@example.com");
const link = `https://your-app-domain.com/gla-calculator?token=${token}`;
```

#### PHP
```php
function generateUserToken($email) {
    $userData = [
        'email' => $email,
        'timestamp' => time()
    ];
    return base64_encode(json_encode($userData));
}

$token = generateUserToken("user@example.com");
$link = "https://your-app-domain.com/sensitivity-analysis?token=" . $token;
```

#### Python
```python
import json
import base64
import time

def generate_user_token(email):
    user_data = {
        'email': email,
        'timestamp': int(time.time())
    }
    return base64.b64encode(json.dumps(user_data).encode()).decode()

token = generate_user_token("user@example.com")
link = f"https://your-app-domain.com/gla-calculator?token={token}"
```

### How Token Method Works
1. GoHighLevel generates a base64-encoded token containing user data
2. User clicks link with token parameter
3. App validates token with backend API
4. If valid, user is automatically logged in
5. URL parameters are cleaned from browser address bar

## Method 3: Webhook Integration (Advanced)

### Set Up Webhook in GoHighLevel
Create a webhook that sends user data when they should access the app:

```json
{
  "event": "contact_tagged",
  "contact": {
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "tag": "access_property_tools"
}
```

### Backend Webhook Handler
The app can receive webhooks and generate secure access links:

```python
@app.route('/api/webhook/ghl', methods=['POST'])
def handle_ghl_webhook():
    data = request.get_json()
    
    if data.get('event') == 'contact_tagged':
        email = data['contact']['email']
        
        # Generate secure token
        token = generate_secure_token(email)
        
        # Send email with access link or return link for redirect
        access_link = f"https://your-app.com/sensitivity-analysis?token={token}"
        
        return jsonify({'access_link': access_link})
```

## Non-GoHighLevel Users

### Manual Email Entry
Non-GoHighLevel users can access the app by:
1. Visiting the app directly: `https://your-app-domain.com`
2. Clicking "Login" in the navigation
3. Entering their email address in the form
4. Accessing all tools normally

### Guest Access
For truly anonymous usage:
1. Visit the login page
2. Click "Continue as Guest" 
3. Access tools without providing any email
4. Note: Work is not saved and session expires when browser closes

### Direct Tool Access
Non-authenticated users visiting protected routes are automatically redirected to the login page with options to:
- Enter their email
- Continue as guest
- See helpful error messages if coming from expired GoHighLevel links

## User Experience Flow

### GoHighLevel Users
```
GHL Link → Auto Login → Direct Tool Access
```

### Non-GoHighLevel Users  
```
App URL → Login Page → Email Entry OR Guest → Tool Access
```

### Failed GoHighLevel Authentication
```
Invalid GHL Link → Login Page + Error Message → Manual Entry → Tool Access
```

## Visual Indicators

The app shows subtle indicators in the navigation to identify authentication method:
- 👤 Direct email entry or guest access
- 🔗 GoHighLevel authentication
- "Guest User" label for anonymous access

## Implementation Examples

### GoHighLevel Custom Action
```javascript
// Custom Action in GoHighLevel workflow
const contactEmail = "{{contact.email}}";
const toolUrl = "https://your-app-domain.com/sensitivity-analysis?email=" + encodeURIComponent(contactEmail);

// Redirect user or send link
window.open(toolUrl, '_blank');
```

### GoHighLevel Email Template
```html
<!-- In GoHighLevel email template -->
<a href="https://your-app-domain.com/gla-calculator?email={{contact.email}}" 
   style="background: #1a365d; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
   Access Your GLA Calculator
</a>
```

### GoHighLevel SMS Template
```
Hi {{contact.first_name}}! Access your property analysis tools here: 
https://your-app-domain.com/sensitivity-analysis?email={{contact.email}}
```

## Security Considerations

### For Email Parameter Method
- Use HTTPS only
- Consider IP restrictions if needed
- Monitor for abuse

### For Token Method
- Tokens include timestamps for expiration
- Consider adding signature validation
- Use environment variables for secrets
- Implement rate limiting

### Example Enhanced Token Security
```javascript
const crypto = require('crypto');

function generateSecureToken(email, secret) {
  const userData = {
    email: email,
    timestamp: Date.now(),
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  
  const payload = JSON.stringify(userData);
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  
  const tokenData = {
    payload: payload,
    signature: signature
  };
  
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}
```

## Testing

### Test Direct Email Link
```
https://localhost:3000/sensitivity-analysis?email=test@example.com
```

### Test Token Link
```javascript
// Generate test token
const testToken = btoa(JSON.stringify({email: "test@example.com"}));
console.log(`http://localhost:3000/gla-calculator?token=${testToken}`);
```

## Deployment URLs

Update these URLs when deploying:

- **Development**: `http://localhost:3000`
- **Production**: `https://your-production-domain.com`

## Support

For integration support or custom requirements, contact the development team.