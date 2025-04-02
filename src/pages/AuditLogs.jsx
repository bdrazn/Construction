import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSnackbar } from '../contexts/SnackbarContext';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

const AuditLogs = () => {
  const { showSnackbar } = useSnackbar();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;
  const [filters, setFilters] = useState({
    actionType: '',
    targetType: '',
    userId: '',
    dateFrom: '',
    dateTo: ''
  });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, [page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          users:user_id(id, name, email)
        `, { count: 'exact' });
      
      // Apply filters
      if (filters.actionType) {
        query = query.eq('action_type', filters.actionType);
      }
      
      if (filters.targetType) {
        query = query.eq('target_type', filters.targetType);
      }
      
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      if (filters.dateFrom) {
        query = query.gte('timestamp', new Date(filters.dateFrom).toISOString());
      }
      
      if (filters.dateTo) {
        // Add one day to include the end date
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('timestamp', endDate.toISOString());
      }
      
      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query
        .order('timestamp', { ascending: false })
        .range(from, to);
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setLogs(data || []);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      showSnackbar('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .order('name');
      
      if (error) throw error;
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      actionType: '',
      targetType: '',
      userId: '',
      dateFrom: '',
      dateTo: ''
    });
    setPage(1);
  };

  const exportToExcel = () => {
    try {
      // Prepare data for export
      const dataToExport = logs.map(log => ({
        'Timestamp': format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        'User': log.users?.name || log.users?.email || 'System',
        'Action': log.action_type,
        'Target Type': log.target_type,
        'Target ID': log.target_id,
        'Details': JSON.stringify(log.data_snapshot)
      }));
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
      
      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const filename = `Audit_Logs_${date}.xlsx`;
      
      // Write workbook and trigger download
      XLSX.writeFile(wb, filename);
      
      showSnackbar('Audit logs exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showSnackbar('Failed to export audit logs', 'error');
    }
  };

  const getActionTypeColor = (actionType) => {
    switch (actionType) {
      case 'create':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'update':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'login':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'logout':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getTargetTypeColor = (targetType) => {
    switch (targetType) {
      case 'users':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'items':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'categories':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'locations':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'projects':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'inventory_transactions':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Track system activities and changes</p>
        </div>
        <button
          onClick={exportToExcel}
          className="mt-4 sm:mt-0 btn bg-green-600 hover:bg-green-700 text-white"
          disabled={logs.length === 0}
        >
          Export to Excel
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="actionType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action Type</label>
            <select
              id="actionType"
              name="actionType"
              className="form-input"
              value={filters.actionType}
              onChange={handleFilterChange}
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="reset_password">Reset Password</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="targetType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Type</label>
            <select
              id="targetType"
              name="targetType"
              className="form-input"
              value={filters.targetType}
              onChange={handleFilterChange}
            >
              <option value="">All Targets</option>
              <option value="users">Users</option>
              <option value="items">Items</option>
              <option value="categories">Categories</option>
              <option value="locations">Locations</option>
              <option value="projects">Projects</option>
              <option value="inventory_transactions">Inventory Transactions</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User</label>
            <select
              id="userId"
              name="userId"
              className="form-input"
              value={filters.userId}
              onChange={handleFilterChange}
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date From</label>
            <input
              type="date"
              id="dateFrom"
              name="dateFrom"
              className="form-input"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
          </div>
          
          <div>
            <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date To</label>
            <input
              type="date"
              id="dateTo"
              name="dateTo"
              className="form-input"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Target Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Target ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {format(new Date(log.timestamp), 'MMM d, yyyy h:mm:ss a')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {log.users?.name || log.users?.email || 'System'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionTypeColor(log.action_type)}`}>
                            {log.action_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTargetTypeColor(log.target_type)}`}>
                            {log.target_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className="font-mono">{log.target_id}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          <details>
                            <summary className="cursor-pointer text-primary hover:text-primary-dark">View Data</summary>
                            <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-40">
                              {JSON.stringify(log.data_snapshot, null, 2)}
                            </pre>
                          </details>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No audit logs found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <nav className="flex items-center">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded-md mr-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  Previous
                </button>
                
                <div className="flex items-center">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show pages around current page
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-1 rounded-md mx-1 ${
                          page === pageNum
                            ? 'bg-primary text-white'
                            : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded-md ml-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuditLogs;
