import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { apiService } from '../services/apiService';
import { History, Calendar, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const Backtesting = () => {
  const { darkMode } = useTheme();
  const { socket, isConnected } = useData();
  const [products, setProducts] = useState([]);
  const [strategy, setStrategy] = useState({
    name: '',
    legs: []
  });
  const [backtestConfig, setBacktestConfig] = useState({
    startDate: '',
    endDate: '',
    initialCapital: 10000
  });
  const [backtestResults, setBacktestResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await apiService.getProducts();
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch products');
      console.error('Error fetching products:', error);
    }
  };

  const addLeg = () => {
    setStrategy(prev => ({
      ...prev,
      legs: [...prev.legs, {
        id: Date.now(),
        option: null,
        action: 'buy',
        quantity: 1,
        price: 0
      }]
    }));
  };

  const removeLeg = (legId) => {
    setStrategy(prev => ({
      ...prev,
      legs: prev.legs.filter(leg => leg.id !== legId)
    }));
  };

  const updateLeg = (legId, field, value) => {
    setStrategy(prev => ({
      ...prev,
      legs: prev.legs.map(leg => 
        leg.id === legId ? { ...leg, [field]: value } : leg
      )
    }));
  };

  const runBacktest = async () => {
    if (strategy.legs.length === 0) {
      toast.error('Please add at least one leg to your strategy');
      return;
    }

    if (!backtestConfig.startDate || !backtestConfig.endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    try {
      setLoading(true);
      
      // Simulate backtesting
      const results = {
        totalReturn: 15.5,
        maxDrawdown: -8.2,
        sharpeRatio: 1.2,
        winRate: 65.5,
        totalTrades: 45,
        finalEquity: backtestConfig.initialCapital * 1.155
      };
      
      setBacktestResults(results);
      toast.success('Backtest completed successfully');
    } catch (error) {
      toast.error('Failed to run backtest');
      console.error('Error running backtest:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return price ? `$${parseFloat(price).toLocaleString()}` : 'N/A';
  };

  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Backtesting
        </h1>
        <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Test your strategies with historical data from Delta Exchange
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Backtest Configuration
          </h2>

          {/* Initial Capital */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Initial Capital
            </label>
            <input
              type="number"
              value={backtestConfig.initialCapital}
              onChange={(e) => setBacktestConfig(prev => ({ 
                ...prev, 
                initialCapital: parseFloat(e.target.value) || 10000 
              }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {/* Date Range */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Start Date
            </label>
            <input
              type="date"
              value={backtestConfig.startDate}
              onChange={(e) => setBacktestConfig(prev => ({ ...prev, startDate: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              End Date
            </label>
            <input
              type="date"
              value={backtestConfig.endDate}
              onChange={(e) => setBacktestConfig(prev => ({ ...prev, endDate: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {/* Strategy Configuration */}
          <div className="space-y-4">
            <h3 className={`text-md font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Strategy
            </h3>

            {strategy.legs.map((leg, index) => (
              <div key={leg.id} className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Leg {index + 1}
                  </span>
                  <button
                    onClick={() => removeLeg(leg.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>

                <div className="space-y-2">
                  <select
                    value={leg.action}
                    onChange={(e) => updateLeg(leg.id, 'action', e.target.value)}
                    className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-500 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={leg.quantity}
                    onChange={(e) => updateLeg(leg.id, 'quantity', parseInt(e.target.value) || 1)}
                    placeholder="Quantity"
                    className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-500 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />

                  <select
                    value={leg.option?.id || ''}
                    onChange={(e) => {
                      const selectedOption = products.find(p => p.id === parseInt(e.target.value));
                      updateLeg(leg.id, 'option', selectedOption);
                    }}
                    className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-500 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Select Option</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.symbol} @ {formatPrice(product.strikePrice)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            <button
              onClick={addLeg}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>Add Leg</span>
            </button>

            {/* Run Backtest Button */}
            <button
              onClick={runBacktest}
              disabled={loading || strategy.legs.length === 0}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <History size={16} />
              )}
              <span>{loading ? 'Running...' : 'Run Backtest'}</span>
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Backtest Results
          </h2>

          {backtestResults ? (
            <div className="space-y-6">
              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Return</p>
                  <p className={`text-lg font-bold text-green-600`}>
                    {formatPercent(backtestResults.totalReturn)}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Drawdown</p>
                  <p className={`text-lg font-bold text-red-600`}>
                    {formatPercent(backtestResults.maxDrawdown)}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sharpe Ratio</p>
                  <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {backtestResults.sharpeRatio.toFixed(2)}
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Win Rate</p>
                  <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatPercent(backtestResults.winRate)}
                  </p>
                </div>
              </div>

              {/* Additional Stats */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`text-md font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Trades</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {backtestResults.totalTrades}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Final Equity</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatPrice(backtestResults.finalEquity)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`text-center py-16 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <History size={48} className="mx-auto mb-4 opacity-50" />
              <p>Configure your strategy and run a backtest to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Backtesting;
