import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSnackbar } from '../contexts/SnackbarContext';
import { logActivity } from '../lib/supabase';
import { format } from 'date-fns';

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [item, setItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState('in');
  const [newTransaction, setNewTransaction] = useState({
    quantity: 1,
    location_id: '',
    project_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchItem();
    fetchCategories();
    fetchLocations();
    fetchProjects();
    fetchTransactions();
  }, [id]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          categories:category_id(id, name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setItem(data);
    } catch (error) {
      console.error('Error fetching item:', error);
      showSnackbar('Failed to load item details', 'error');
      navigate('/items');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
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
        .select('*')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          locations:location_id(name),
          projects:project_id(name),
          users:user_id(name)
        `)
        .eq('item_id', id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleUpdateItem = async () => {
    try {
      const { error } = await supabase
        .from('items')
        .update({
          name: item.name,
          description: item.description,
          sku: item.sku,
          category_id: item.category_id,
          current_quantity: item.current_quantity,
          unit: item.unit,
          reorder_level: item.reorder_level,
          barcode: item.barcode,
          qr_code: item.qr_code
        })
        .eq('id', id);
      
      if (error) throw error;
      
      await logActivity('update', 'items', id, item);
      
      showSnackbar('Item updated successfully', 'success');
      setEditing(false);
      fetchItem();
    } catch (error) {
      console.error('Error updating item:', error);
      showSnackbar(error.message || 'Failed to update item', 'error');
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    
    try {
      // Calculate new quantity
      let newQuantity = item.current_quantity;
      if (transactionType === 'in') {
        newQuantity += parseInt(newTransaction.quantity);
      } else if (transactionType === 'out') {
        newQuantity -= parseInt(newTransaction.quantity);
        
        if (newQuantity < 0) {
          showSnackbar('Cannot remove more items than available in stock', 'error');
          return;
        }
      } else {
        newQuantity = parseInt(newTransaction.quantity);
      }
      
      // Start a transaction
      const { data: userData } = await supabase.auth.getUser();
      
      // Add transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert([
          {
            item_id: id,
            type: transactionType,
            quantity: parseInt(newTransaction.quantity),
            location_id: newTransaction.location_id || null,
            project_id: newTransaction.project_id || null,
            user_id: userData.user.id,
            date: new Date().toISOString(),
            notes: newTransaction.notes
          }
        ])
        .select();
      
      if (transactionError) throw transactionError;
      
      // Update item quantity
      const { error: updateError } = await supabase
        .from('items')
        .update({ current_quantity: newQuantity })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      await logActivity('create', 'inventory_transactions', transactionData[0].id, {
        ...transactionData[0],
        resulting_quantity: newQuantity
      });
      
      showSnackbar('Transaction added successfully', 'success');
      setShowTransactionModal(false);
      setNewTransaction({
        quantity: 1,
        location_id: '',
        project_id: '',
        notes: ''
      });
      
      fetchItem();
      fetchTransactions();
    } catch (error) {
      console.error('Error adding transaction:', error);
      showSnackbar(error.message || 'Failed to add transaction', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Item Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">The item you're looking for doesn't exist or has been removed.</p>
        <Link to="/items" className="btn btn-primary">
          Back to Items
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/items" className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {item.name}
          </h1>
        </div>
        <div className="flex space-x-2">
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                className="btn btn-primary"
              >
                Edit
              </button>
              <button
                onClick={() => setShowTransactionModal(true)}
                className="btn btn-secondary"
              >
                Add Transaction
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleUpdateItem}
                className="btn btn-primary"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="btn bg-gray-500 hover:bg-gray-600 text-white"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Item Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                {editing ? (
                  <input
                    type="text"
                    className="form-input"
                    value={item.name}
                    onChange={(e) => setItem({ ...item, name: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{item.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
                {editing ? (
                  <input
                    type="text"
                    className="form-input"
                    value={item.sku || ''}
                    onChange={(e) => setItem({ ...item, sku: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{item.sku || 'N/A'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                {editing ? (
                  <select
                    className="form-input"
                    value={item.category_id || ''}
                    onChange={(e) => setItem({ ...item, category_id: e.target.value || null })}
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900 dark:text-white">{item.categories?.name || 'Uncategorized'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Quantity</label>
                {editing ? (
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={item.current_quantity}
                    onChange={(e) => setItem({ ...item, current_quantity: parseInt(e.target.value) || 0 })}
                  />
                ) : (
                  <p className={`text-lg font-semibold ${
                    item.current_quantity <= item.reorder_level 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {item.current_quantity} {item.unit}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                {editing ? (
                  <input
                    type="text"
                    className="form-input"
                    value={item.unit || ''}
                    onChange={(e) => setItem({ ...item, unit: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{item.unit || 'N/A'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reorder Level</label>
                {editing ? (
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={item.reorder_level}
                    onChange={(e) => setItem({ ...item, reorder_level: parseInt(e.target.value) || 0 })}
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{item.reorder_level}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barcode</label>
                {editing ? (
                  <input
                    type="text"
                    className="form-input"
                    value={item.barcode || ''}
                    onChange={(e) => setItem({ ...item, barcode: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{item.barcode || 'N/A'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">QR Code</label>
                {editing ? (
                  <input
                    type="text"
                    className="form-input"
                    value={item.qr_code || ''}
                    onChange={(e) => setItem({ ...item, qr_code: e.target.value })}
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{item.qr_code || 'N/A'}</p>
                )}
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              {editing ? (
                <textarea
                  className="form-input"
                  rows="4"
                  value={item.description || ''}
                  onChange={(e) => setItem({ ...item, description: e.target.value })}
                ></textarea>
              ) : (
                <p className="text-gray-900 dark:text-white whitespace-pre-line">{item.description || 'No description provided.'}</p>
              )}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Transaction History</h2>
            
            {transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
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
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        User
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {format(new Date(transaction.date), 'MMM d, yyyy h:mm a')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            transaction.type === 'in' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                            transaction.type === 'out' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
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
                          {transaction.users?.name || 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No transactions recorded for this item.</p>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Stock Status</h2>
            
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Stock</span>
                <span className={`text-sm font-medium ${
                  item.current_quantity <= item.reorder_level 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {item.current_quantity} / {item.reorder_level} (Reorder Level)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${
                    item.current_quantity <= item.reorder_level 
                      ? 'bg-red-600' 
                      : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(100, (item.current_quantity / Math.max(item.reorder_level * 2, 1)) * 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setTransactionType('in');
                    setShowTransactionModal(true);
                  }}
                  className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md"
                >
                  Add Stock
                </button>
                <button
                  onClick={() => {
                    setTransactionType('out');
                    setShowTransactionModal(true);
                  }}
                  className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md"
                >
                  Remove Stock
                </button>
                <button
                  onClick={() => {
                    setTransactionType('adjustment');
                    setShowTransactionModal(true);
                  }}
                  className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-md"
                >
                  Adjust Stock
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Item Image</h2>
            
            <div className="flex justify-center">
              <img 
                src={`https://source.unsplash.com/400x300/?construction,tool,${encodeURIComponent(item.name)}`} 
                alt={item.name} 
                className="rounded-lg max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddTransaction}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {transactionType === 'in' ? 'Add Stock' : 
                     transactionType === 'out' ? 'Remove Stock' : 
                     'Adjust Stock'}
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {transactionType === 'adjustment' ? 'New Quantity' : 'Quantity'}
                      </label>
                      <input
                        type="number"
                        id="quantity"
                        className="form-input"
                        required
                        min="1"
                        value={newTransaction.quantity}
                        onChange={(e) => setNewTransaction({ ...newTransaction, quantity: parseInt(e.target.value) || 1 })}
                      />
                      {transactionType === 'in' && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          New total will be: {item.current_quantity + parseInt(newTransaction.quantity)}
                        </p>
                      )}
                      {transactionType === 'out' && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          New total will be: {Math.max(0, item.current_quantity - parseInt(newTransaction.quantity))}
                        </p>
                      )}
                      {transactionType === 'adjustment' && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Current quantity: {item.current_quantity}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                      <select
                        id="location"
                        className="form-input"
                        value={newTransaction.location_id}
                        onChange={(e) => setNewTransaction({ ...newTransaction, location_id: e.target.value })}
                      >
                        <option value="">Select Location</option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project</label>
                      <select
                        id="project"
                        className="form-input"
                        value={newTransaction.project_id}
                        onChange={(e) => setNewTransaction({ ...newTransaction, project_id: e.target.value })}
                      >
                        <option value="">Select Project</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                      <textarea
                        id="notes"
                        rows="3"
                        className="form-input"
                        placeholder="Add any additional information"
                        value={newTransaction.notes}
                        onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                      transactionType === 'in' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' : 
                      transactionType === 'out' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 
                      'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                    }`}
                  >
                    {transactionType === 'in' ? 'Add Stock' : 
                     transactionType === 'out' ? 'Remove Stock' : 
                     'Adjust Stock'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowTransactionModal(false)}
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

export default ItemDetail;
