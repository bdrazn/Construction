import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../lib/supabase';

const Users = () => {
  const { showSnackbar } = useSnackbar();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'staff',
    status: 'active',
    password: '',
    confirmPassword: ''
  });
  const [editUser, setEditUser] = useState(null);

  const userRoles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'staff', label: 'Staff' }
  ];

  const userStatuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showSnackbar('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (newUser.password !== newUser.confirmPassword) {
      showSnackbar('Passwords do not match', 'error');
      return;
    }
    
    try {
      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password
      });
      
      if (authError) throw authError;
      
      if (authData.user) {
        // Then create the user profile
        const { data, error } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: newUser.email,
              name: newUser.name,
              role: newUser.role,
              status: newUser.status
            }
          ])
          .select();
        
        if (error) throw error;
        
        await logActivity('create', 'users', data[0].id, {
          ...data[0],
          password: '********' // Don't log the actual password
        });
        
        showSnackbar('User added successfully', 'success');
        setShowAddModal(false);
        setNewUser({
          email: '',
          name: '',
          role: 'staff',
          status: 'active',
          password: '',
          confirmPassword: ''
        });
        
        fetchUsers();
      }
    } catch (error) {
      console.error('Error adding user:', error);
      showSnackbar(error.message || 'Failed to add user', 'error');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editUser.name,
          role: editUser.role,
          status: editUser.status
        })
        .eq('id', editUser.id);
      
      if (error) throw error;
      
      await logActivity('update', 'users', editUser.id, editUser);
      
      showSnackbar('User updated successfully', 'success');
      setShowEditModal(false);
      setEditUser(null);
      
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showSnackbar(error.message || 'Failed to update user', 'error');
    }
  };

  const handleResetPassword = async (userId, email) => {
    if (!confirm('Are you sure you want to send a password reset email to this user?')) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      
      await logActivity('reset_password', 'users', userId);
      
      showSnackbar('Password reset email sent successfully', 'success');
    } catch (error) {
      console.error('Error sending password reset:', error);
      showSnackbar(error.message || 'Failed to send password reset', 'error');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      // First, check if this is the current user
      if (id === currentUser.id) {
        showSnackbar('You cannot delete your own account', 'error');
        return;
      }
      
      // Check if this is the last admin
      if (users.filter(u => u.role === 'admin').length <= 1 && users.find(u => u.id === id)?.role === 'admin') {
        showSnackbar('Cannot delete the last administrator account', 'error');
        return;
      }
      
      // Delete the user profile
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (profileError) throw profileError;
      
      // Note: In a real application, you might want to use Supabase admin functions to delete the auth user as well
      // This requires server-side code with admin privileges
      
      await logActivity('delete', 'users', id);
      
      showSnackbar('User deleted successfully', 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showSnackbar(error.message || 'Failed to delete user', 'error');
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'staff':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          Add User
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className={user.id === currentUser.id ? 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.name}
                        {user.id === currentUser.id && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(You)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                          {userRoles.find(r => r.value === user.role)?.label || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(user.status)}`}>
                          {userStatuses.find(s => s.value === user.status)?.label || user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditUser(user);
                            setShowEditModal(true);
                          }}
                          className="text-primary hover:text-primary-dark mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleResetPassword(user.id, user.email)}
                          className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300 mr-3"
                        >
                          Reset Password
                        </button>
                        {user.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddUser}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New User</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                      <input
                        type="text"
                        id="name"
                        className="form-input"
                        required
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                      <input
                        type="email"
                        id="email"
                        className="form-input"
                        required
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                      <select
                        id="role"
                        className="form-input"
                        required
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      >
                        {userRoles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status *</label>
                      <select
                        id="status"
                        className="form-input"
                        required
                        value={newUser.status}
                        onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                      >
                        {userStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                      <input
                        type="password"
                        id="password"
                        className="form-input"
                        required
                        minLength="6"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Password must be at least 6 characters long.
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password *</label>
                      <input
                        type="password"
                        id="confirmPassword"
                        className="form-input"
                        required
                        value={newUser.confirmPassword}
                        onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Add User
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit User Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleEditUser}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Edit User</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                      <input
                        type="text"
                        id="edit-name"
                        className="form-input"
                        required
                        value={editUser.name}
                        onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <input
                        type="email"
                        id="edit-email"
                        className="form-input bg-gray-100 dark:bg-gray-700"
                        value={editUser.email}
                        disabled
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Email cannot be changed.
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                      <select
                        id="edit-role"
                        className="form-input"
                        required
                        value={editUser.role}
                        onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                        disabled={editUser.id === currentUser.id && currentUser.role === 'admin'}
                      >
                        {userRoles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      {editUser.id === currentUser.id && currentUser.role === 'admin' && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          You cannot change your own admin role.
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status *</label>
                      <select
                        id="edit-status"
                        className="form-input"
                        required
                        value={editUser.status}
                        onChange={(e) => setEditUser({ ...editUser, status: e.target.value })}
                        disabled={editUser.id === currentUser.id}
                      >
                        {userStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      {editUser.id === currentUser.id && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          You cannot change your own status.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
