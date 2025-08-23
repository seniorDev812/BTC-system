const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const config = require('./config');
const deltaExchangeService = require('./services/deltaExchangeService');
const optionsCalculator = require('./services/optionsCalculator');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.cors.origin,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global variables
let currentBTCPrice = 50000; // Default price
let optionsData = [];
let marketData = {};

// Initialize Delta Exchange connection
deltaExchangeService.connectWebSocket();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial data
  socket.emit('btcPrice', currentBTCPrice);
  socket.emit('optionsData', optionsData);
  socket.emit('marketData', marketData);

  // Subscribe to real-time updates
  const subscriptionId = deltaExchangeService.subscribe((data) => {
    socket.emit('marketUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    deltaExchangeService.unsubscribe(subscriptionId);
  });

  socket.on('calculateStrategy', (strategy) => {
    try {
      const metrics = optionsCalculator.calculateStrategyMetrics(strategy, currentBTCPrice);
      socket.emit('strategyCalculated', metrics);
    } catch (error) {
      socket.emit('calculationError', { error: error.message });
    }
  });

  socket.on('calculateOption', (option) => {
    try {
      const metrics = optionsCalculator.calculateOptionMetrics(option, currentBTCPrice);
      socket.emit('optionCalculated', metrics);
    } catch (error) {
      socket.emit('calculationError', { error: error.message });
    }
  });
});

// API Routes

// Get all BTC options and futures
app.get('/api/products', async (req, res) => {
  try {
    const products = await deltaExchangeService.getBTCOptionsAndFutures();
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get market data for all products
app.get('/api/market-data', async (req, res) => {
  try {
    const response = await fetch(`${config.deltaExchange.apiUrl}/v2/tickers`);
    const data = await response.json();
    const btcTickers = data.result.filter(ticker => 
      ticker.symbol.includes('BTC') && 
      (ticker.symbol.includes('C') || ticker.symbol.includes('P') || ticker.symbol.includes('PERP'))
    );
    
    marketData = btcTickers.reduce((acc, ticker) => {
      acc[ticker.symbol] = ticker;
      return acc;
    }, {});
    
    res.json({ success: true, data: marketData });
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get order book for a specific product
app.get('/api/orderbook/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { depth = 20 } = req.query;
    const orderbook = await deltaExchangeService.getOrderBook(productId, depth);
    res.json({ success: true, data: orderbook });
  } catch (error) {
    console.error('Error fetching order book:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get historical data for backtesting
app.get('/api/historical/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { interval = '1D', limit = 100 } = req.query;
    const historicalData = await deltaExchangeService.getHistoricalData(productId, interval, limit);
    res.json({ success: true, data: historicalData });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Calculate option metrics
app.post('/api/calculate/option', (req, res) => {
  try {
    const { option, currentPrice } = req.body;
    const metrics = optionsCalculator.calculateOptionMetrics(option, currentPrice || currentBTCPrice);
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error calculating option metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Calculate strategy metrics
app.post('/api/calculate/strategy', (req, res) => {
  try {
    const { strategy, currentPrice } = req.body;
    const metrics = optionsCalculator.calculateStrategyMetrics(strategy, currentPrice || currentBTCPrice);
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error calculating strategy metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get implied volatility
app.post('/api/calculate/iv', (req, res) => {
  try {
    const { S, K, T, r, marketPrice, optionType } = req.body;
    const iv = optionsCalculator.calculateImpliedVolatility(S, K, T, r, marketPrice, optionType);
    res.json({ success: true, data: { impliedVolatility: iv } });
  } catch (error) {
    console.error('Error calculating implied volatility:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Greeks
app.post('/api/calculate/greeks', (req, res) => {
  try {
    const { S, K, T, r, sigma, optionType } = req.body;
    const greeks = optionsCalculator.calculateGreeks(S, K, T, r, sigma, optionType);
    res.json({ success: true, data: greeks });
  } catch (error) {
    console.error('Error calculating Greeks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    btcPrice: currentBTCPrice
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: error.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Start server
const PORT = config.server.port;
server.listen(PORT, () => {
  console.log(`🚀 BTC Options Simulator Server running on port ${PORT}`);
  console.log(`📊 Delta Exchange API: ${config.deltaExchange.apiUrl}`);
  console.log(`🔗 WebSocket: ${config.deltaExchange.wsUrl}`);
  console.log(`🌐 CORS Origin: ${config.cors.origin}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  deltaExchangeService.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  deltaExchangeService.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
