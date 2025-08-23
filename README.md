# 🚀 BTC Options & Futures Simulator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.0-blue.svg)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC.svg)](https://tailwindcss.com/)

A professional-grade BTC Options & Futures trading simulator with real-time market data from Delta Exchange. Features include multi-leg strategy building, Greeks calculations, interactive payoff charts, and historical backtesting capabilities.

## ✨ Features

### 🎯 Core Functionality
- **Real-time BTC Options Chain**: Complete CE/PE/FUT layout with live market data
- **Multi-leg Strategy Builder**: Create complex options strategies with real-time Greeks
- **Interactive Payoff Charts**: Visualize strategy payoffs with break-even analysis
- **Historical Backtesting**: Test strategies against past market conditions
- **All DTEs Support**: Not limited to 0DTE/1DTE - supports all expiration dates

### 📊 Advanced Analytics
- **Greeks Calculation**: Delta, Gamma, Theta, Vega, Rho
- **Implied Volatility**: Market-implied volatility using Newton-Raphson method
- **Risk Metrics**: Portfolio-level risk analysis and break-even points
- **Real-time PnL**: Live profit/loss calculations

### 🎨 User Experience
- **Responsive Design**: Mobile and desktop compatible
- **Dark/Light Mode**: Toggle between themes
- **Professional UI**: Clean, AlgoTest-style interface
- **Real-time Updates**: Live market data via WebSocket

## 🛠️ Technology Stack

### Frontend
- **React.js 18**: Modern UI framework
- **Tailwind CSS 3.3**: Utility-first CSS framework
- **Recharts 2.8**: Interactive charts and visualizations
- **Socket.io-client**: Real-time data streaming
- **React Router DOM**: Client-side routing
- **Framer Motion**: Smooth animations

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web framework
- **Socket.io**: Real-time bidirectional communication
- **Axios**: HTTP client for API requests
- **Math.js**: Advanced mathematical calculations
- **Crypto**: HMAC signature generation

### APIs & Services
- **Delta Exchange API**: Real market data integration
- **WebSocket**: Real-time price feeds
- **REST API**: Strategy calculations and data retrieval

## 📦 Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Delta Exchange API credentials (optional for development)

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/your-username/btc-options-simulator.git
cd btc-options-simulator
```

2. **Install dependencies**
```bash
npm run install-all
```

3. **Configure API credentials**
   - Copy `backend/env.example` to `backend/.env`
   - Add your Delta Exchange API credentials to the `.env` file
   - Get your API keys from [Delta Exchange](https://www.delta.exchange/settings/api)
   - For development, the app includes demo credentials in `backend/config.js`

4. **Start the application**
```bash
npm run dev
```

This will start both the backend server (port 5000) and frontend development server (port 3000).

### Manual Installation

If you prefer to install dependencies separately:

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## 🏗️ Project Structure

```
btc-options-simulator/
├── backend/                 # Node.js server
│   ├── config.js           # Configuration and API credentials
│   ├── server.js           # Main Express server
│   └── services/           # Business logic services
│       ├── deltaExchangeService.js  # Delta Exchange API integration
│       └── optionsCalculator.js     # Options calculations and Greeks
├── frontend/               # React.js application
│   ├── public/             # Static assets
│   ├── src/                # Source code
│   │   ├── components/     # React components
│   │   ├── context/        # React context providers
│   │   ├── services/       # API service layer
│   │   └── index.css       # Tailwind CSS styles
│   └── tailwind.config.js  # Tailwind configuration
├── package.json            # Root package.json with scripts
└── README.md              # This file
```

## 🎯 Usage

### Dashboard
- Overview of current BTC price and market status
- Quick access to all features
- Real-time connection status

### Option Chain
- View all BTC options and futures
- Filter by expiry date
- Sort by strike price, symbol, or expiry
- Real-time bid/ask, volume, and OI data

### Strategy Builder
- Add multiple legs to your strategy
- Select buy/sell actions for each leg
- Choose from available options and futures
- Real-time Greeks calculation
- Portfolio-level risk metrics

### Payoff Chart
- Interactive visualization of strategy payoffs
- Break-even point identification
- Profit/loss shading
- Hover tooltips with detailed information

### Backtesting
- Test strategies with historical data
- Performance metrics (Sharpe ratio, max drawdown, win rate)
- Date range selection
- Initial capital configuration

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:

```env
DELTA_API_KEY=your_api_key
DELTA_API_SECRET=your_api_secret
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### API Configuration
The Delta Exchange API configuration is in `backend/config.js`:

```javascript
module.exports = {
  deltaExchange: {
    apiKey: 'YvaGcy4Rq3vA4GDIA1jcPBW1bckKlW',
    apiSecret: 'LIy4IJ5DDyi39rUGVHDfcmIj2aj0TdZ5OTJTtBGSg4M8WDsUNbgRKERCR',
    apiUrl: 'https://api.delta.exchange',
    wsUrl: 'wss://api.delta.exchange:2096'
  }
  // ... other config
};
```

## 📊 API Endpoints

### Products & Market Data
- `GET /api/products` - Get all BTC options and futures
- `GET /api/market-data` - Get real-time market data
- `GET /api/orderbook/:productId` - Get order book for a product
- `GET /api/historical/:productId` - Get historical data for backtesting

### Calculations
- `POST /api/calculate/option` - Calculate option metrics
- `POST /api/calculate/strategy` - Calculate strategy metrics
- `POST /api/calculate/iv` - Calculate implied volatility
- `POST /api/calculate/greeks` - Calculate option Greeks

### Health Check
- `GET /api/health` - Server health status

## 🎨 Customization

### Styling
The application uses Tailwind CSS with a custom theme. Modify `frontend/tailwind.config.js` to customize colors, fonts, and other design elements.

### Adding New Features
1. **Backend**: Add new routes in `backend/server.js` and services in `backend/services/`
2. **Frontend**: Create new components in `frontend/src/components/` and add routes in `frontend/src/App.js`

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Start production server
cd ../backend
npm start
```

### Docker Deployment
```dockerfile
# Example Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 🔒 Security

- API credentials are stored securely in configuration
- CORS is properly configured for production
- Input validation on all API endpoints
- Rate limiting implemented
- Helmet.js for security headers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API documentation

## 🙏 Acknowledgments

- Delta Exchange for providing the API
- React.js and Node.js communities
- Tailwind CSS for the amazing styling framework
- Recharts for the charting capabilities

---

**Note**: This is a simulator for educational and testing purposes. Always verify calculations and do not use for actual trading without proper validation.
