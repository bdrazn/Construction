import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { SnackbarProvider } from './contexts/SnackbarContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SnackbarProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SnackbarProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
