import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSnackbar } from '../contexts/SnackbarContext';
import { logActivity } from '../lib/supabase';

const Projects = () => {
  const { showSnackbar } = useSnackbar();
  const [projects, setProjects] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active',
    location_id: ''
  });
  const [editProject, setEditProject] = useState(null);

  const projectStatuses = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  useEffect(() => {
    fetchProjects();
    fetchLocations();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          locations:location_id(id, name),
          inventory_transactions(id, item_id)
        `)
        .order('name');
      
      if (error) throw error;
      
      // Count unique items for each project
      const projectsWithItemCount = data.map(project => {
        const uniqueItems = new Set();
        project.inventory_transactions?.forEach(transaction => {
          if (transaction.item_id) {
            uniqueItems.add(transaction.item_id);
          }
        });
        
        return {
          ...project,
          itemCount: uniqueItems.size
        };
      });
      
      setProjects(projectsWithItemCount);
    } catch (error) {
      console.error('Error fetching projects:', error);
      showSnackbar('Failed to load projects', 'error');
    } finally {
      setLoading(false);
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

  const handleAddProject = async (e) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            name: newProject.name,
            code: newProject.code,
            description: newProject.description,
            status: newProject.status,
            location_id: newProject.location_id || null
          }
        ])
        .select();
      
      if (error) throw error;
      
      await logActivity('create', 'projects', data[0].id, data[0]);
      
      showSnackbar('Project added successfully', 'success');
      setShowAddModal(false);
      setNewProject({
        name: '',
        code: '',
        description: '',
        status: 'active',
        location_id: ''
      });
      
      fetchProjects();
    } catch (error) {
      console.error('Error adding project:', error);
      showSnackbar(error.message || 'Failed to add project', 'error');
    }
  };

  const handleEditProject = async (e) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editProject.name,
          code: editProject.code,
          description: editProject.description,
          status: editProject.status,
          location_id: editProject.location_id || null
        })
        .eq('id', editProject.id);
      
      if (error) throw error;
      
      await logActivity('update', 'projects', editProject.id, editProject);
      
      showSnackbar('Project updated successfully', 'success');
      setShowEditModal(false);
      setEditProject(null);
      
      fetchProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      showSnackbar(error.message || 'Failed to update project', 'error');
    }
  };

  const handleDeleteProject = async (id) => {
    if (!confirm('Are you sure you want to delete this project? This may affect inventory transactions.')) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      await logActivity('delete', 'projects', id);
      
      showSnackbar('Project deleted successfully', 'success');
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      showSnackbar(error.message || 'Failed to delete project', 'error');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          Add Project
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length > 0 ? (
            projects.map((project) => (
              <div key={project.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{project.name}</h2>
                      {project.code && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Code: {project.code}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(project.status)}`}>
                      {project.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  
                  {project.description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-4 mb-2 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Location: {project.locations?.name || 'Not specified'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Items: {project.itemCount}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditProject(project);
                          setShowEditModal(true);
                        }}
                        className="text-primary hover:text-primary-dark"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No projects found. Add your first project to get started.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary mx-auto"
              >
                Add Project
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddProject}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New Project</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                      <input
                        type="text"
                        id="name"
                        className="form-input"
                        required
                        value={newProject.name}
                        onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Code</label>
                      <input
                        type="text"
                        id="code"
                        className="form-input"
                        value={newProject.code}
                        onChange={(e) => setNewProject({ ...newProject, code: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status *</label>
                      <select
                        id="status"
                        className="form-input"
                        required
                        value={newProject.status}
                        onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                      >
                        {projectStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                      <select
                        id="location"
                        className="form-input"
                        value={newProject.location_id}
                        onChange={(e) => setNewProject({ ...newProject, location_id: e.target.value })}
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
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                      <textarea
                        id="description"
                        rows="3"
                        className="form-input"
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Add Project
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
      
      {/* Edit Project Modal */}
      {showEditModal && editProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleEditProject}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Edit Project</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                      <input
                        type="text"
                        id="edit-name"
                        className="form-input"
                        required
                        value={editProject.name}
                        onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="edit-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project Code</label>
                      <input
                        type="text"
                        id="edit-code"
                        className="form-input"
                        value={editProject.code || ''}
                        onChange={(e) => setEditProject({ ...editProject, code: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status *</label>
                      <select
                        id="edit-status"
                        className="form-input"
                        required
                        value={editProject.status}
                        onChange={(e) => setEditProject({ ...editProject, status: e.target.value })}
                      >
                        {projectStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                      <select
                        id="edit-location"
                        className="form-input"
                        value={editProject.location_id || ''}
                        onChange={(e) => setEditProject({ ...editProject, location_id: e.target.value || null })}
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
                      <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                      <textarea
                        id="edit-description"
                        rows="3"
                        className="form-input"
                        value={editProject.description || ''}
                        onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
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

export default Projects;
