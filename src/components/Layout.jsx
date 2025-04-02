import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Icons
import DashboardIcon from '../assets/icons/DashboardIcon';
import InventoryIcon from '../assets/icons/InventoryIcon';
import CategoryIcon from '../assets/icons/CategoryIcon';
import LocationIcon from '../assets/icons/LocationIcon';
import ProjectIcon from '../assets/icons/ProjectIcon';
import TransactionIcon from '../assets/icons/TransactionIcon';
import ReportIcon from '../assets/icons/ReportIcon';
import UserIcon from '../assets/icons/UserIcon';
import SettingsIcon from '../assets/icons/SettingsIcon';
import LogoutIcon from '../assets/icons/LogoutIcon';
import AuditIcon from '../assets/icons/AuditIcon';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/dashboard', name: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/items', name: 'Inventory', icon: <InventoryIcon /> },
    { path: '/categories', name: 'Categories', icon: <CategoryIcon /> },
    { path: '/locations', name: 'Locations', icon: <LocationIcon /> },
    { path: '/projects', name: 'Projects', icon: <ProjectIcon /> },
    { path: '/transactions', name: 'Transactions', icon: <TransactionIcon /> },
    { path: '/reports', name: 'Reports', icon: <ReportIcon /> },
    { path: '/users', name: 'Users', icon: <UserIcon />, adminOnly: true },
    { path: '/audit-logs', name: 'Audit Logs', icon: <AuditIcon />, adminOnly: true },
    { path: '/settings', name: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div 
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:h-screen`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center h-16 px-4 border-b dark:border-gray-700">
            <h1 className="text-xl font-bold text-primary dark:text-white">CIMS</h1>
          </div>
          
          <div className="flex-1 px-4 py-4 overflow-y-auto">
            <nav className="space-y-1">
              {navItems.map((item) => {
                if (item.adminOnly && user?.role !== 'admin') return null;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive(item.path)
                        ? 'bg-primary text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="mr-3 h-5 w-5">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="px-4 py-2 border-t dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-2 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900 dark:hover:bg-opacity-20"
            >
              <span className="mr-3 h-5 w-5"><LogoutIcon /></span>
              Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navbar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className="ml-2 md:ml-0 text-lg font-semibold text-gray-900 dark:text-white">
                  {navItems.find(item => isActive(item.path))?.name || 'Dashboard'}
                </h1>
              </div>
              
              <div className="flex items-center">
                <div className="ml-3 relative">
                  <div className="flex items-center">
                    <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                      {user?.name || user?.email}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
