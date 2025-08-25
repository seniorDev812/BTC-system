import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import toast from 'react-hot-toast';

const TestData = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    const results = {};
    
    try {
      // Test health endpoint
      console.log('Testing health endpoint...');
      const healthResponse = await apiService.healthCheck();
      results.health = healthResponse;
      console.log('Health response:', healthResponse);
    } catch (error) {
      results.health = { error: error.message };
      console.error('Health test failed:', error);
    }

    try {
      // Test market data endpoint
      console.log('Testing market data endpoint...');
      const marketResponse = await apiService.getMarketData();
      results.marketData = {
        success: marketResponse.success,
        dataKeys: marketResponse.success ? Object.keys(marketResponse.data) : [],
        dataCount: marketResponse.success ? Object.keys(marketResponse.data).length : 0,
        sampleData: marketResponse.success ? Object.entries(marketResponse.data).slice(0, 2) : []
      };
      console.log('Market data response:', marketResponse);
    } catch (error) {
      results.marketData = { error: error.message };
      console.error('Market data test failed:', error);
    }

    try {
      // Test products endpoint
      console.log('Testing products endpoint...');
      const productsResponse = await apiService.getProducts();
      results.products = {
        success: productsResponse.success,
        dataCount: productsResponse.success ? productsResponse.data.length : 0,
        sampleData: productsResponse.success ? productsResponse.data.slice(0, 2) : []
      };
      console.log('Products response:', productsResponse);
    } catch (error) {
      results.products = { error: error.message };
      console.error('Products test failed:', error);
    }

    try {
      // Test matching endpoint
      console.log('Testing matching endpoint...');
      const matchingResponse = await apiService.testMatching();
      results.matching = matchingResponse;
      console.log('Matching response:', matchingResponse);
    } catch (error) {
      results.matching = { error: error.message };
      console.error('Matching test failed:', error);
    }

    setTestResults(results);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4">Running API Tests...</h2>
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold mb-4">API Test Results</h2>
      
      {/* Health Check */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">🔧 Health Check</h3>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(testResults.health, null, 2)}
        </pre>
      </div>
      
      {/* Market Data */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">📊 Market Data</h3>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(testResults.marketData, null, 2)}
        </pre>
      </div>
      
      {/* Products */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">📦 Products</h3>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(testResults.products, null, 2)}
        </pre>
      </div>
      
      {/* Matching Test */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">🔗 Data Matching</h3>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {JSON.stringify(testResults.matching, null, 2)}
        </pre>
      </div>
      
      <button 
        onClick={runTests}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Run Tests Again
      </button>
    </div>
  );
};

export default TestData;
