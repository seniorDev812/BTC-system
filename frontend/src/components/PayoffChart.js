import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { apiService } from '../services/apiService';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';
import { TrendingUp, DollarSign, Target } from 'lucide-react';
import toast from 'react-hot-toast';

const PayoffChart = () => {
  const { darkMode } = useTheme();
  const { socket, isConnected } = useData();
  const [products, setProducts] = useState([]);
  const [strategy, setStrategy] = useState({
    name: '',
    legs: []
  });
  const [currentPrice, setCurrentPrice] = useState(50000);
  const [payoffData, setPayoffData] = useState([]);
  const [breakEvenPoints, setBreakEvenPoints] = useState([]);
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

  const calculatePayoff = async () => {
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
        setPayoffData(response.data.payoffData);
        setBreakEvenPoints(response.data.breakEvenPoints);
        toast.success('Payoff chart calculated successfully');
      }
    } catch (error) {
      toast.error('Failed to calculate payoff chart');
      console.error('Error calculating payoff:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return price ? `$${parseFloat(price).toLocaleString()}` : 'N/A';
  };

  const formatTooltip = (value, name) => {
    if (name === 'payoff') {
      return [`$${value.toFixed(2)}`, 'Payoff'];
    }
    return [formatPrice(value), name];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg border shadow-lg ${
          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Price: {formatPrice(label)}
          </p>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Payoff: {formatPrice(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const chartColors = {
    line: darkMode ? '#3b82f6' : '#2563eb',
    area: darkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.1)',
    grid: darkMode ? '#374151' : '#e5e7eb',
    text: darkMode ? '#9ca3af' : '#6b7280'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Payoff Chart
        </h1>
        <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Visualize strategy payoffs and break-even points
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy Configuration */}
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Strategy Configuration
          </h2>

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
                <span>Add Leg</span>
              </button>
            </div>

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

            {strategy.legs.length === 0 && (
              <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No legs added. Click "Add Leg" to start building your strategy.
              </div>
            )}

            {/* Calculate Button */}
            <button
              onClick={calculatePayoff}
              disabled={loading || strategy.legs.length === 0}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <TrendingUp size={16} />
              )}
              <span>{loading ? 'Calculating...' : 'Calculate Payoff'}</span>
            </button>
          </div>
        </div>

        {/* Payoff Chart */}
        <div className="lg:col-span-2">
          <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Payoff Chart
            </h2>

            {payoffData.length > 0 ? (
              <div className="space-y-4">
                {/* Chart */}
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={payoffData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis 
                        dataKey="price" 
                        tickFormatter={(value) => formatPrice(value)}
                        stroke={chartColors.text}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatPrice(value)}
                        stroke={chartColors.text}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine 
                        x={currentPrice} 
                        stroke={darkMode ? '#ef4444' : '#dc2626'} 
                        strokeDasharray="3 3"
                        label="Current Price"
                      />
                      {breakEvenPoints.map((point, index) => (
                        <ReferenceLine
                          key={index}
                          x={point}
                          stroke={darkMode ? '#22c55e' : '#16a34a'}
                          strokeDasharray="3 3"
                          label={`Break Even ${index + 1}`}
                        />
                      ))}
                      <Area
                        type="monotone"
                        dataKey="payoff"
                        stroke={chartColors.line}
                        fill={chartColors.area}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Break-even Points */}
                {breakEvenPoints.length > 0 && (
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h3 className={`text-md font-medium mb-3 flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Target size={16} />
                      <span>Break-even Points</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {breakEvenPoints.map((point, index) => (
                        <span
                          key={index}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            darkMode 
                              ? 'bg-green-900 text-green-200' 
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {formatPrice(point)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary Stats */}
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className={`text-md font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Profit</p>
                      <p className={`text-lg font-bold text-green-600`}>
                        {formatPrice(Math.max(...payoffData.map(d => d.payoff)))}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Loss</p>
                      <p className={`text-lg font-bold text-red-600`}>
                        {formatPrice(Math.min(...payoffData.map(d => d.payoff)))}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Current Payoff</p>
                      <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatPrice(payoffData.find(d => d.price === currentPrice)?.payoff || 0)}
                      </p>
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Break-even Count</p>
                      <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {breakEvenPoints.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`text-center py-16 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
                <p>Build a strategy and calculate to see the payoff chart</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayoffChart;
