import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Moon, Sun, Menu, X } from 'lucide-react';
import io from 'socket.io-client';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import OptionChain from './components/OptionChain';
import StrategyBuilder from './components/StrategyBuilder';
import PayoffChart from './components/PayoffChart';
import Backtesting from './components/Backtesting';
import Dashboard from './components/Dashboard';

// Context
import { ThemeProvider } from './context/ThemeContext';
import { DataProvider } from './context/DataContext';

// Services
import { apiService } from './services/apiService';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !darkMode;
    setDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeProvider value={{ darkMode, toggleTheme }}>
      <DataProvider value={{ socket, isConnected }}>
        <Router>
          <div className={`min-h-screen transition-colors duration-200 ${
            darkMode 
              ? 'bg-gray-900 text-white' 
              : 'bg-gray-50 text-gray-900'
          }`}>
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                onClick={toggleSidebar}
              />
            )}

            {/* Sidebar */}
            <Sidebar 
              isOpen={sidebarOpen} 
              onClose={toggleSidebar}
              darkMode={darkMode}
            />

            {/* Main content */}
            <div className="lg:pl-64">
              {/* Header */}
              <Header 
                darkMode={darkMode}
                toggleTheme={toggleTheme}
                toggleSidebar={toggleSidebar}
                isConnected={isConnected}
              />

              {/* Main content area */}
              <main className="p-4 lg:p-6">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/option-chain" element={<OptionChain />} />
                  <Route path="/strategy-builder" element={<StrategyBuilder />} />
                  <Route path="/payoff-chart" element={<PayoffChart />} />
                  <Route path="/backtesting" element={<Backtesting />} />
                </Routes>
              </main>
            </div>

            {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: darkMode ? '#374151' : '#ffffff',
                  color: darkMode ? '#ffffff' : '#374151',
                  border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`,
                },
              }}
            />
          </div>
        </Router>
      </DataProvider>
    </ThemeProvider>
  );
}

export default App;
