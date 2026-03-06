// src/pages/SuperAdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardTab from '../components/admin/DashboardTab';
import UsersManagementTab from '../components/admin/UsersManagementTab';
import ProjectsManagementTab from './../components/admin/ProjectsManagementTab';
import DataManagementTab from './../components/admin/DataManagementTab';
import SystemSettingsTab from '../components/admin/SystemSettingsTab';
import EngineerModeTab from '../components/admin/EngineerModeTab';
import DCModeTab from '../components/admin/DCModeTab';
import SystemToolsTab from '../components/admin/SystemToolsTab';
import { API_URL } from '../config';

const SuperAdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemInfo, setSystemInfo] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Check authentication
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!storedUser) {
      navigate('/login');
      return;
    }

    if (storedUser.role !== 'admin') {
      if (storedUser.role === 'dc') {
        navigate('/dc');
      } else {
        navigate('/engineer');
      }
      return;
    }

    setUser(storedUser);
    loadSystemInfo();
  }, [navigate]);

  const loadSystemInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/system-info`);
      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data);
      }
    } catch (error) {
      console.error('Failed to load system info:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', component: <DashboardTab /> },
    { id: 'users', label: 'User Management', icon: '👥', component: <UsersManagementTab /> },
    { id: 'projects', label: 'Project Management', icon: '📁', component: <ProjectsManagementTab /> },
    { id: 'data', label: 'Data Management', icon: '🗃️', component: <DataManagementTab /> },
    { id: 'settings', label: 'System Settings', icon: '⚙️', component: <SystemSettingsTab /> },
    { id: 'engineer', label: 'Engineer Mode', icon: '👷', component: <EngineerModeTab /> },
    { id: 'dc', label: 'DC Mode', icon: '📋', component: <DCModeTab /> },
    { id: 'tools', label: 'System Tools', icon: '🔧', component: <SystemToolsTab /> }
  ];

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const goToDCDashboard = () => {
    // Temporarily switch user to DC role (or just navigate)
    // To actually access DC dashboard, we need a DC user. We can create a mock or use same user.
    // Since admin can view any, just navigate to /dc and rely on the route to handle it.
    navigate('/dc');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-top-5 ${
          toast.type === 'error' ? 'bg-red-600' : toast.type === 'warning' ? 'bg-amber-600' : 'bg-green-600'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✅'}
            {toast.message}
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xl">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">👑 Admin Panel</h1>
                <p className="text-slate-300 text-lg">Complete system control – manage all functions</p>
              </div>
              
              <div className="flex items-center gap-4">
                {user && (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold">{user.fullname || user.username}</p>
                      <p className="text-slate-300 text-sm">System Administrator</p>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                      {user.username?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
                <button
                  onClick={goToDCDashboard}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition"
                  title="Switch to Document Controller view"
                >
                  📋 DC Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Tabs Navigation */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 mb-6 overflow-x-auto">
            <div className="flex space-x-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Tab Content */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            {tabs.find(tab => tab.id === activeTab)?.component}
          </div>

          {/* System Status Footer */}
          <div className="mt-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-slate-300 mb-1">IR Management System</p>
                <p className="text-sm text-slate-400">Version: {systemInfo?.version || '2.2'}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm">System Active</span>
                </div>
                <div className="text-sm text-slate-300">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SuperAdminPanel;