import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { apiService } from '../services/apiService';
import { 
  Plus, 
  Trash2, 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Save,
  Download,
  Upload,
  Target,
  Zap,
  Clock,
  BarChart3,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

// Strategy Templates
const STRATEGY_TEMPLATES = {
  'bull-call-spread': {
    name: 'Bull Call Spread',
    description: 'Limited risk bullish strategy',
    legs: [
      { action: 'buy', type: 'call', description: 'Buy lower strike call' },
      { action: 'sell', type: 'call', description: 'Sell higher strike call' }
    ]
  },
  'bear-put-spread': {
    name: 'Bear Put Spread',
    description: 'Limited risk bearish strategy',
    legs: [
      { action: 'buy', type: 'put', description: 'Buy higher strike put' },
      { action: 'sell', type: 'put', description: 'Sell lower strike put' }
    ]
  },
  'iron-condor': {
    name: 'Iron Condor',
    description: 'Neutral strategy with defined risk',
    legs: [
      { action: 'sell', type: 'put', description: 'Sell lower put' },
      { action: 'buy', type: 'put', description: 'Buy lower put' },
      { action: 'sell', type: 'call', description: 'Sell higher call' },
      { action: 'buy', type: 'call', description: 'Buy higher call' }
    ]
  },
  'butterfly-spread': {
    name: 'Butterfly Spread',
    description: 'Limited risk, limited reward',
    legs: [
      { action: 'buy', type: 'call', description: 'Buy lower strike call' },
      { action: 'sell', type: 'call', description: 'Sell middle strike calls (x2)' },
      { action: 'buy', type: 'call', description: 'Buy higher strike call' }
    ]
  },
  'straddle': {
    name: 'Long Straddle',
    description: 'Volatility play',
    legs: [
      { action: 'buy', type: 'call', description: 'Buy ATM call' },
      { action: 'buy', type: 'put', description: 'Buy ATM put' }
    ]
  },
  'strangle': {
    name: 'Long Strangle',
    description: 'Volatility play with wider strikes',
    legs: [
      { action: 'buy', type: 'call', description: 'Buy OTM call' },
      { action: 'buy', type: 'put', description: 'Buy OTM put' }
    ]
  }
};

const StrategyBuilder = () => {
  const { darkMode } = useTheme();
  const { socket, isConnected } = useData();
  const [products, setProducts] = useState([]);
  const [strategy, setStrategy] = useState({
    name: '',
    legs: [],
    template: null
  });
  const [currentPrice, setCurrentPrice] = useState(65000);
  const [strategyMetrics, setStrategyMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Real-time updates
  useEffect(() => {
    fetchProducts();
    fetchBitcoinPrice();
    
    if (socket) {
      socket.on('btcPrice', (price) => {
        setCurrentPrice(price);
        if (autoCalculate && strategy.legs.length > 0) {
          calculateStrategy();
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('btcPrice');
      }
    };
  }, [socket, autoCalculate, strategy.legs]);

  const fetchBitcoinPrice = async () => {
    try {
      const response = await apiService.getBitcoinPrice();
      if (response.success) {
        setCurrentPrice(response.data.price);
      }
    } catch (error) {
      console.error('Error fetching Bitcoin price:', error);
    }
  };

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
        price: 0,
        multiplier: 1
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

  const applyTemplate = (templateKey) => {
    const template = STRATEGY_TEMPLATES[templateKey];
    if (!template) return;

    const newLegs = template.legs.map((leg, index) => ({
      id: Date.now() + index,
      option: null,
      action: leg.action,
      quantity: leg.action === 'sell' && templateKey === 'butterfly-spread' && index === 1 ? 2 : 1,
      price: 0,
      multiplier: 1,
      description: leg.description
    }));

    setStrategy(prev => ({
      ...prev,
      template: templateKey,
      legs: newLegs
    }));

    setSelectedTemplate(templateKey);
    setShowTemplates(false);
    toast.success(`Applied ${template.name} template`);
  };

  const calculateStrategy = useCallback(async () => {
    if (strategy.legs.length === 0) return;

    if (strategy.legs.some(leg => !leg.option)) {
      return; // Don't calculate if not all legs have options selected
    }

    try {
      setLoading(true);
      const response = await apiService.calculateStrategy(strategy, currentPrice);
      if (response.success) {
        setStrategyMetrics(response.data);
      }
    } catch (error) {
      console.error('Error calculating strategy:', error);
    } finally {
      setLoading(false);
    }
  }, [strategy, currentPrice]);

  // Auto-calculate when strategy changes
  useEffect(() => {
    if (autoCalculate && strategy.legs.length > 0) {
      const timer = setTimeout(calculateStrategy, 500);
      return () => clearTimeout(timer);
    }
  }, [strategy, autoCalculate, calculateStrategy]);

  const formatPrice = (price) => {
    return price ? `$${parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
  };

  const formatGreeks = (value) => {
    if (value === null || value === undefined) return '0.0000';
    return parseFloat(value).toFixed(4);
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '0.00%';
    return `${(parseFloat(value) * 100).toFixed(2)}%`;
  };

  const getOptionLabel = (option) => {
    if (!option) return 'Select Option';
    const type = option.contractType === 'call_option' ? 'CALL' : 
                 option.contractType === 'put_option' ? 'PUT' : 'FUT';
    return `${type} ${option.symbol} @ ${formatPrice(option.strikePrice)}`;
  };

  const getStrategyType = () => {
    // Prefer template name if user applied one
    if (strategy.template) {
      const template = STRATEGY_TEMPLATES[strategy.template];
      if (template?.name) return template.name;
    }

    // When no legs yet
    if (!strategy.legs || strategy.legs.length === 0) return 'Custom Strategy';

    // If legs exist but options not selected yet
    const hasUnselected = strategy.legs.some(leg => !leg.option);
    if (hasUnselected) return 'Select options to detect strategy';
    
    const calls = strategy.legs.filter(leg => leg.option?.contractType === 'call_option').length;
    const puts = strategy.legs.filter(leg => leg.option?.contractType === 'put_option').length;
    const futures = strategy.legs.filter(leg => leg.option?.contractType === 'futures').length;
    const buys = strategy.legs.filter(leg => leg.action === 'buy').length;
    const sells = strategy.legs.filter(leg => leg.action === 'sell').length;

    if (futures > 0 && calls + puts === 0) return 'Futures Position';
    if (calls === 2 && puts === 0 && buys === 1 && sells === 1) return 'Bull Call Spread';
    if (calls === 0 && puts === 2 && buys === 1 && sells === 1) return 'Bear Put Spread';
    if (calls === 2 && puts === 2 && buys === 2 && sells === 2) return 'Iron Condor';
    if (calls === 3 && puts === 0 && buys === 2 && sells === 1) return 'Butterfly Spread';
    if (calls === 1 && puts === 1 && buys === 2 && sells === 0) return 'Long Straddle/Strangle';
    
    return 'Custom Strategy';
  };

  const saveStrategy = () => {
    const strategyData = {
      ...strategy,
      timestamp: new Date().toISOString(),
      currentPrice,
      metrics: strategyMetrics
    };
    
    const dataStr = JSON.stringify(strategyData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${strategy.name || 'strategy'}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Strategy saved successfully');
  };

  const loadStrategy = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const strategyData = JSON.parse(e.target.result);
        setStrategy({
          name: strategyData.name || '',
          legs: strategyData.legs || [],
          template: strategyData.template || null
        });
        setCurrentPrice(strategyData.currentPrice || 65000);
        setStrategyMetrics(strategyData.metrics || null);
        toast.success('Strategy loaded successfully');
      } catch (error) {
        toast.error('Invalid strategy file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Strategy Builder
          </h1>
          <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Build multi-leg options strategies with real-time calculations
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={16} />
            <span>Templates</span>
          </button>
          
          <button
            onClick={saveStrategy}
            disabled={strategy.legs.length === 0}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={16} />
            <span>Save</span>
          </button>
          
          <label className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors">
            <Upload size={16} />
            <span>Load</span>
            <input
              type="file"
              accept=".json"
              onChange={loadStrategy}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Strategy Templates Modal */}
      {showTemplates && (
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Strategy Templates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(STRATEGY_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => applyTemplate(key)}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {template.name}
                </h4>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {template.description}
                </p>
                <div className="mt-2 space-y-1">
                  {template.legs.map((leg, index) => (
                    <div key={index} className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      • {leg.action.toUpperCase()} {leg.type.toUpperCase()}: {leg.description}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy Configuration */}
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Strategy Configuration
            </h2>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Settings size={16} />
            </button>
          </div>

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

          {/* Strategy Type */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Strategy Type
            </label>
            <div className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
              {getStrategyType()}
            </div>
          </div>

          {/* Current BTC Price */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Current BTC Price
            </label>
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatPrice(currentPrice)}
            </div>
            <div className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Live' : 'Offline'}
            </div>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="mb-6 p-4 rounded-lg border">
              <h4 className={`text-sm font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Advanced Settings
              </h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={autoCalculate}
                    onChange={(e) => setAutoCalculate(e.target.checked)}
                    className="rounded"
                  />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Auto-calculate on price changes
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Strategy Legs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-md font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Strategy Legs ({strategy.legs.length})
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
                      value={leg.quantity === '' || leg.quantity == null ? '' : leg.quantity}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        const next = val === '' ? '' : Math.max(1, parseInt(val, 10) || 1);
                        updateLeg(leg.id, 'quantity', next);
                      }}
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
                      value={leg.option?.id != null ? String(leg.option.id) : ''}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedOption = products.find(p => String(p.id) === selectedId);
                        updateLeg(leg.id, 'option', selectedOption || null);
                      }}
                      className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                        darkMode 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Select Option</option>
                      {products.map(product => (
                        <option key={String(product.id)} value={String(product.id)}>
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
                      value={leg.price === '' || leg.price == null ? '' : leg.price}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateLeg(leg.id, 'price', val === '' ? '' : parseFloat(val));
                      }}
                      placeholder="Auto or enter price"
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
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          {strategyMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Cost */}
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign size={16} className="text-blue-600" />
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total Cost
                  </span>
                </div>
                <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatPrice(strategyMetrics.totalCost)}
                </div>
              </div>

              {/* Max Profit */}
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp size={16} className="text-green-600" />
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Max Profit
                  </span>
                </div>
                <div className="text-xl font-bold text-green-600">
                  {formatPrice(strategyMetrics.maxProfit)}
                </div>
              </div>

              {/* Max Loss */}
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingDown size={16} className="text-red-600" />
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Max Loss
                  </span>
                </div>
                <div className="text-xl font-bold text-red-600">
                  {formatPrice(strategyMetrics.maxLoss)}
                </div>
              </div>

              {/* Break Even */}
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Target size={16} className="text-purple-600" />
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Break Even
                  </span>
                </div>
                <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {strategyMetrics.breakEvenPoints.length > 0 
                    ? strategyMetrics.breakEvenPoints.map(p => formatPrice(p)).join(', ')
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
          )}

          {/* Greeks Dashboard */}
          {strategyMetrics && (
            <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Portfolio Greeks
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <TrendingUp size={14} className="text-blue-600" />
                    <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Delta
                    </span>
                  </div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatGreeks(strategyMetrics.totalDelta)}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Price sensitivity
                  </div>
                </div>

                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <Zap size={14} className="text-yellow-600" />
                    <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Gamma
                    </span>
                  </div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatGreeks(strategyMetrics.totalGamma)}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Delta sensitivity
                  </div>
                </div>

                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <Clock size={14} className="text-red-600" />
                    <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Theta
                    </span>
                  </div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatGreeks(strategyMetrics.totalTheta)}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Time decay
                  </div>
                </div>

                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <BarChart3 size={14} className="text-green-600" />
                    <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Vega
                    </span>
                  </div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatGreeks(strategyMetrics.totalVega)}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Volatility sensitivity
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Individual Legs */}
          {strategyMetrics && (
            <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Individual Legs
              </h2>
              <div className="space-y-3">
                {strategyMetrics.legs.map((leg, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Leg {index + 1}: {leg.action.toUpperCase()} {leg.option?.symbol}
                        </span>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Qty: {leg.quantity} | Price: {formatPrice(leg.price)}
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${leg.positionCost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPrice(leg.positionCost)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Delta: </span>
                        <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatGreeks(leg.positionDelta)}</span>
                      </div>
                      <div>
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Gamma: </span>
                        <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatGreeks(leg.positionGamma)}</span>
                      </div>
                      <div>
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Theta: </span>
                        <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatGreeks(leg.positionTheta)}</span>
                      </div>
                      <div>
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Vega: </span>
                        <span className={darkMode ? 'text-white' : 'text-gray-900'}>{formatGreeks(leg.positionVega)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!strategyMetrics && (
            <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Build a strategy and click "Calculate" to see results
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StrategyBuilder;
