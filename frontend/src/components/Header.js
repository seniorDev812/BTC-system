import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Menu, Wifi, WifiOff } from 'lucide-react';

const Header = ({ toggleSidebar, isConnected }) => {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <header className={`sticky top-0 z-30 border-b transition-colors duration-200 ${
      darkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={toggleSidebar}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              darkMode 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-600 hover:bg-gray-100'
            } lg:hidden`}
          >
            <Menu size={20} />
          </button>

          {/* Logo/Brand */}
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              darkMode 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-100 text-blue-600'
            }`}>
              BTC
            </div>
            <div className="hidden sm:block">
              <h1 className={`font-semibold text-lg ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Options Simulator
              </h1>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {/* Connection status */}
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
              isConnected
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {isConnected ? (
                <Wifi size={12} className="text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff size={12} className="text-red-600 dark:text-red-400" />
              )}
              <span className="hidden sm:inline">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              darkMode 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
