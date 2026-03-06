// src/components/admin/ProjectsManagementTab.jsx
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';

const ProjectsManagementTab = () => {
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [editingProject, setEditingProject] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    counters: {
      ARCH: 0,
      ST: 0,
      ELECT: 0,
      MECH: 0,
      SURV: 0,
      CPR: 0,
      SD_ARCH: 0,
      SD_ST: 0,
      SD_ELECT: 0,
      SD_MECH: 0,
      SD_SURV: 0
    }
  });

  // Departments for IR/CPR
  const departments = [
    { id: 'ARCH', name: 'Architectural', color: 'bg-blue-100 text-blue-800' },
    { id: 'ST', name: 'Structural', color: 'bg-green-100 text-green-800' },
    { id: 'ELECT', name: 'Electrical', color: 'bg-purple-100 text-purple-800' },
    { id: 'MECH', name: 'Mechanical', color: 'bg-amber-100 text-amber-800' },
    { id: 'SURV', name: 'Survey', color: 'bg-indigo-100 text-indigo-800' },
    { id: 'CPR', name: 'Concrete Pouring', color: 'bg-teal-100 text-teal-800' }
  ];

  // Departments for Shop Drawing
  const sdDepartments = [
    { id: 'SD_ARCH', name: 'SD Architectural', base: 'ARCH', color: 'bg-blue-100 text-blue-800' },
    { id: 'SD_ST', name: 'SD Structural', base: 'ST', color: 'bg-green-100 text-green-800' },
    { id: 'SD_ELECT', name: 'SD Electrical', base: 'ELECT', color: 'bg-purple-100 text-purple-800' },
    { id: 'SD_MECH', name: 'SD Mechanical', base: 'MECH', color: 'bg-amber-100 text-amber-800' },
    { id: 'SD_SURV', name: 'SD Survey', base: 'SURV', color: 'bg-indigo-100 text-indigo-800' }
  ];

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || {});
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      showToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const resetForm = () => {
    setNewProject({
      name: '',
      description: '',
      counters: {
        ARCH: 0,
        ST: 0,
        ELECT: 0,
        MECH: 0,
        SURV: 0,
        CPR: 0,
        SD_ARCH: 0,
        SD_ST: 0,
        SD_ELECT: 0,
        SD_MECH: 0,
        SD_SURV: 0
      }
    });
    setEditingProject(null);
    setShowForm(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProject(prev => ({ ...prev, [name]: value }));
  };

  const handleCounterChange = (dept, value) => {
    if (isNaN(value) || value < 0) return;
    setNewProject(prev => ({
      ...prev,
      counters: {
        ...prev.counters,
        [dept]: parseInt(value) || 0
      }
    }));
  };

  const validateProject = () => {
    if (!newProject.name.trim()) {
      showToast('Project name is required', 'error');
      return false;
    }
    if (newProject.name.length < 3) {
      showToast('Project name must be at least 3 characters', 'error');
      return false;
    }
    if (!editingProject && projects[newProject.name]) {
      showToast('Project name already exists', 'error');
      return false;
    }
    return true;
  };

  const handleSaveProject = async () => {
    if (!validateProject()) return;

    try {
      const projectData = {
        name: newProject.name.trim(),
        description: newProject.description.trim(),
        counters: newProject.counters,
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });

      if (response.ok) {
        showToast(editingProject ? 'Project updated successfully' : 'Project created successfully');
        resetForm();
        loadProjects();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      showToast(error.message, 'error');
    }
  };

  const startEditProject = (projectName, projectData) => {
    setEditingProject(projectName);
    setNewProject({
      name: projectName,
      description: projectData.description || '',
      counters: {
        ARCH: projectData.counters?.ARCH || 0,
        ST: projectData.counters?.ST || 0,
        ELECT: projectData.counters?.ELECT || 0,
        MECH: projectData.counters?.MECH || 0,
        SURV: projectData.counters?.SURV || 0,
        CPR: projectData.counters?.CPR || 0,
        SD_ARCH: projectData.counters?.SD_ARCH || 0,
        SD_ST: projectData.counters?.SD_ST || 0,
        SD_ELECT: projectData.counters?.SD_ELECT || 0,
        SD_MECH: projectData.counters?.SD_MECH || 0,
        SD_SURV: projectData.counters?.SD_SURV || 0
      }
    });
    setShowForm(true);
  };

  const handleUpdateCounter = async (projectName, dept, value) => {
    if (isNaN(value) || value < 0) {
      showToast('Value must be a positive number', 'error');
      return;
    }

    try {
      const projectData = projects[projectName] || {};
      const updatedCounters = {
        ...projectData.counters,
        [dept]: parseInt(value)
      };

      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          ...projectData,
          counters: updatedCounters,
          updatedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        setProjects(prev => ({
          ...prev,
          [projectName]: {
            ...prev[projectName],
            counters: updatedCounters
          }
        }));
        showToast(`Counter ${dept} updated to ${value}`);
      }
    } catch (error) {
      console.error('Error updating counter:', error);
      showToast('Failed to update counter', 'error');
    }
  };

  const handleDeleteProject = async (projectName) => {
    if (!window.confirm(`Are you sure you want to delete project "${projectName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      // If there's a delete endpoint, call it; otherwise just remove from UI
      const response = await fetch(`${API_URL}/projects/${projectName}`, { method: 'DELETE' }).catch(() => ({}));
      if (response.ok || response.status === 404) {
        const updated = { ...projects };
        delete updated[projectName];
        setProjects(updated);
        showToast(`Project "${projectName}" deleted`);
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      showToast('Failed to delete project', 'error');
    }
  };

  const getDeptName = (dept) => {
    const deptObj = departments.find(d => d.id === dept) || sdDepartments.find(d => d.id === dept);
    return deptObj ? deptObj.name : dept;
  };

  const getDeptColor = (dept) => {
    const deptObj = departments.find(d => d.id === dept) || sdDepartments.find(d => d.id === dept);
    return deptObj ? deptObj.color : 'bg-gray-100 text-gray-800';
  };

  const getTotalCounters = (counters) => {
    return Object.values(counters || {}).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  };

  const filteredProjects = Object.entries(projects).filter(([name]) =>
    !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.show && (
        <div className={`rounded-lg p-4 mb-4 ${toast.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          <div className="flex items-center gap-2">
            {toast.type === 'error' ? '❌' : '✅'}
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">📁 Project Management</h2>
          <p className="text-gray-600">Manage projects, counters, and settings</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadProjects} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium">Refresh</button>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            {showForm ? 'Close Form' : 'Add New Project'}
          </button>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">{Object.keys(projects).length} projects</div>
        </div>
      </div>

      {/* Add/Edit Project Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">{editingProject ? '✏️ Edit Project' : '➕ Add New Project'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                <input type="text" name="name" value={newProject.name} onChange={handleInputChange} disabled={editingProject} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Enter project name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={newProject.description} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows="3" placeholder="Project description" />
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-700 mb-3">Initial Counters</h4>
              <div className="grid grid-cols-2 gap-3">
                {departments.map(dept => (
                  <div key={dept.id} className="space-y-1">
                    <label className="text-sm text-gray-600">{dept.name}</label>
                    <input type="number" value={newProject.counters[dept.id] || 0} onChange={(e) => handleCounterChange(dept.id, e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" min="0" />
                  </div>
                ))}
              </div>
              <h4 className="font-bold text-gray-700 mt-4 mb-3">Shop Drawing Counters</h4>
              <div className="grid grid-cols-2 gap-3">
                {sdDepartments.map(dept => (
                  <div key={dept.id} className="space-y-1">
                    <label className="text-sm text-gray-600">{dept.name}</label>
                    <input type="number" value={newProject.counters[dept.id] || 0} onChange={(e) => handleCounterChange(dept.id, e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" min="0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleSaveProject} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold">{editingProject ? 'Update Project' : 'Create Project'}</button>
            <button onClick={resetForm} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium">Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
        <input type="text" placeholder="🔍 Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
        {searchTerm && filteredProjects.length > 0 && <div className="mt-2 text-sm text-gray-600">Showing {filteredProjects.length} of {Object.keys(projects).length} projects</div>}
      </div>

      {/* Projects List */}
      {Object.keys(projects).length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No projects</h3>
          <p className="text-gray-500 mb-6">Add your first project to start managing counters</p>
          <button onClick={() => setShowForm(true)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Add Project</button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No results</h3>
          <p className="text-gray-500 mb-6">No projects match "{searchTerm}"</p>
          <button onClick={() => setSearchTerm('')} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Clear Search</button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredProjects.map(([projectName, projectData]) => (
            <div key={projectName} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              {/* Project Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{projectName}</h3>
                    {projectData.description && <p className="text-gray-600">{projectData.description}</p>}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-gray-500">Total counters: <span className="font-bold">{getTotalCounters(projectData.counters)}</span></span>
                      <span className="text-sm text-gray-500">Last updated: {projectData.updatedAt ? new Date(projectData.updatedAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditProject(projectName, projectData)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Edit</button>
                    <button onClick={() => handleDeleteProject(projectName)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Delete</button>
                  </div>
                </div>
              </div>

              {/* IR/CPR Counters */}
              <div className="p-6 border-b border-gray-200">
                <h4 className="font-bold text-gray-700 mb-4">IR/CPR Counters</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {departments.map(dept => {
                    const counter = projectData.counters?.[dept.id] || 0;
                    return (
                      <div key={dept.id} className="border rounded-lg p-4">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium mb-3 ${dept.color}`}>{dept.name}</div>
                        <div className="text-3xl font-bold text-gray-800 mb-2">{counter}</div>
                        <div className="flex gap-2">
                          <input type="number" value={counter} onChange={(e) => handleUpdateCounter(projectName, dept.id, e.target.value)} className="w-full px-2 py-1 border rounded text-sm" min="0" />
                          <button onClick={() => handleUpdateCounter(projectName, dept.id, counter + 1)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">+1</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shop Drawing Counters */}
              <div className="p-6">
                <h4 className="font-bold text-gray-700 mb-4">Shop Drawing Counters</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {sdDepartments.map(dept => {
                    const counter = projectData.counters?.[dept.id] || 0;
                    return (
                      <div key={dept.id} className="border rounded-lg p-4">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium mb-3 ${dept.color}`}>{dept.name}</div>
                        <div className="text-3xl font-bold text-gray-800 mb-2">{counter}</div>
                        <div className="flex gap-2">
                          <input type="number" value={counter} onChange={(e) => handleUpdateCounter(projectName, dept.id, e.target.value)} className="w-full px-2 py-1 border rounded text-sm" min="0" />
                          <button onClick={() => handleUpdateCounter(projectName, dept.id, counter + 1)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">+1</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistics */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h4 className="font-bold text-gray-700 mb-4">Project Statistics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{Object.keys(projects).length}</div>
            <div className="text-sm text-gray-600">Projects</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {Object.values(projects).reduce((sum, proj) => sum + getTotalCounters(proj.counters), 0)}
            </div>
            <div className="text-sm text-gray-600">Total counters</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(projects).filter(name => getTotalCounters(projects[name]?.counters) > 0).length}
            </div>
            <div className="text-sm text-gray-600">Active projects</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {Math.round(Object.values(projects).reduce((sum, proj) => sum + getTotalCounters(proj.counters), 0) / Object.keys(projects).length) || 0}
            </div>
            <div className="text-sm text-gray-600">Average counters</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsManagementTab;