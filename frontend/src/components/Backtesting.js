import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { apiService } from '../services/apiService';
import { 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Play,
  Pause,
  RotateCcw,
  Download,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const Backtesting = () => {
  const { darkMode } = useTheme();
  const { socket, isConnected } = useData();
  const [strategy, setStrategy] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [backtestResults, setBacktestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const formatPrice = (price) => {
    return price ? `$${parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '0.00%';
    return `${(parseFloat(value) * 100).toFixed(2)}%`;
  };

  const runBacktest = async () => {
    if (!strategy) {
      toast.error('Please load a strategy first');
      return;
    }

    try {
      setLoading(true);
      toast.success('Running backtest...');
      
      // Simulate backtest results
      setTimeout(() => {
        const results = {
          totalReturn: 0.15,
          maxDrawdown: -0.08,
          sharpeRatio: 1.2,
          winRate: 0.65,
          totalTrades: 45,
          profitableTrades: 29,
          averageReturn: 0.003,
          volatility: 0.12,
          equity: [
            { date: '2024-01-01', value: 10000 },
            { date: '2024-01-15', value: 10500 },
            { date: '2024-01-30', value: 11500 },
            { date: '2024-02-15', value: 11000 },
            { date: '2024-02-28', value: 12000 },
            { date: '2024-03-15', value: 12500 },
            { date: '2024-03-30', value: 11500 }
          ]
        };
        
        setBacktestResults(results);
        toast.success('Backtest completed successfully');
      }, 2000);
      
    } catch (error) {
      toast.error('Backtest failed');
      console.error('Backtest error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStrategy = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const strategyData = JSON.parse(e.target.result);
        setStrategy(strategyData);
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
      <div>
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Backtesting
        </h1>
        <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Test your strategies against historical market data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Backtest Configuration
          </h2>

          {/* Strategy Selection */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Strategy
            </label>
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Download size={24} className="text-gray-400 mb-2" />
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  JSON strategy file
                </p>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={loadStrategy}
                className="hidden"
              />
            </label>
            {strategy && (
              <div className="mt-2 p-2 bg-green-100 dark:bg-green-900 rounded text-sm">
                ✓ Strategy loaded: {strategy.name || 'Unnamed Strategy'}
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Run Backtest Button */}
          <button
            onClick={runBacktest}
            disabled={loading || !strategy}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="spinner"></div>
            ) : (
              <Play size={16} />
            )}
            <span>{loading ? 'Running...' : 'Run Backtest'}</span>
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {backtestResults ? (
            <>
              {/* Performance Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp size={16} className="text-green-600" />
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Total Return
                    </span>
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    {formatPercentage(backtestResults.totalReturn)}
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingDown size={16} className="text-red-600" />
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Max Drawdown
                    </span>
                  </div>
                  <div className="text-xl font-bold text-red-600">
                    {formatPercentage(backtestResults.maxDrawdown)}
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 size={16} className="text-blue-600" />
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Sharpe Ratio
                    </span>
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {backtestResults.sharpeRatio.toFixed(2)}
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock size={16} className="text-purple-600" />
                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Win Rate
                    </span>
                  </div>
                  <div className="text-xl font-bold text-purple-600">
                    {formatPercentage(backtestResults.winRate)}
                  </div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Detailed Results
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Trades</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {backtestResults.totalTrades}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Profitable Trades</p>
                    <p className={`text-lg font-bold text-green-600`}>
                      {backtestResults.profitableTrades}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Average Return</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatPercentage(backtestResults.averageReturn)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Volatility</p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatPercentage(backtestResults.volatility)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Equity Curve */}
              <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Equity Curve
                </h3>
                <div className="h-64 flex items-end justify-between space-x-1">
                  {backtestResults.equity.map((point, index) => {
                    const maxValue = Math.max(...backtestResults.equity.map(p => p.value));
                    const height = (point.value / maxValue) * 100;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div 
                          className={`w-full rounded-t transition-all duration-300 ${
                            point.value >= 10000 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ height: `${height}%` }}
                        ></div>
                        <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {new Date(point.date).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`text-center py-12 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                <p>Load a strategy and run backtest to see results</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Backtesting;
