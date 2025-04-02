import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSnackbar } from '../contexts/SnackbarContext';
import { logActivity } from '../lib/supabase';

const Items = () => {
  const { showSnackbar } = useSnackbar();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    sku: '',
    category_id: '',
    current_quantity: 0,
    unit: '',
    reorder_level: 0,
    barcode: '',
    qr_code: ''
  });

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [categoryFilter]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('items')
        .select(`
          *,
          categories:category_id(id, name)
        `)
        .order('name');
      
      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      showSnackbar('Failed to load items', 'error');
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
      showSnackbar('Failed to load categories', 'error');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('items')
        .insert([
          {
            name: newItem.name,
            description: newItem.description,
            sku: newItem.sku,
            category_id: newItem.category_id || null,
            current_quantity: newItem.current_quantity,
            unit: newItem.unit,
            reorder_level: newItem.reorder_level,
            barcode: newItem.barcode,
            qr_code: newItem.qr_code
          }
        ])
        .select();
      
      if (error) throw error;
      
      await logActivity('create', 'items', data[0].id, data[0]);
      
      showSnackbar('Item added successfully', 'success');
      setShowAddModal(false);
      setNewItem({
        name: '',
        description: '',
        sku: '',
        category_id: '',
        current_quantity: 0,
        unit: '',
        reorder_level: 0,
        barcode: '',
        qr_code: ''
      });
      
      fetchItems();
    } catch (error) {
      console.error('Error adding item:', error);
      showSnackbar(error.message || 'Failed to add item', 'error');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await logActivity('delete', 'items', id);
      
      showSnackbar('Item deleted successfully', 'success');
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      showSnackbar(error.message || 'Failed to delete item', 'error');
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">Inventory Items</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          Add New Item
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
            <input
              type="text"
              id="search"
              className="form-input"
              placeholder="Search by name, description or SKU"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="md:w-1/4">
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Category</label>
            <select
              id="category"
              className="form-input"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
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
                    SKU
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Unit
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reorder Level
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/items/${item.id}`} className="text-primary hover:text-primary-dark">
                          {item.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.sku || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.categories?.name || 'Uncategorized'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`${
                          item.current_quantity <= item.reorder_level 
                            ? 'text-red-600 dark:text-red-400 font-medium' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {item.current_quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.unit || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.reorder_level}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link to={`/items/${item.id}`} className="text-primary hover:text-primary-dark mr-3">
                          View
                        </Link>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddItem}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New Item</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                      <input
                        type="text"
                        id="name"
                        className="form-input"
                        required
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                      <textarea
                        id="description"
                        rows="3"
                        className="form-input"
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      ></textarea>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="sku" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
                        <input
                          type="text"
                          id="sku"
                          className="form-input"
                          value={newItem.sku}
                          onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                        <select
                          id="category"
                          className="form-input"
                          value={newItem.category_id}
                          onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
                        >
                          <option value="">Select Category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="current_quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                        <input
                          type="number"
                          id="current_quantity"
                          className="form-input"
                          required
                          min="0"
                          value={newItem.current_quantity}
                          onChange={(e) => setNewItem({ ...newItem, current_quantity: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                        <input
                          type="text"
                          id="unit"
                          className="form-input"
                          placeholder="e.g., pcs, kg, m"
                          value={newItem.unit}
                          onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="reorder_level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reorder Level *</label>
                        <input
                          type="number"
                          id="reorder_level"
                          className="form-input"
                          required
                          min="0"
                          value={newItem.reorder_level}
                          onChange={(e) => setNewItem({ ...newItem, reorder_level: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barcode</label>
                        <input
                          type="text"
                          id="barcode"
                          className="form-input"
                          value={newItem.barcode}
                          onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="qr_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">QR Code</label>
                        <input
                          type="text"
                          id="qr_code"
                          className="form-input"
                          value={newItem.qr_code}
                          onChange={(e) => setNewItem({ ...newItem, qr_code: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Add Item
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
    </div>
  );
};

export default Items;
