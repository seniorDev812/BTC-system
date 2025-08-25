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
 let currentBTCPrice = 112271.90; // Current realistic BTC price
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
    // Always return mock products for now to ensure data display
    console.log('Generating mock products for display...');
    const mockProducts = [];
    
    // Generate mock BTC options based on Delta Exchange format
    const strikes = [108400, 109000, 110000, 111000, 112000, 113000];
    const expiries = ['250926']; // Format: YYMMDD - September 26th, 2025 (next day)
    
    strikes.forEach(strike => {
      expiries.forEach(expiry => {
        // Call options
        mockProducts.push({
          id: `call_${strike}_${expiry}`,
          symbol: `C-BTC-${strike}-${expiry.replace(/-/g, '')}`,
          contractType: 'call_option',
          strikePrice: strike,
          expirationDate: expiry,
          underlyingAsset: 'BTC',
          tickSize: 0.1,
          lotSize: 1,
          minOrderSize: 0.01,
          maxOrderSize: 1000,
          isActive: true
        });
        
        // Put options
        mockProducts.push({
          id: `put_${strike}_${expiry}`,
          symbol: `P-BTC-${strike}-${expiry.replace(/-/g, '')}`,
          contractType: 'put_option',
          strikePrice: strike,
          expirationDate: expiry,
          underlyingAsset: 'BTC',
          tickSize: 0.1,
          lotSize: 1,
          minOrderSize: 0.01,
          maxOrderSize: 1000,
          isActive: true
        });
      });
    });
    
    // Add futures
    mockProducts.push({
      id: 'futures_1',
      symbol: 'BTC-PERP',
      contractType: 'futures',
      strikePrice: null,
      expirationDate: 'PERP', // Perpetual futures don't expire
      underlyingAsset: 'BTC',
      tickSize: 0.1,
      lotSize: 1,
      minOrderSize: 0.01,
      maxOrderSize: 1000,
      isActive: true
    });
    
    console.log(`Generated ${mockProducts.length} mock products`);
    res.json({ success: true, data: mockProducts, mock: true });
  });

