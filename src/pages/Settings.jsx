import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../lib/supabase';

const Settings = () => {
  const { showSnackbar } = useSnackbar();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: ''
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [systemSettings, setSystemSettings] = useState({
    lowStockThreshold: 5,
    defaultReorderLevel: 10,
    enableEmailNotifications: false,
    darkMode: localStorage.getItem('darkMode') === 'true'
  });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    if (!profile.name.trim()) {
      showSnackbar('Name cannot be empty', 'error');
      return;
    }
    
    try {
      setProfileLoading(true);
      
      const { error } = await supabase
        .from('users')
        .update({ name: profile.name })
        .eq('id', user.id);
      
      if (error) throw error;
      
      await logActivity('update', 'users', user.id, { name: profile.name });
      
      showSnackbar('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbar(error.message || 'Failed to update profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      showSnackbar('New passwords do not match', 'error');
      return;
    }
    
    if (passwords.newPassword.length < 6) {
      showSnackbar('Password must be at least 6 characters', 'error');
      return;
    }
    
    try {
      setPasswordLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      });
      
      if (error) throw error;
      
      await logActivity('update_password', 'users', user.id);
      
      showSnackbar('Password updated successfully', 'success');
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      showSnackbar(error.message || 'Failed to update password', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSystemSettingsUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // In a real application, you would save these to a settings table in the database
      // For this demo, we'll just simulate a successful update
      
      // Save dark mode preference to localStorage
      localStorage.setItem('darkMode', systemSettings.darkMode);
      
      // Apply dark mode
      if (systemSettings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      await logActivity('update', 'settings', 'system', systemSettings);
      
      showSnackbar('System settings updated successfully', 'success');
    } catch (error) {
      console.error('Error updating system settings:', error);
      showSnackbar(error.message || 'Failed to update system settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
      showSnackbar('Failed to log out', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      
      {/* Profile Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Profile Settings</h2>
        
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              id="name"
              className="form-input"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              id="email"
              className="form-input bg-gray-100 dark:bg-gray-700"
              value={profile.email}
              disabled
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Email cannot be changed.
            </p>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={profileLoading}
            >
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Password Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
        
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
            <input
              type="password"
              id="current-password"
              className="form-input"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
            <input
              type="password"
              id="new-password"
              className="form-input"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              required
              minLength="6"
            />
          </div>
          
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              id="confirm-password"
              className="form-input"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              required
              minLength="6"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={passwordLoading}
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
      
      {/* System Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">System Settings</h2>
        
        <form onSubmit={handleSystemSettingsUpdate} className="space-y-4">
          <div>
            <label htmlFor="low-stock-threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Low Stock Threshold (%)</label>
            <input
              type="number"
              id="low-stock-threshold"
              className="form-input"
              min="1"
              max="100"
              value={systemSettings.lowStockThreshold}
              onChange={(e) => setSystemSettings({ ...systemSettings, lowStockThreshold: parseInt(e.target.value) || 5 })}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Items will be marked as low stock when they fall below this percentage of their reorder level.
            </p>
          </div>
          
          <div>
            <label htmlFor="default-reorder-level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Reorder Level</label>
            <input
              type="number"
              id="default-reorder-level"
              className="form-input"
              min="0"
              value={systemSettings.defaultReorderLevel}
              onChange={(e) => setSystemSettings({ ...systemSettings, defaultReorderLevel: parseInt(e.target.value) || 10 })}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Default reorder level for new items.
            </p>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="email-notifications"
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              checked={systemSettings.enableEmailNotifications}
              onChange={(e) => setSystemSettings({ ...systemSettings, enableEmailNotifications: e.target.checked })}
            />
            <label htmlFor="email-notifications" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Enable Email Notifications
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="dark-mode"
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              checked={systemSettings.darkMode}
              onChange={(e) => setSystemSettings({ ...systemSettings, darkMode: e.target.checked })}
            />
            <label htmlFor="dark-mode" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Dark Mode
            </label>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Account Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Account Actions</h2>
        
        <div className="space-y-4">
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
