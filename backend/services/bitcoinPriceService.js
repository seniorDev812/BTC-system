const axios = require('axios');

class BitcoinPriceService {
  constructor() {
    this.apiUrl = 'https://api.coingecko.com/api/v3';
    this.currentPrice = null;
    this.lastUpdate = null;
         this.updateInterval = 120000; // Update every 2 minutes
    this.subscribers = [];
  }

  // Fetch current Bitcoin price from CoinGecko
  async fetchBitcoinPrice() {
    try {
      console.log('Fetching Bitcoin price from CoinGecko...');
      const response = await axios.get(`${this.apiUrl}/simple/price`, {
        params: {
          ids: 'bitcoin',
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_24hr_vol: true,
          include_market_cap: true
        },
        timeout: 10000
      });

      if (response.data && response.data.bitcoin) {
        const btcData = response.data.bitcoin;
        this.currentPrice = {
          price: btcData.usd,
          priceChange24h: btcData.usd_24h_change,
          volume24h: btcData.usd_24h_vol,
          marketCap: btcData.usd_market_cap,
          timestamp: Date.now()
        };
        this.lastUpdate = Date.now();
        
        console.log(`Bitcoin price updated: $${this.currentPrice.price.toLocaleString()}`);
        
        // Notify subscribers
        this.notifySubscribers();
        
        return this.currentPrice;
      } else {
        throw new Error('Invalid response format from CoinGecko API');
      }
    } catch (error) {
      console.error('Error fetching Bitcoin price:', error.message);
      
      // If we have a cached price, return it
      if (this.currentPrice) {
        console.log('Using cached Bitcoin price due to API error');
        return this.currentPrice;
      }
      
      // Fallback to a reasonable default if no cached price
      const fallbackPrice = {
        price: 65000, // Reasonable fallback
        priceChange24h: 0,
        volume24h: 0,
        marketCap: 0,
        timestamp: Date.now()
      };
      
      this.currentPrice = fallbackPrice;
      return fallbackPrice;
    }
  }

  // Get current price (cached or fetch new)
  async getCurrentPrice() {
    // If we don't have a price or it's been more than 30 seconds, fetch new
    if (!this.currentPrice || Date.now() - this.lastUpdate > this.updateInterval) {
      return await this.fetchBitcoinPrice();
    }
    
    return this.currentPrice;
  }

  // Subscribe to price updates
  subscribe(callback) {
    this.subscribers.push(callback);
    return this.subscribers.length - 1; // Return subscription ID
  }

  // Unsubscribe from price updates
  unsubscribe(subscriptionId) {
    if (subscriptionId >= 0 && subscriptionId < this.subscribers.length) {
      this.subscribers[subscriptionId] = null;
    }
  }

  // Notify all subscribers
  notifySubscribers() {
    this.subscribers.forEach((callback, index) => {
      if (callback && this.currentPrice) {
        try {
          callback(this.currentPrice);
        } catch (error) {
          console.error(`Error in price subscriber ${index}:`, error);
        }
      }
    });
  }

  // Start periodic updates
  startPeriodicUpdates() {
    // Initial fetch
    this.fetchBitcoinPrice();
    
    // Set up periodic updates
    this.updateTimer = setInterval(() => {
      this.fetchBitcoinPrice();
    }, this.updateInterval);
    
    console.log('Bitcoin price service started with periodic updates');
  }

  // Stop periodic updates
  stopPeriodicUpdates() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      console.log('Bitcoin price service stopped');
    }
  }
}

module.exports = new BitcoinPriceService();
