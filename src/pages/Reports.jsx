import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSnackbar } from '../contexts/SnackbarContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

const Reports = () => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    stockLevels: [],
    categoryDistribution: [],
    locationStock: [],
    projectUsage: [],
    lowStockItems: []
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Stock Levels (Top 10 highest stock)
      const { data: stockLevels, error: stockError } = await supabase
        .from('items')
        .select('name, current_quantity')
        .order('current_quantity', { ascending: false })
        .limit(10);
      if (stockError) throw stockError;
      
      // Category Distribution
      const { data: categories, error: categoryError } = await supabase
        .from('categories')
        .select(`
          name,
          items:items(id)
        `);
      if (categoryError) throw categoryError;
      const categoryDistribution = categories.map(c => ({ name: c.name, value: c.items?.length || 0 })).filter(c => c.value > 0);
      
      // Location Stock
      const { data: locations, error: locationError } = await supabase
        .from('locations')
        .select(`
          name,
          inventory_transactions(quantity, type)
        `);
      if (locationError) throw locationError;
      const locationStock = locations.map(l => {
        const stock = l.inventory_transactions.reduce((acc, t) => {
          if (t.type === 'in') return acc + t.quantity;
          if (t.type === 'out') return acc - t.quantity;
          if (t.type === 'adjustment') return t.quantity; // Assuming adjustment sets the quantity
          return acc;
        }, 0);
        return { name: l.name, stock: Math.max(0, stock) }; // Ensure stock isn't negative
      }).filter(l => l.stock > 0);
      
      // Project Usage (Top 5 projects by transaction count)
      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select(`
          name,
          inventory_transactions(id)
        `)
        .order('inventory_transactions.count', { ascending: false, foreignTable: 'inventory_transactions' }) // This might not work directly, may need RPC
        .limit(5);
      if (projectError) throw projectError;
      // Simple count for now, ideally RPC for better performance
      const projectUsage = projects.map(p => ({ name: p.name, transactions: p.inventory_transactions?.length || 0 }));
      
      // Low Stock Items
      const { data: lowStockItems, error: lowStockError } = await supabase
        .from('items')
        .select('name, current_quantity, reorder_level')
        .lt('current_quantity', 'reorder_level')
        .order('name');
      if (lowStockError) throw lowStockError;
      
      setReportData({
        stockLevels: stockLevels || [],
        categoryDistribution: categoryDistribution || [],
        locationStock: locationStock || [],
        projectUsage: projectUsage || [],
        lowStockItems: lowStockItems || []
      });
      
    } catch (error) {
      console.error('Error fetching report data:', error);
      showSnackbar('Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = (data, filename) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    showSnackbar(`${filename} exported successfully`, 'success');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
      
      {/* Stock Level Report */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Stock Levels (Top 10)</h2>
          <button
            onClick={() => exportToExcel(reportData.stockLevels, 'StockLevelsReport')}
            className="btn btn-secondary text-sm"
            disabled={reportData.stockLevels.length === 0}
          >
            Export Excel
          </button>
        </div>
        {reportData.stockLevels.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.stockLevels} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Legend />
                <Bar dataKey="current_quantity" name="Quantity" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No stock data available.</p>
        )}
      </div>
      
      {/* Category Distribution Report */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Item Distribution by Category</h2>
          <button
            onClick={() => exportToExcel(reportData.categoryDistribution.map(c => ({ Category: c.name, Items: c.value })), 'CategoryDistributionReport')}
            className="btn btn-secondary text-sm"
            disabled={reportData.categoryDistribution.length === 0}
          >
            Export Excel
          </button>
        </div>
        {reportData.categoryDistribution.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {reportData.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No category data available.</p>
        )}
      </div>
      
      {/* Location Stock Report */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Stock by Location</h2>
          <button
            onClick={() => exportToExcel(reportData.locationStock.map(l => ({ Location: l.name, Stock: l.stock })), 'LocationStockReport')}
            className="btn btn-secondary text-sm"
            disabled={reportData.locationStock.length === 0}
          >
            Export Excel
          </button>
        </div>
        {reportData.locationStock.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.locationStock} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="stock" name="Total Stock" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No location stock data available.</p>
        )}
      </div>
      
      {/* Project Usage Report */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Project Activity (Top 5 by Transactions)</h2>
          <button
            onClick={() => exportToExcel(reportData.projectUsage.map(p => ({ Project: p.name, Transactions: p.transactions })), 'ProjectUsageReport')}
            className="btn btn-secondary text-sm"
            disabled={reportData.projectUsage.length === 0}
          >
            Export Excel
          </button>
        </div>
        {reportData.projectUsage.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.projectUsage} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="transactions" name="Transactions" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No project usage data available.</p>
        )}
      </div>
      
      {/* Low Stock Report */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Low Stock Items</h2>
          <button
            onClick={() => exportToExcel(reportData.lowStockItems.map(i => ({ Item: i.name, Quantity: i.current_quantity, ReorderLevel: i.reorder_level })), 'LowStockReport')}
            className="btn btn-secondary text-sm"
            disabled={reportData.lowStockItems.length === 0}
          >
            Export Excel
          </button>
        </div>
        {reportData.lowStockItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Current Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reorder Level
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {reportData.lowStockItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-medium">
                      {item.current_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.reorder_level}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No items are currently below their reorder level.</p>
        )}
      </div>
      
    </div>
  );
};

export default Reports;
