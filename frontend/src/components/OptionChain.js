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
      console.log('Fetching option chain data...');
      
      const [productsResponse, marketResponse] = await Promise.all([
        apiService.getProducts(),
        apiService.getMarketData()
      ]);

      console.log('Products response:', productsResponse);
      console.log('Market response:', marketResponse);

      if (productsResponse.success) {
        console.log('Setting products:', productsResponse.data);
        setProducts(productsResponse.data);
      } else {
        console.error('Products response not successful:', productsResponse);
      }
      
      if (marketResponse.success) {
        console.log('Setting market data:', marketResponse.data);
        setMarketData(marketResponse.data);
      } else {
        console.error('Market response not successful:', marketResponse);
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

  const getMarketDataForProduct = (product) => {
    console.log('Getting market data for product:', product.symbol);
    console.log('Available market data keys:', Object.keys(marketData));
    
    // Try to find market data by exact symbol match first
    let marketInfo = marketData[product.symbol];
    
    // If not found, try to find by product ID
    if (!marketInfo) {
      marketInfo = marketData[product.id];
    }
    
    // If still not found, try to find by normalized symbol matching
    if (!marketInfo) {
      const normalizedProductSymbol = product.symbol.replace(/[^A-Z0-9]/g, ''); // Remove special chars
      const matchingKey = Object.keys(marketData).find(key => {
        const normalizedKey = key.replace(/[^A-Z0-9]/g, ''); // Remove special chars
        return normalizedKey.includes(normalizedProductSymbol) || 
               normalizedProductSymbol.includes(normalizedKey) ||
               key.toLowerCase().includes(product.symbol.toLowerCase()) ||
               product.symbol.toLowerCase().includes(key.toLowerCase());
      });
      if (matchingKey) {
        marketInfo = marketData[matchingKey];
        console.log('Found match by normalized symbol:', matchingKey, 'for', product.symbol);
      }
    }
    
    // If still not found, try to find by partial symbol match
    if (!marketInfo) {
      const productSymbolParts = product.symbol.split('-');
      const matchingKey = Object.keys(marketData).find(key => {
        const keyParts = key.split('-');
        return productSymbolParts.some(part => 
          keyParts.some(keyPart => 
            keyPart.includes(part) || part.includes(keyPart)
          )
        );
      });
      if (matchingKey) {
        marketInfo = marketData[matchingKey];
        console.log('Found match by partial symbol:', matchingKey, 'for', product.symbol);
      }
    }
    
    console.log('Found market info for', product.symbol, ':', marketInfo);
    
    // If no market data found, generate mock data for development
    if (!marketInfo || Object.keys(marketInfo).length === 0) {
      console.log('No market data found, generating mock data for:', product.symbol);
      marketInfo = {
        price: 100 + Math.random() * 50,
        bid: 95 + Math.random() * 40,
        ask: 105 + Math.random() * 60,
        volume_24h: Math.random() * 1000,
        open_interest: Math.random() * 500,
        change_24h: (Math.random() - 0.5) * 10,
        change_24h_percent: (Math.random() - 0.5) * 5
      };
    }
    
    // Ensure we have the correct field mappings for display
    return {
      // Price data
      price: marketInfo.price || marketInfo.last_price || marketInfo.mark_price || 0,
      last_price: marketInfo.last_price || marketInfo.price || marketInfo.mark_price || 0,
      // Bid/Ask data
      bid: marketInfo.bid || marketInfo.best_bid || 0,
      ask: marketInfo.ask || marketInfo.best_ask || 0,
      best_bid: marketInfo.best_bid || marketInfo.bid || 0,
      best_ask: marketInfo.best_ask || marketInfo.ask || 0,
      // Volume and OI
      volume_24h: marketInfo.volume_24h || marketInfo.volume || 0,
      volume: marketInfo.volume || marketInfo.volume_24h || 0,
      open_interest: marketInfo.open_interest || marketInfo.oi || 0,
      oi: marketInfo.oi || marketInfo.open_interest || 0,
      // Keep original data for debugging
      ...marketInfo
    };
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
    if (!dateString) return 'N/A';
    
    // Handle perpetual futures
    if (dateString === 'PERP') return 'PERP';
    
    // Handle Delta Exchange date format (YYMMDD)
    if (dateString.length === 6 && /^\d{6}$/.test(dateString)) {
      const year = '20' + dateString.substring(0, 2);
      const month = dateString.substring(2, 4);
      const day = dateString.substring(4, 6);
      return `${parseInt(month)}/${parseInt(day)}/${year}`;
    }
    
    // Handle regular date format
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return dateString;
    }
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
                const marketInfo = getMarketDataForProduct(product);
                console.log(`Product ${product.symbol}:`, {
                  symbol: product.symbol,
                  strike: product.strikePrice,
                  expiry: product.expirationDate,
                  type: product.contractType,
                  lastPrice: marketInfo.last_price,
                  bid: marketInfo.bid,
                  ask: marketInfo.ask,
                  volume: marketInfo.volume,
                  oi: marketInfo.oi
                });
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
                        {product.contractType === 'call_option' ? 'CALL' : 
                         product.contractType === 'put_option' ? 'PUT' : 
                         product.contractType.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {formatPrice(marketInfo.last_price)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatPrice(marketInfo.bid)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatPrice(marketInfo.ask)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {marketInfo.volume ? parseFloat(marketInfo.volume).toFixed(2) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {marketInfo.oi ? parseFloat(marketInfo.oi).toFixed(2) : 'N/A'}
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

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Debug Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Products Count:</p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{products.length}</p>
            </div>
            <div>
              <p className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Market Data Keys:</p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{Object.keys(marketData).slice(0, 10).join(', ')}...</p>
            </div>
            <div>
              <p className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Market Data Count:</p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{Object.keys(marketData).length}</p>
            </div>
          </div>
          
          {/* Sample Market Data */}
          <div className="mt-4">
            <p className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sample Market Data:</p>
            <pre className={`text-xs mt-2 p-2 rounded bg-gray-100 overflow-auto ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {JSON.stringify(Object.entries(marketData).slice(0, 3), null, 2)}
            </pre>
          </div>
          
          {/* Sample Products */}
          <div className="mt-4">
            <p className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sample Products:</p>
            <pre className={`text-xs mt-2 p-2 rounded bg-gray-100 overflow-auto ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {JSON.stringify(products.slice(0, 3), null, 2)}
            </pre>
          </div>
          
          {/* Filtered Products Count */}
          <div className="mt-4">
            <p className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Filtered Products:</p>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>{filteredProducts.length}</p>
          </div>
        </div>
      )}

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
