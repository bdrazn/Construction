import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
        <div className="mb-6">
          <img 
            src="https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" 
            alt="Construction tools" 
            className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-primary"
          />
        </div>
        
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-4">Page Not Found</h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Sorry, the page you are looking for doesn't exist or has been moved.
          We've searched our entire inventory but couldn't find what you're looking for.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <Link 
            to="/dashboard" 
            className="btn btn-primary"
          >
            Go to Dashboard
          </Link>
          <Link 
            to="/items" 
            className="btn bg-gray-500 hover:bg-gray-600 text-white"
          >
            View Inventory
          </Link>
        </div>
      </div>
      
      <div className="text-gray-500 dark:text-gray-400">
        <p>Need help? Contact your system administrator</p>
      </div>
    </div>
  );
};

export default NotFound;
