import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { apiService } from '../services/apiService';
import { Plus, Trash2, Calculator, DollarSign, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const StrategyBuilder = () => {
  const { darkMode } = useTheme();
  const { socket, isConnected } = useData();
  const [products, setProducts] = useState([]);
  const [strategy, setStrategy] = useState({
    name: '',
    legs: []
  });
  const [currentPrice, setCurrentPrice] = useState(50000);
  const [strategyMetrics, setStrategyMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    
    if (socket) {
      socket.on('btcPrice', (price) => {
        setCurrentPrice(price);
      });
    }

    return () => {
      if (socket) {
        socket.off('btcPrice');
      }
    };
  }, [socket]);

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

  const calculateStrategy = async () => {
    if (strategy.legs.length === 0) {
      toast.error('Please add at least one leg to your strategy');
      return;
    }

    if (strategy.legs.some(leg => !leg.option)) {
      toast.error('Please select an option for all legs');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.calculateStrategy(strategy, currentPrice);
      if (response.success) {
        setStrategyMetrics(response.data);
        toast.success('Strategy calculated successfully');
      }
    } catch (error) {
      toast.error('Failed to calculate strategy');
      console.error('Error calculating strategy:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return price ? `$${parseFloat(price).toFixed(2)}` : 'N/A';
  };

  const formatGreeks = (value) => {
    return value ? value.toFixed(4) : '0.0000';
  };

  const getOptionLabel = (option) => {
    if (!option) return 'Select Option';
    return `${option.symbol} @ ${formatPrice(option.strikePrice)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Strategy Builder
        </h1>
        <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Build multi-leg options strategies with real-time calculations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Configuration */}
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Strategy Configuration
          </h2>

          {/* Strategy Name */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Strategy Name
            </label>
            <input
              type="text"
              value={strategy.name}
              onChange={(e) => setStrategy(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter strategy name..."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>

          {/* Current BTC Price */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Current BTC Price
            </label>
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatPrice(currentPrice)}
            </div>
          </div>

          {/* Strategy Legs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-md font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Strategy Legs
              </h3>
              <button
                onClick={addLeg}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                <span>Add Leg</span>
              </button>
            </div>

            {strategy.legs.map((leg, index) => (
              <div key={leg.id} className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Leg {index + 1}
                  </span>
                  <button
                    onClick={() => removeLeg(leg.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Action */}
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Action
                    </label>
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
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={leg.quantity}
                      onChange={(e) => updateLeg(leg.id, 'quantity', parseInt(e.target.value) || 1)}
                      className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                        darkMode 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Option Selection */}
                  <div className="md:col-span-2">
                    <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Option
                    </label>
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
                          {product.symbol} - {product.contractType.replace('_', ' ')} @ {formatPrice(product.strikePrice)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Entry Price */}
                  <div className="md:col-span-2">
                    <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Entry Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={leg.price}
                      onChange={(e) => updateLeg(leg.id, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="Enter entry price..."
                      className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                        darkMode 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}

            {strategy.legs.length === 0 && (
              <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No legs added. Click "Add Leg" to start building your strategy.
              </div>
            )}

            {/* Calculate Button */}
            <button
              onClick={calculateStrategy}
              disabled={loading || strategy.legs.length === 0}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <Calculator size={16} />
              )}
              <span>{loading ? 'Calculating...' : 'Calculate Strategy'}</span>
            </button>
          </div>
        </div>

        {/* Strategy Results */}
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Strategy Results
          </h2>

          {strategyMetrics ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`text-md font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Cost</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatPrice(strategyMetrics.totalCost)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Profit</p>
                    <p className={`text-lg font-bold text-green-600`}>
                      {formatPrice(strategyMetrics.maxProfit)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Loss</p>
                    <p className={`text-lg font-bold text-red-600`}>
                      {formatPrice(strategyMetrics.maxLoss)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Break Even</p>
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {strategyMetrics.breakEvenPoints.length > 0 
                        ? strategyMetrics.breakEvenPoints.map(p => formatPrice(p)).join(', ')
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Greeks */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`text-md font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Portfolio Greeks
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Delta</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatGreeks(strategyMetrics.totalDelta)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Gamma</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatGreeks(strategyMetrics.totalGamma)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Theta</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatGreeks(strategyMetrics.totalTheta)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Vega</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatGreeks(strategyMetrics.totalVega)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Individual Legs */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`text-md font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Individual Legs
                </h3>
                <div className="space-y-3">
                  {strategyMetrics.legs.map((leg, index) => (
                    <div key={index} className={`p-3 rounded border ${darkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Leg {index + 1}: {leg.action.toUpperCase()} {leg.option?.symbol}
                        </span>
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Qty: {leg.quantity}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Price: </span>
                          <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatPrice(leg.price)}</span>
                        </div>
                        <div>
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Delta: </span>
                          <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatGreeks(leg.positionDelta)}</span>
                        </div>
                        <div>
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Cost: </span>
                          <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatPrice(leg.positionCost)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Build a strategy and click "Calculate" to see results
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StrategyBuilder;
