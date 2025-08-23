import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { apiService } from '../services/apiService';
import { Search, Filter, ArrowUpDown, Calendar, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const OptionChain = () => {
  const { darkMode } = useTheme();
  const { socket, isConnected } = useData();
  const [products, setProducts] = useState([]);
  const [marketData, setMarketData] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExpiry, setSelectedExpiry] = useState('all');
  const [sortBy, setSortBy] = useState('strike');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    fetchData();
    
    if (socket) {
      socket.on('marketUpdate', (data) => {
        setMarketData(prev => ({ ...prev, ...data }));
      });
    }

    return () => {
      if (socket) {
        socket.off('marketUpdate');
      }
    };
  }, [socket]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsResponse, marketResponse] = await Promise.all([
        apiService.getProducts(),
        apiService.getMarketData()
      ]);

      if (productsResponse.success) {
        setProducts(productsResponse.data);
      }
      if (marketResponse.success) {
        setMarketData(marketResponse.data);
      }
    } catch (error) {
      toast.error('Failed to fetch option chain data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExpiryDates = () => {
    const dates = [...new Set(products.map(p => p.expirationDate))];
    return dates.sort();
  };

  const getMarketDataForProduct = (productId) => {
    return marketData[productId] || {};
  };

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesExpiry = selectedExpiry === 'all' || product.expirationDate === selectedExpiry;
      return matchesSearch && matchesExpiry;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'strike':
          comparison = a.strikePrice - b.strikePrice;
          break;
        case 'expiry':
          comparison = new Date(a.expirationDate) - new Date(b.expirationDate);
          break;
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const expiry = product.expirationDate;
    if (!acc[expiry]) {
      acc[expiry] = [];
    }
    acc[expiry].push(product);
    return acc;
  }, {});

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formatPrice = (price) => {
    return price ? `$${parseFloat(price).toFixed(2)}` : 'N/A';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getContractTypeColor = (type) => {
    switch (type) {
      case 'call_option':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'put_option':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      case 'futures':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Option Chain
        </h1>
        <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          BTC Options & Futures from Delta Exchange
        </p>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>

          {/* Expiry Filter */}
          <div className="lg:w-48">
            <select
              value={selectedExpiry}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Expiries</option>
              {getExpiryDates().map(date => (
                <option key={date} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Option Chain Table */}
      <div className={`rounded-lg border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('symbol')}
                    className="flex items-center space-x-1 hover:text-blue-600"
                  >
                    <span>Symbol</span>
                    <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('strike')}
                    className="flex items-center space-x-1 hover:text-blue-600"
                  >
                    <span>Strike</span>
                    <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('expiry')}
                    className="flex items-center space-x-1 hover:text-blue-600"
                  >
                    <span>Expiry</span>
                    <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                  Last Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                  Bid
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                  Ask
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                  Volume
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                  OI
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredProducts.map((product) => {
                const marketInfo = getMarketDataForProduct(product.id);
                return (
                  <tr key={product.id} className={`option-chain-row hover:bg-opacity-50 ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {product.symbol}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatPrice(product.strikePrice)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatDate(product.expirationDate)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getContractTypeColor(product.contractType)}`}>
                        {product.contractType.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatPrice(marketInfo.last_price)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatPrice(marketInfo.best_bid)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatPrice(marketInfo.best_ask)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {marketInfo.volume_24h ? marketInfo.volume_24h.toLocaleString() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {marketInfo.open_interest ? marketInfo.open_interest.toLocaleString() : 'N/A'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8">
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No options found matching your criteria
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Options
            </p>
            <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {filteredProducts.filter(p => p.contractType.includes('option')).length}
            </p>
          </div>
          <div>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Futures
            </p>
            <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {filteredProducts.filter(p => p.contractType === 'futures').length}
            </p>
          </div>
          <div>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Expiry Dates
            </p>
            <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {getExpiryDates().length}
            </p>
          </div>
          <div>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Connection
            </p>
            <p className={`text-lg font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Live' : 'Offline'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionChain;
