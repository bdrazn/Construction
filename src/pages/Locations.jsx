import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSnackbar } from '../contexts/SnackbarContext';
import { logActivity } from '../lib/supabase';

const Locations = () => {
  const { showSnackbar } = useSnackbar();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    type: 'warehouse'
  });
  const [editLocation, setEditLocation] = useState(null);

  const locationTypes = [
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'site', label: 'Construction Site' },
    { value: 'vehicle', label: 'Vehicle' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          items:inventory_transactions(item_id)
        `)
        .order('name');
      
      if (error) throw error;
      
      // Count unique items at each location
      const locationsWithItemCount = data.map(location => {
        const uniqueItems = new Set();
        location.items?.forEach(transaction => {
          if (transaction.item_id) {
            uniqueItems.add(transaction.item_id);
          }
        });
        
        return {
          ...location,
          itemCount: uniqueItems.size
        };
      });
      
      setLocations(locationsWithItemCount);
    } catch (error) {
      console.error('Error fetching locations:', error);
      showSnackbar('Failed to load locations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('locations')
        .insert([
          {
            name: newLocation.name,
            address: newLocation.address,
            type: newLocation.type
          }
        ])
        .select();
      
      if (error) throw error;
      
      await logActivity('create', 'locations', data[0].id, data[0]);
      
      showSnackbar('Location added successfully', 'success');
      setShowAddModal(false);
      setNewLocation({
        name: '',
        address: '',
        type: 'warehouse'
      });
      
      fetchLocations();
    } catch (error) {
      console.error('Error adding location:', error);
      showSnackbar(error.message || 'Failed to add location', 'error');
    }
  };

  const handleEditLocation = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('locations')
        .update({
          name: editLocation.name,
          address: editLocation.address,
          type: editLocation.type
        })
        .eq('id', editLocation.id);
      
      if (error) throw error;
      
      await logActivity('update', 'locations', editLocation.id, editLocation);
      
      showSnackbar('Location updated successfully', 'success');
      setShowEditModal(false);
      setEditLocation(null);
      
      fetchLocations();
    } catch (error) {
      console.error('Error updating location:', error);
      showSnackbar(error.message || 'Failed to update location', 'error');
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!confirm('Are you sure you want to delete this location? This may affect inventory transactions.')) return;
    
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await logActivity('delete', 'locations', id);
      
      showSnackbar('Location deleted successfully', 'success');
      fetchLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      showSnackbar(error.message || 'Failed to delete location', 'error');
    }
  };

  const getLocationTypeLabel = (type) => {
    return locationTypes.find(t => t.value === type)?.label || type;
  };

  const getLocationTypeIcon = (type) => {
    switch (type) {
      case 'warehouse':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
          </svg>
        );
      case 'site':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'vehicle':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Locations</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          Add Location
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.length > 0 ? (
            locations.map((location) => (
              <div key={location.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <span className="mr-2 text-gray-500 dark:text-gray-400">
                          {getLocationTypeIcon(location.type)}
                        </span>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{location.name}</h2>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {getLocationTypeLabel(location.type)}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {location.itemCount} items
                    </span>
                  </div>
                  
                  {location.address && (
                    <p className="text-gray-600 dark:text-gray-400 mt-4 mb-2">
                      {location.address}
                    </p>
                  )}
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => {
                        setEditLocation(location);
                        setShowEditModal(true);
                      }}
                      className="text-primary hover:text-primary-dark"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(location.id)}
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
              <p className="text-gray-500 dark:text-gray-400 mb-4">No locations found. Add your first location to get started.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary mx-auto"
              >
                Add Location
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddLocation}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New Location</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                      <input
                        type="text"
                        id="name"
                        className="form-input"
                        required
                        value={newLocation.name}
                        onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                      <select
                        id="type"
                        className="form-input"
                        required
                        value={newLocation.type}
                        onChange={(e) => setNewLocation({ ...newLocation, type: e.target.value })}
                      >
                        {locationTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                      <textarea
                        id="address"
                        rows="3"
                        className="form-input"
                        value={newLocation.address}
                        onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Add Location
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
      
      {/* Edit Location Modal */}
      {showEditModal && editLocation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleEditLocation}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Edit Location</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                      <input
                        type="text"
                        id="edit-name"
                        className="form-input"
                        required
                        value={editLocation.name}
                        onChange={(e) => setEditLocation({ ...editLocation, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="edit-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
                      <select
                        id="edit-type"
                        className="form-input"
                        required
                        value={editLocation.type}
                        onChange={(e) => setEditLocation({ ...editLocation, type: e.target.value })}
                      >
                        {locationTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                      <textarea
                        id="edit-address"
                        rows="3"
                        className="form-input"
                        value={editLocation.address || ''}
                        onChange={(e) => setEditLocation({ ...editLocation, address: e.target.value })}
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

export default Locations;
