// Production CSP Configuration Example
// Replace localhost with your actual domain in production

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Consider removing 'unsafe-inline' if possible
      imgSrc: ["'self'", "data:", "blob:", "https://your-cdn-domain.com"], // Add your CDN if used
      connectSrc: ["'self'", "wss://your-domain.com"], // Replace with your production WebSocket URL
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [], // Force HTTPS in production
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));
