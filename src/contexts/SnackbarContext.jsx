import React, { createContext, useContext, useState } from 'react';

const SnackbarContext = createContext();

export function useSnackbar() {
  return useContext(SnackbarContext);
}

export function SnackbarProvider({ children }) {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info', // 'success', 'info', 'warning', 'error'
  });

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const hideSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  const value = {
    snackbar,
    showSnackbar,
    hideSnackbar,
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {snackbar.open && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-md shadow-lg z-50 ${
          snackbar.severity === 'error' ? 'bg-red-500' :
          snackbar.severity === 'warning' ? 'bg-yellow-500' :
          snackbar.severity === 'success' ? 'bg-green-500' :
          'bg-blue-500'
        } text-white`}>
          <div className="flex items-center">
            <span>{snackbar.message}</span>
            <button 
              onClick={hideSnackbar}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </SnackbarContext.Provider>
  );
}
