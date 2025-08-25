const axios = require('axios');
const WebSocket = require('ws');
const crypto = require('crypto');
const config = require('../config');

class DeltaExchangeService {
  constructor() {
    this.apiKey = config.deltaExchange.apiKey;
    this.apiSecret = config.deltaExchange.apiSecret;
    this.apiUrl = config.deltaExchange.apiUrl;
    this.wsUrl = config.deltaExchange.wsUrl;
    this.ws = null;
    this.isConnected = false;
    this.subscribers = new Map();
    
    // Test API connection on initialization
    this.testConnection();
  }

  // Test API connection
  async testConnection() {
    try {
      console.log('Testing Delta Exchange API connection...');
      console.log('API URL:', this.apiUrl);
      console.log('API Key:', this.apiKey ? 'Present' : 'Missing');
      console.log('API Secret:', this.apiSecret ? 'Present' : 'Missing');
      
      const response = await axios.get(`${this.apiUrl}/v2/products`);
      console.log('✅ API connection successful');
      console.log('Response status:', response.status);
      console.log('Products count:', response.data?.result?.length || 0);
      
      return true;
    } catch (error) {
      console.error('❌ API connection failed:', error.response?.data || error.message);
      console.error('Status:', error.response?.status);
      console.error('Headers:', error.response?.headers);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Using mock data for development...');
      }
      
      return false;
    }
  }

  // Generate signature for authenticated requests
  generateSignature(timestamp, method, path, body = '') {
    const message = timestamp + method + path + body;
    return crypto.createHmac('sha256', this.apiSecret).update(message).digest('hex');
  }

  // Make authenticated API request
  async makeRequest(method, endpoint, data = null) {
    const timestamp = Date.now().toString();
    const path = `/v2${endpoint}`;
    const body = data ? JSON.stringify(data) : '';
    
    const signature = this.generateSignature(timestamp, method, path, body);
    
    const headers = {
      'api-key': this.apiKey,
      'timestamp': timestamp,
      'signature': signature,
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios({
        method,
        url: `${this.apiUrl}${path}`,
        headers,
        data: body || undefined
      });
      return response.data;
    } catch (error) {
      console.error('Delta Exchange API Error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get all BTC options and futures
  async getBTCOptionsAndFutures() {
    try {
      console.log('Fetching products from Delta Exchange...');
      const response = await axios.get(`${this.apiUrl}/v2/products`);
      console.log('Products response:', response.data);
      
      if (!response.data || !response.data.result) {
        throw new Error('Invalid response format from Delta Exchange API');
      }
      
      const products = response.data.result;
      console.log(`Total products received: ${products.length}`);
      
      // Filter for BTC options and futures
      const btcProducts = products.filter(product => {
        const isBTC = product.underlying_asset && product.underlying_asset.symbol === 'BTC';
        const isOptionOrFuture = product.contract_type === 'call_option' || 
                                product.contract_type === 'put_option' || 
                                product.contract_type === 'futures';
        return isBTC && isOptionOrFuture;
      });

      console.log(`BTC products found: ${btcProducts.length}`);

      return btcProducts.map(product => ({
        id: product.id,
        symbol: product.symbol,
        contractType: product.contract_type,
        strikePrice: parseFloat(product.strike_price) || 0,
        expirationDate: product.settlement_time ? new Date(product.settlement_time).toISOString().split('T')[0] : '2024-12-31',
        underlyingAsset: product.underlying_asset ? product.underlying_asset.symbol : 'BTC',
        tickSize: parseFloat(product.tick_size) || 0.1,
        lotSize: parseFloat(product.lot_size) || 1,
        minOrderSize: parseFloat(product.min_order_size) || 0.01,
        maxOrderSize: parseFloat(product.max_order_size) || 1000,
        isActive: product.is_active || true,
        // Add original product data for debugging
        originalData: product
      }));
    } catch (error) {
      console.error('Error fetching BTC products:', error.response?.data || error.message);
      
      // Always return mock data if API fails (for development and fallback)
      console.log('API failed, returning mock data...');
      return this.getMockBTCOptions();
    }
  }

  // Mock BTC options data for development
  getMockBTCOptions() {
    const currentPrice = 45000; // Mock BTC price
    const mockOptions = [];
    
    // Generate mock call options
    for (let i = 0; i < 5; i++) {
      const strike = currentPrice + (i * 1000);
      mockOptions.push({
        id: `call_${i}`,
        symbol: `BTC-${strike}-C`,
        contractType: 'call_option',
        strikePrice: strike,
        expirationDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        underlyingAsset: 'BTC',
        tickSize: 0.1,
        lotSize: 1,
        minOrderSize: 0.01,
        maxOrderSize: 1000,
        isActive: true
      });
    }
    
    // Generate mock put options
    for (let i = 0; i < 5; i++) {
      const strike = currentPrice - (i * 1000);
      mockOptions.push({
        id: `put_${i}`,
        symbol: `BTC-${strike}-P`,
        contractType: 'put_option',
        strikePrice: strike,
        expirationDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        underlyingAsset: 'BTC',
        tickSize: 0.1,
        lotSize: 1,
        minOrderSize: 0.01,
        maxOrderSize: 1000,
        isActive: true
      });
    }
    
    // Add mock futures
    mockOptions.push({
      id: 'futures_1',
      symbol: 'BTC-PERP',
      contractType: 'futures',
      strikePrice: null,
      expirationDate: null,
      underlyingAsset: 'BTC',
      tickSize: 0.1,
      lotSize: 1,
      minOrderSize: 0.01,
      maxOrderSize: 1000,
      isActive: true
    });
    
    console.log('Generated mock options:', mockOptions.length, 'products');
    return mockOptions;
  }

  // Get market data for a specific product
  async getMarketData(productId) {
    try {
      console.log(`Fetching market data for product: ${productId}`);
      const response = await axios.get(`${this.apiUrl}/v2/tickers`);
      
      if (!response.data || !response.data.result) {
        throw new Error('Invalid response format from Delta Exchange API');
      }
      
      const tickers = response.data.result;
      const ticker = tickers.find(ticker => ticker.product_id === productId);
      
      if (!ticker) {
        console.log(`No market data found for product: ${productId}`);
        // Return mock data for development
        if (process.env.NODE_ENV === 'development') {
          return this.getMockMarketData(productId);
        }
      }
      
      return ticker;
    } catch (error) {
      console.error('Error fetching market data:', error.response?.data || error.message);
      
      // Return mock data for development if API fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Returning mock market data for development...');
        return this.getMockMarketData(productId);
      }
      
      throw error;
    }
  }

  // Mock market data for development
  getMockMarketData(productId) {
    const basePrice = 45000;
    const randomChange = (Math.random() - 0.5) * 1000;
    const currentPrice = basePrice + randomChange;
    
    return {
      product_id: productId,
      price: currentPrice,
      bid: currentPrice - 10,
      ask: currentPrice + 10,
      volume_24h: Math.random() * 1000,
      open_interest: Math.random() * 500,
      change_24h: randomChange,
      change_24h_percent: (randomChange / basePrice) * 100
    };
  }

  // Get order book for a product
  async getOrderBook(productId, depth = 20) {
    try {
      console.log(`Fetching order book for product: ${productId}`);
      const response = await axios.get(`${this.apiUrl}/v2/l2orderbook/${productId}?depth=${depth}`);
      
      if (!response.data || !response.data.result) {
        throw new Error('Invalid response format from Delta Exchange API');
      }
      
      return response.data.result;
    } catch (error) {
      console.error('Error fetching order book:', error.response?.data || error.message);
      
      // Return mock data for development if API fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Returning mock order book for development...');
        return this.getMockOrderBook(productId, depth);
      }
      
      throw error;
    }
  }

  // Mock order book for development
  getMockOrderBook(productId, depth = 20) {
    const basePrice = 45000;
    const bids = [];
    const asks = [];
    
    for (let i = 0; i < depth; i++) {
      const bidPrice = basePrice - (i * 10) - Math.random() * 5;
      const askPrice = basePrice + (i * 10) + Math.random() * 5;
      
      bids.push([bidPrice, Math.random() * 10]);
      asks.push([askPrice, Math.random() * 10]);
    }
    
    return {
      product_id: productId,
      bids: bids.sort((a, b) => b[0] - a[0]), // Sort bids descending
      asks: asks.sort((a, b) => a[0] - b[0])  // Sort asks ascending
    };
  }

  // Get historical data
  async getHistoricalData(productId, interval = '1D', limit = 100) {
    try {
      console.log(`Fetching historical data for product: ${productId}`);
      const response = await axios.get(`${this.apiUrl}/v2/history/candles?product_id=${productId}&resolution=${interval}&limit=${limit}`);
      
      if (!response.data || !response.data.result) {
        throw new Error('Invalid response format from Delta Exchange API');
      }
      
      return response.data.result;
    } catch (error) {
      console.error('Error fetching historical data:', error.response?.data || error.message);
      
      // Return mock data for development if API fails
      if (process.env.NODE_ENV === 'development') {
        console.log('Returning mock historical data for development...');
        return this.getMockHistoricalData(productId, interval, limit);
      }
      
      throw error;
    }
  }

  // Mock historical data for development
  getMockHistoricalData(productId, interval = '1D', limit = 100) {
    const basePrice = 45000;
    const candles = [];
    const now = Date.now();
    const intervalMs = interval === '1D' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000; // 1 day or 1 hour
    
    for (let i = 0; i < limit; i++) {
      const timestamp = now - (i * intervalMs);
      const open = basePrice + (Math.random() - 0.5) * 1000;
      const high = open + Math.random() * 500;
      const low = open - Math.random() * 500;
      const close = open + (Math.random() - 0.5) * 200;
      const volume = Math.random() * 1000;
      
      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
    }
    
    return candles.reverse(); // Return in chronological order
  }

  // Connect to WebSocket for real-time data
  connectWebSocket() {
    if (this.ws && this.isConnected) {
      return;
    }

    this.ws = new WebSocket(this.wsUrl);

    this.ws.on('open', () => {
      console.log('Connected to Delta Exchange WebSocket');
      this.isConnected = true;
      this.subscribeToTickers();
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('Disconnected from Delta Exchange WebSocket');
      this.isConnected = false;
      // Reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(), 5000);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.isConnected = false;
    });
  }

  // Subscribe to ticker updates
  subscribeToTickers() {
    if (!this.ws || !this.isConnected) return;

    const subscribeMessage = {
      type: 'subscribe',
      payload: {
        channels: [
          {
            name: 'ticker',
            symbols: ['BTC-PERP'] // Subscribe to BTC perpetual
          }
        ]
      }
    };

    this.ws.send(JSON.stringify(subscribeMessage));
  }

  // Handle incoming WebSocket messages
  handleWebSocketMessage(message) {
    if (message.type === 'ticker') {
      // Notify subscribers
      this.subscribers.forEach((callback) => {
        callback(message);
      });
    }
  }

  // Subscribe to real-time updates
  subscribe(callback) {
    const id = Date.now().toString();
    this.subscribers.set(id, callback);
    return id;
  }

  // Unsubscribe from real-time updates
  unsubscribe(id) {
    this.subscribers.delete(id);
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}

module.exports = new DeltaExchangeService();
