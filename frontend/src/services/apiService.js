import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Products
  getProducts: async () => {
    return apiClient.get('/products');
  },

  getMarketData: async () => {
    return apiClient.get('/market-data');
  },

  getOrderBook: async (productId, depth = 20) => {
    return apiClient.get(`/orderbook/${productId}?depth=${depth}`);
  },

  getHistoricalData: async (productId, interval = '1D', limit = 100) => {
    return apiClient.get(`/historical/${productId}?interval=${interval}&limit=${limit}`);
  },

  // Calculations
  calculateOption: async (option, currentPrice) => {
    return apiClient.post('/calculate/option', { option, currentPrice });
  },

  calculateStrategy: async (strategy, currentPrice) => {
    return apiClient.post('/calculate/strategy', { strategy, currentPrice });
  },

  calculateImpliedVolatility: async (S, K, T, r, marketPrice, optionType) => {
    return apiClient.post('/calculate/iv', { S, K, T, r, marketPrice, optionType });
  },

  calculateGreeks: async (S, K, T, r, sigma, optionType) => {
    return apiClient.post('/calculate/greeks', { S, K, T, r, sigma, optionType });
  },

  // Health check
  healthCheck: async () => {
    return apiClient.get('/health');
  },
};