// Get market data for all products
app.get('/api/market-data', async (req, res) => {
  try {
    console.log('Fetching real market data from Delta Exchange...');
    const response = await fetch(`${config.deltaExchange.apiUrl}/v2/tickers`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.result) {
      throw new Error('Invalid response format from Delta Exchange API');
    }
    
    const btcTickers = data.result.filter(ticker => 
      ticker.symbol && ticker.symbol.includes('BTC') && 
      (ticker.symbol.includes('C') || ticker.symbol.includes('P') || ticker.symbol.includes('PERP'))
    );
    
    console.log(`Found ${btcTickers.length} BTC tickers from real API`);
    
    marketData = btcTickers.reduce((acc, ticker) => {
      // Extract data based on the actual Delta Exchange format
      const quotes = ticker.quotes || {};
      
      acc[ticker.symbol] = {
        symbol: ticker.symbol,
        // Price data - use mark_price as the main price
        price: parseFloat(ticker.mark_price) || parseFloat(ticker.close) || 0,
        last_price: parseFloat(ticker.mark_price) || parseFloat(ticker.close) || 0,
        // Bid/Ask from quotes
        bid: parseFloat(quotes.best_bid) || 0,
        ask: parseFloat(quotes.best_ask) || 0,
        best_bid: parseFloat(quotes.best_bid) || 0,
        best_ask: parseFloat(quotes.best_ask) || 0,
        // Volume and OI
        volume_24h: parseFloat(ticker.volume) || parseFloat(ticker.volume_24h) || 0,
        volume: parseFloat(ticker.volume) || 0,
        open_interest: parseFloat(ticker.oi) || parseFloat(ticker.oi_contracts) || 0,
        oi: parseFloat(ticker.oi) || 0,
        // Price changes
        price_24h_change: parseFloat(ticker.price_24h_change) || parseFloat(ticker.change_24h) || 0,
        change_24h: parseFloat(ticker.change_24h) || 0,
        change_24h_percent: parseFloat(ticker.change_24h_percent) || 0,
        // Additional useful fields
        strike_price: parseFloat(ticker.strike_price) || 0,
        contract_type: ticker.contract_type || '',
        underlying_asset_symbol: ticker.underlying_asset_symbol || 'BTC',
        // Keep original data for debugging
        ...ticker
      };
      return acc;
    }, {});
    
    res.json({ success: true, data: marketData });
  } catch (error) {
      console.error('Error fetching market data:', error);
      
      // Always return mock data if API fails
      console.log('API failed, returning mock market data...');
      // Generate comprehensive mock market data
      const mockData = {};
      
             // BTC Perpetual - Use realistic current BTC price
       const btcPrice = 112271.90 + (Math.random() - 0.5) * 200; // Around $112,271.90 (current market price)
       const btcBid = btcPrice - 50 - Math.random() * 100;
       const btcAsk = btcPrice + 50 + Math.random() * 100;
      
      mockData['BTC-PERP'] = {
        symbol: 'BTC-PERP',
        price: btcPrice,
        bid: btcBid,
        ask: btcAsk,
        volume_24h: Math.floor(Math.random() * 1000),
        open_interest: Math.floor(Math.random() * 5000),
        price_24h_change: (Math.random() - 0.5) * 500,
        change_24h: (Math.random() - 0.5) * 500,
        change_24h_percent: (Math.random() - 0.5) * 10,
        // Additional fields for better data structure
        last_price: btcPrice,
        best_bid: btcBid,
        best_ask: btcAsk,
        volume: Math.floor(Math.random() * 1000)
      };
      
      // Generate comprehensive mock data for all BTC options based on Delta Exchange format
      const strikes = [108400, 109000, 110000, 111000, 112000, 113000];
      const expiries = ['250926']; // Format: YYMMDD - September 26th, 2025 (next day)
      
      strikes.forEach(strike => {
        expiries.forEach(expiry => {
          // Call options
          const callSymbol = `C-BTC-${strike}-${expiry}`;
          const callPrice = 2800 + (Math.random() - 0.5) * 400;
          const callBid = callPrice - 50 - Math.random() * 100;
          const callAsk = callPrice + 50 + Math.random() * 100;
          
          mockData[callSymbol] = {
            symbol: callSymbol,
            price: callPrice,
            last_price: callPrice,
            bid: callBid,
            ask: callAsk,
            best_bid: callBid,
            best_ask: callAsk,
            volume_24h: 0.38 + Math.random() * 2,
            volume: 0.38 + Math.random() * 2,
            open_interest: 1.6 + Math.random() * 5,
            oi: (1.6 + Math.random() * 5).toFixed(4),
            price_24h_change: 0,
            change_24h: 0,
            change_24h_percent: 0,
            strike_price: strike.toString(),
            contract_type: 'call_options',
            underlying_asset_symbol: 'BTC'
          };
          
          // Put options
          const putSymbol = `P-BTC-${strike}-${expiry}`;
          const putPrice = 2856 + (Math.random() - 0.5) * 300;
          const putBid = putPrice - 30 - Math.random() * 60;
          const putAsk = putPrice + 30 + Math.random() * 60;
          
          mockData[putSymbol] = {
            symbol: putSymbol,
            price: putPrice,
            last_price: putPrice,
            bid: putBid,
            ask: putAsk,
            best_bid: putBid,
            best_ask: putAsk,
            volume_24h: 0.38 + Math.random() * 2,
            volume: 0.38 + Math.random() * 2,
            open_interest: 1.6 + Math.random() * 5,
            oi: (1.6 + Math.random() * 5).toFixed(4),
            price_24h_change: 0,
            change_24h: 0,
            change_24h_percent: 0,
            strike_price: strike.toString(),
            contract_type: 'put_options',
            underlying_asset_symbol: 'BTC'
          };
        });
      });
      res.json({ success: true, data: mockData, mock: true });
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    marketDataCount: Object.keys(marketData).length,
    currentBTCPrice: currentBTCPrice
  });
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



// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mockDataAvailable: true,
    productsCount: Object.keys(marketData).length,
    sampleProducts: Object.keys(marketData).slice(0, 5),
    sampleMarketData: Object.entries(marketData).slice(0, 3)
  });
});

// Test endpoint for products and market data matching
app.get('/api/test-matching', async (req, res) => {
  try {
    const products = await deltaExchangeService.getBTCOptionsAndFutures();
    const productSymbols = products.map(p => p.symbol);
    const marketDataSymbols = Object.keys(marketData);
    
    const matches = productSymbols.map(productSymbol => {
      const marketInfo = marketData[productSymbol];
      return {
        productSymbol,
        hasMarketData: !!marketInfo,
        marketData: marketInfo || null
      };
    });
    
    res.json({
      success: true,
      productCount: products.length,
      marketDataCount: marketDataSymbols.length,
      productSymbols: productSymbols.slice(0, 10),
      marketDataSymbols: marketDataSymbols.slice(0, 10),
      matches: matches.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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
