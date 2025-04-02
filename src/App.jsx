import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Items from './pages/Items';
import ItemDetail from './pages/ItemDetail';
import Categories from './pages/Categories';
import Locations from './pages/Locations';
import Projects from './pages/Projects';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Users from './pages/Users';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';

// Protected route component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="items" element={<Items />} />
        <Route path="items/:id" element={<ItemDetail />} />
        <Route path="categories" element={<Categories />} />
        <Route path="locations" element={<Locations />} />
        <Route path="projects" element={<Projects />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={
          <ProtectedRoute requiredRole="admin">
            <Users />
          </ProtectedRoute>
        } />
        <Route path="settings" element={<Settings />} />
        <Route path="audit-logs" element={
          <ProtectedRoute requiredRole="admin">
            <AuditLogs />
          </ProtectedRoute>
        } />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
