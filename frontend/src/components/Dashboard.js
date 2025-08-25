import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { apiService } from '../services/apiService';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3,
  Calculator,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { darkMode } = useTheme();
  const { socket, isConnected } = useData();
  const [marketData, setMarketData] = useState({});
  const [btcPrice, setBtcPrice] = useState(112271.90);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData();
    
    if (socket) {
      socket.on('btcPrice', (price) => {
        setBtcPrice(price);
      });

      socket.on('marketUpdate', (data) => {
        setMarketData(prev => ({ ...prev, ...data }));
      });
    }

    return () => {
      if (socket) {
        socket.off('btcPrice');
        socket.off('marketUpdate');
      }
    };
  }, [socket]);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      console.log('Dashboard: Fetching market data...');
      const response = await apiService.getMarketData();
      console.log('Dashboard: Market data response:', response);
      
      if (response.success) {
        console.log('Dashboard: Setting market data:', response.data);
        console.log('Dashboard: Market data keys:', Object.keys(response.data));
        
        // Log first few items for debugging
        const firstFew = Object.entries(response.data).slice(0, 3);
        console.log('Dashboard: First few market data items:', firstFew);
        
        setMarketData(response.data);
      } else {
        console.error('Dashboard: Market data response not successful:', response);
      }
    } catch (error) {
      toast.error('Failed to fetch market data');
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBtcTicker = () => {
    console.log('Dashboard: Getting BTC ticker from market data:', marketData);
    console.log('Dashboard: Market data keys:', Object.keys(marketData));
    
    // First try to find BTC-PERP specifically
    let btcTicker = Object.values(marketData).find(ticker => 
      ticker.symbol === 'BTC-PERP'
    );
    
    // If not found, look for any BTC ticker
    if (!btcTicker) {
      btcTicker = Object.values(marketData).find(ticker => 
        ticker.symbol && ticker.symbol.includes('BTC')
      );
    }
    
    console.log('Dashboard: Found BTC ticker:', btcTicker);
    return btcTicker;
  };

  const btcTicker = getBtcTicker();
  
  // Handle different data structures from backend
  const getPriceChange = (ticker) => {
    if (!ticker) return 0;
    
    console.log('Dashboard: Getting price change for ticker:', ticker);
    console.log('Dashboard: Available fields:', Object.keys(ticker));
    
    // Try different possible field names for price change
    const priceChange = ticker.price_24h_change || 
           ticker.change_24h || 
           ticker.change_24h_percent || 
           0;
    
    console.log('Dashboard: Calculated price change:', priceChange);
    return priceChange;
  };
  
  const getVolume24h = (ticker) => {
    if (!ticker) return 0;
    
    console.log('Dashboard: Getting volume for ticker:', ticker);
    
    // Try different possible field names for volume
    const volume = ticker.volume_24h || 
           ticker.volume || 
           ticker.volume_24h_change || 
           0;
    
    console.log('Dashboard: Calculated volume:', volume);
    return volume;
  };
  
  const priceChange = getPriceChange(btcTicker);
  const volume24h = getVolume24h(btcTicker);

  const stats = [
    {
      name: 'BTC Price',
      value: `$${112271.90.toLocaleString()}`,
      change: priceChange,
      changeType: priceChange >= 0 ? 'positive' : 'negative',
      icon: DollarSign,
    },
    {
      name: '24h Volume',
      value: `$${(volume24h / 1000000).toFixed(1)}M`,
      change: 0,
      changeType: 'neutral',
      icon: BarChart3,
    },
    {
      name: 'Active Options',
      value: Object.keys(marketData).filter(symbol => 
        symbol.includes('C') || symbol.includes('P')
      ).length,
      change: 0,
      changeType: 'neutral',
      icon: Calculator,
    },
    {
      name: 'Connection',
      value: isConnected ? 'Connected' : 'Disconnected',
      change: 0,
      changeType: isConnected ? 'positive' : 'negative',
      icon: Activity,
    },
  ];

  const quickActions = [
    {
      name: 'Option Chain',
      description: 'View all BTC options and futures',
      href: '/option-chain',
      icon: BarChart3,
      color: 'blue',
    },
    {
      name: 'Strategy Builder',
      description: 'Build multi-leg options strategies',
      href: '/strategy-builder',
      icon: Calculator,
      color: 'green',
    },
    {
      name: 'Payoff Chart',
      description: 'Visualize strategy payoffs',
      href: '/payoff-chart',
      icon: TrendingUp,
      color: 'purple',
    },
    {
      name: 'Backtesting',
      description: 'Test strategies with historical data',
      href: '/backtesting',
      icon: History,
      color: 'orange',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  // Error boundary for data issues
  if (!marketData || Object.keys(marketData).length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Dashboard
          </h1>
          <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            BTC Options & Futures Trading Simulator
          </p>
        </div>
        
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            No Market Data Available
          </h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Unable to fetch market data from the backend. Please check your connection and try again.
          </p>
          <button 
            onClick={fetchMarketData}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Dashboard
        </h1>
        <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          BTC Options & Futures Trading Simulator
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className={`p-6 rounded-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stat.name}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Icon size={20} className={
                    stat.changeType === 'positive' ? 'text-green-600' : 
                    stat.changeType === 'negative' ? 'text-red-600' :
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  } />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <a key={action.name} href={action.href} className={`p-6 rounded-lg border transition-all duration-200 hover:shadow-lg ${
                darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'
              }`}>
                <div className={`w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center mb-4`}>
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {action.name}
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {action.description}
                </p>
              </a>
            );
          })}
        </div>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Debug Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Market Data Keys:</p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{Object.keys(marketData).join(', ')}</p>
            </div>
            <div>
              <p className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>BTC Ticker:</p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{btcTicker ? btcTicker.symbol : 'Not found'}</p>
            </div>
            <div>
              <p className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Connection Status:</p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{isConnected ? 'Connected' : 'Disconnected'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
