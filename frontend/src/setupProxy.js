// const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy configuration disabled - using direct API calls to deployed backend
  // app.use(
  //   '/api/calculate',
  //   createProxyMiddleware({
  //     target: 'http://localhost:5000',
  //     changeOrigin: true,
  //     logLevel: 'debug', // Enable debug logging
  //     onProxyReq: (proxyReq, req, res) => {
  //       console.log('Proxying request to:', req.url);
  //     },
  //   })
  // );
};

