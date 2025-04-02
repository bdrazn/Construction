import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSnackbar } from '../contexts/SnackbarContext';
import { format } from 'date-fns';

const Transactions = () => {
  const { showSnackbar } = useSnackbar();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({
    item_id: '',
    type: '',
    location_id: '',
    project_id: '',
    dateFrom: '',
    dateTo: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    fetchTransactions();
    fetchItems();
    fetchLocations();
    fetchProjects();
  }, [page, filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('inventory_transactions')
        .select(`
          *,
          items:item_id(id, name),
          locations:location_id(id, name),
          projects:project_id(id, name),
          users:user_id(id, name, email)
        `, { count: 'exact' });
      
      // Apply filters
      if (filters.item_id) {
        query = query.eq('item_id', filters.item_id);
      }
      
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters.location_id) {
        query = query.eq('location_id', filters.location_id);
      }
      
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      
      if (filters.dateFrom) {
        query = query.gte('date', new Date(filters.dateFrom).toISOString());
      }
      
      if (filters.dateTo) {
        // Add one day to include the end date
        const endDate = new Date(filters.dateTo);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lt('date', endDate.toISOString());
      }
      
      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query
        .order('date', { ascending: false })
        .range(from, to);
      
      const { data, count, error } = await query;
      
      if (error) throw error;
      
      setTransactions(data || []);
      setTotalPages(Math.ceil((count || 0) / pageSize));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showSnackbar('Failed to load transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      item_id: '',
      type: '',
      location_id: '',
      project_id: '',
      dateFrom: '',
      dateTo: ''
    });
    setPage(1);
  };

  const getTransactionTypeClass = (type) => {
    switch (type) {
      case 'in':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'out':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Transactions</h1>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="item_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item</label>
            <select
              id="item_id"
              name="item_id"
              className="form-input"
              value={filters.item_id}
              onChange={handleFilterChange}
            >
              <option value="">All Items</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Type</label>
            <select
              id="type"
              name="type"
              className="form-input"
              value={filters.type}
              onChange={handleFilterChange}
            >
              <option value="">All Types</option>
              <option value="in">In</option>
              <option value="out">Out</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="location_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <select
              id="location_id"
              name="location_id"
              className="form-input"
              value={filters.location_id}
              onChange={handleFilterChange}
            >
              <option value="">All Locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project</label>
            <select
              id="project_id"
              name="project_id"
              className="form-input"
              value={filters.project_id}
              onChange={handleFilterChange}
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
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
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Item
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Location
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Project
                    </th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {format(new Date(transaction.date), 'MMM d, yyyy h:mm a')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <Link to={`/items/${transaction.item_id}`} className="text-primary hover:text-primary-dark">
                            {transaction.items?.name || 'Unknown Item'}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTransactionTypeClass(transaction.type)}`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {transaction.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {transaction.locations?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {transaction.projects?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {transaction.users?.name || transaction.users?.email || 'Unknown User'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {transaction.notes || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No transactions found
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

export default Transactions;
