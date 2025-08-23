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
      const response = await axios.get(`${this.apiUrl}/v2/products`);
      const products = response.data.result;
      
      // Filter for BTC options and futures
      const btcProducts = products.filter(product => 
        product.underlying_asset.symbol === 'BTC' &&
        (product.contract_type === 'call_option' || 
         product.contract_type === 'put_option' || 
         product.contract_type === 'futures')
      );

      return btcProducts.map(product => ({
        id: product.id,
        symbol: product.symbol,
        contractType: product.contract_type,
        strikePrice: product.strike_price,
        expirationDate: product.settlement_time,
        underlyingAsset: product.underlying_asset.symbol,
        tickSize: product.tick_size,
        lotSize: product.lot_size,
        minOrderSize: product.min_order_size,
        maxOrderSize: product.max_order_size,
        isActive: product.is_active
      }));
    } catch (error) {
      console.error('Error fetching BTC products:', error);
      throw error;
    }
  }

  // Get market data for a specific product
  async getMarketData(productId) {
    try {
      const response = await axios.get(`${this.apiUrl}/v2/tickers`);
      const tickers = response.data.result;
      return tickers.find(ticker => ticker.product_id === productId);
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw error;
    }
  }

  // Get order book for a product
  async getOrderBook(productId, depth = 20) {
    try {
      const response = await axios.get(`${this.apiUrl}/v2/l2orderbook/${productId}?depth=${depth}`);
      return response.data.result;
    } catch (error) {
      console.error('Error fetching order book:', error);
      throw error;
    }
  }

  // Get historical data
  async getHistoricalData(productId, interval = '1D', limit = 100) {
    try {
      const response = await axios.get(`${this.apiUrl}/v2/history/candles?product_id=${productId}&resolution=${interval}&limit=${limit}`);
      return response.data.result;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
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
