import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSnackbar } from '../contexts/SnackbarContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    totalProjects: 0,
    activeProjects: 0,
    totalLocations: 0,
    totalTransactions: 0
  });
  const [categoryData, setCategoryData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [projectStockData, setProjectStockData] = useState([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch total items
        const { count: totalItems, error: itemsError } = await supabase
          .from('items')
          .select('*', { count: 'exact', head: true });
          
        if (itemsError) throw itemsError;
        
        // Fetch low stock items
        const { data: lowStockItems, error: lowStockError } = await supabase
          .from('items')
          .select('id')
          .lt('current_quantity', 'reorder_level');
          
        if (lowStockError) throw lowStockError;
        
        // Fetch total projects
        const { count: totalProjects, error: projectsError } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true });
          
        if (projectsError) throw projectsError;
        
        // Fetch active projects
        const { data: activeProjects, error: activeProjectsError } = await supabase
          .from('projects')
          .select('id')
          .eq('status', 'active');
          
        if (activeProjectsError) throw activeProjectsError;
        
        // Fetch total locations
        const { count: totalLocations, error: locationsError } = await supabase
          .from('locations')
          .select('*', { count: 'exact', head: true });
          
        if (locationsError) throw locationsError;
        
        // Fetch total transactions
        const { count: totalTransactions, error: transactionsError } = await supabase
          .from('inventory_transactions')
          .select('*', { count: 'exact', head: true });
          
        if (transactionsError) throw transactionsError;
        
        // Fetch category data for chart
        const { data: categories, error: categoriesError } = await supabase
          .from('categories')
          .select(`
            id,
            name,
            items:items(id)
          `);
          
        if (categoriesError) throw categoriesError;
        
        const categoryChartData = categories.map(category => ({
          name: category.name,
          count: category.items?.length || 0
        }));
        
        // Fetch recent transactions
        const { data: transactions, error: recentTransactionsError } = await supabase
          .from('inventory_transactions')
          .select(`
            id,
            type,
            quantity,
            date,
            items:item_id(name),
            users:user_id(name),
            projects:project_id(name)
          `)
          .order('date', { ascending: false })
          .limit(5);
          
        if (recentTransactionsError) throw recentTransactionsError;
        
        // Fetch project stock data
        const { data: projects, error: projectStockError } = await supabase
          .from('projects')
          .select(`
            id,
            name,
            inventory_transactions(quantity, type)
          `)
          .eq('status', 'active')
          .limit(5);
          
        if (projectStockError) throw projectStockError;
        
        const projectStockChartData = projects.map(project => {
          const totalIn = project.inventory_transactions
            .filter(t => t.type === 'in')
            .reduce((sum, t) => sum + t.quantity, 0);
            
          const totalOut = project.inventory_transactions
            .filter(t => t.type === 'out')
            .reduce((sum, t) => sum + t.quantity, 0);
            
          return {
            name: project.name,
            in: totalIn,
            out: totalOut
          };
        });
        
        setStats({
          totalItems: totalItems || 0,
          lowStockItems: lowStockItems?.length || 0,
          totalProjects: totalProjects || 0,
          activeProjects: activeProjects?.length || 0,
          totalLocations: totalLocations || 0,
          totalTransactions: totalTransactions || 0
        });
        
        setCategoryData(categoryChartData);
        setRecentTransactions(transactions || []);
        setProjectStockData(projectStockChartData);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        showSnackbar('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [showSnackbar]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-500 dark:text-blue-300 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.totalItems}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/items" className="text-sm text-primary hover:text-primary-dark">View all items →</Link>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900 text-red-500 dark:text-red-300 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock Items</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.lowStockItems}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/items?filter=low-stock" className="text-sm text-primary hover:text-primary-dark">View low stock items →</Link>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-500 dark:text-green-300 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Projects</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.activeProjects}</p>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/projects" className="text-sm text-primary hover:text-primary-dark">View all projects →</Link>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Items by Category</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project Inventory Movement</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectStockData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="in" fill="#00C49F" name="Items In" />
                <Bar dataKey="out" fill="#FF8042" name="Items Out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
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
                  Project
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transaction.items?.name || 'Unknown Item'}
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
                      {transaction.projects?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {transaction.users?.name || 'Unknown User'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No recent transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Link to="/transactions" className="text-sm text-primary hover:text-primary-dark">View all transactions →</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
