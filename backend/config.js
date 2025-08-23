module.exports = {
  // Delta Exchange API Configuration
  deltaExchange: {
    apiKey: process.env.DELTA_API_KEY || 'YvaGcy4Rq3vA4GDIA1jcPBW1bckKlW',
    apiSecret: process.env.DELTA_API_SECRET || 'LIy4IJ5DDyi39rUGVHDfcmIj2aj0TdZ5OTJTtBGSg4M8WDsUNbgRKERCR',
    apiUrl: 'https://api.delta.exchange',
    wsUrl: 'wss://api.delta.exchange:2096'
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
};
