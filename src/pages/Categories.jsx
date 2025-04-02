import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSnackbar } from '../contexts/SnackbarContext';
import { logActivity } from '../lib/supabase';

const Categories = () => {
  const { showSnackbar } = useSnackbar();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });
  const [editCategory, setEditCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          items:items(id)
        `)
        .order('name');
      
      if (error) throw error;
      
      const categoriesWithCount = data.map(category => ({
        ...category,
        itemCount: category.items ? category.items.length : 0
      }));
      
      setCategories(categoriesWithCount);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showSnackbar('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([
          {
            name: newCategory.name,
            description: newCategory.description
          }
        ])
        .select();
      
      if (error) throw error;
      
      await logActivity('create', 'categories', data[0].id, data[0]);
      
      showSnackbar('Category added successfully', 'success');
      setShowAddModal(false);
      setNewCategory({
        name: '',
        description: ''
      });
      
      fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      showSnackbar(error.message || 'Failed to add category', 'error');
    }
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: editCategory.name,
          description: editCategory.description
        })
        .eq('id', editCategory.id);
      
      if (error) throw error;
      
      await logActivity('update', 'categories', editCategory.id, editCategory);
      
      showSnackbar('Category updated successfully', 'success');
      setShowEditModal(false);
      setEditCategory(null);
      
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      showSnackbar(error.message || 'Failed to update category', 'error');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Are you sure you want to delete this category? Items in this category will become uncategorized.')) return;
    
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await logActivity('delete', 'categories', id);
      
      showSnackbar('Category deleted successfully', 'success');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      showSnackbar(error.message || 'Failed to delete category', 'error');
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          Add Category
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.length > 0 ? (
            categories.map((category) => (
              <div key={category.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{category.name}</h2>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {category.itemCount} items
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {category.description || 'No description provided.'}
                  </p>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setEditCategory(category);
                        setShowEditModal(true);
                      }}
                      className="text-primary hover:text-primary-dark"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No categories found. Add your first category to get started.</p><button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary mx-auto"
              >
                Add Category
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddCategory}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New Category</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                      <input
                        type="text"
                        id="name"
                        className="form-input"
                        required
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                      <textarea
                        id="description"
                        rows="3"
                        className="form-input"
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Add Category
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
      
      {/* Edit Category Modal */}
      {showEditModal && editCategory && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleEditCategory}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Edit Category</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                      <input
                        type="text"
                        id="edit-name"
                        className="form-input"
                        required
                        value={editCategory.name}
                        onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                      <textarea
                        id="edit-description"
                        rows="3"
                        className="form-input"
                        value={editCategory.description || ''}
                        onChange={(e) => setEditCategory({ ...editCategory, description: e.target.value })}
                      ></textarea>
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

export default Categories;
