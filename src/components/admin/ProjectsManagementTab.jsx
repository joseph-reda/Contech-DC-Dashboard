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
      CPR: 0
    }
  });

  const departments = [
    { id: 'ARCH', name: 'معماري', color: 'bg-blue-100 text-blue-800' },
    { id: 'ST', name: 'إنشائي', color: 'bg-green-100 text-green-800' },
    { id: 'ELECT', name: 'كهرباء', color: 'bg-purple-100 text-purple-800' },
    { id: 'MECH', name: 'ميكانيكا', color: 'bg-amber-100 text-amber-800' },
    { id: 'SURV', name: 'مساحة', color: 'bg-indigo-100 text-indigo-800' },
    { id: 'CPR', name: 'صب خرسانة', color: 'bg-teal-100 text-teal-800' }
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
      showToast('فشل في تحميل المشاريع', 'error');
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
        CPR: 0
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
        [dept]: parseInt(value)
      }
    }));
  };

  const validateProject = () => {
    if (!newProject.name.trim()) {
      showToast('اسم المشروع مطلوب', 'error');
      return false;
    }

    if (newProject.name.length < 3) {
      showToast('اسم المشروع يجب أن يكون 3 أحرف على الأقل', 'error');
      return false;
    }

    if (!editingProject && projects[newProject.name]) {
      showToast('اسم المشروع موجود بالفعل', 'error');
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
        showToast(editingProject ? 'تم تحديث المشروع بنجاح' : 'تم إنشاء المشروع بنجاح');
        resetForm();
        loadProjects();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'فشلت العملية');
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
      counters: projectData.counters || {
        ARCH: 0,
        ST: 0,
        ELECT: 0,
        MECH: 0,
        SURV: 0,
        CPR: 0
      }
    });
    setShowForm(true);
  };

  const handleUpdateCounter = async (projectName, dept, value) => {
    if (isNaN(value) || value < 0) {
      showToast('القيمة يجب أن تكون رقماً موجباً', 'error');
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
        // تحديث الحالة المحلية
        setProjects(prev => ({
          ...prev,
          [projectName]: {
            ...prev[projectName],
            counters: updatedCounters
          }
        }));
        
        showToast(`تم تحديث عداد ${getDeptName(dept)} إلى ${value}`);
      }
    } catch (error) {
      console.error('Error updating counter:', error);
      showToast('فشل تحديث العداد', 'error');
    }
  };

  const handleDeleteProject = async (projectName) => {
    if (!window.confirm(`هل أنت متأكد من حذف المشروع "${projectName}"؟\n\nهذا الإجراء لا يمكن التراجع عنه.`)) {
      return;
    }

    try {
      // Note: You need to implement delete endpoint in backend
      // For now, update local state
      const updatedProjects = { ...projects };
      delete updatedProjects[projectName];
      setProjects(updatedProjects);
      
      showToast(`تم حذف المشروع "${projectName}"`);
      
      // Try to call delete endpoint if it exists
      try {
        await fetch(`${API_URL}/projects/${projectName}`, { 
          method: 'DELETE' 
        });
      } catch (deleteErr) {
        console.log('Delete endpoint not implemented');
      }
      
    } catch (error) {
      console.error('Error deleting project:', error);
      showToast('فشل حذف المشروع', 'error');
    }
  };

  const getDeptName = (dept) => {
    const deptObj = departments.find(d => d.id === dept);
    return deptObj ? deptObj.name : dept;
  };

  const getDeptColor = (dept) => {
    const deptObj = departments.find(d => d.id === dept);
    return deptObj ? deptObj.color : 'bg-gray-100 text-gray-800';
  };

  const getTotalCounters = (counters) => {
    return Object.values(counters || {}).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  };

  const filteredProjects = Object.entries(projects).filter(([name]) => {
    if (!searchTerm) return true;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 font-medium">جاري تحميل المشاريع...</p>
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">📁 إدارة المشاريع</h2>
          <p className="text-gray-600">إدارة المشاريع، العدادات، والإعدادات</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadProjects}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
          >
            تحديث
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            {showForm ? 'إغلاق النموذج' : 'إضافة مشروع جديد'}
          </button>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">
            {Object.keys(projects).length} مشروع
          </div>
        </div>
      </div>

      {/* Add/Edit Project Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {editingProject ? '✏️ تعديل المشروع' : '➕ إضافة مشروع جديد'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المشروع *</label>
                <input
                  type="text"
                  name="name"
                  value={newProject.name}
                  onChange={handleInputChange}
                  disabled={editingProject}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="أدخل اسم المشروع"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  name="description"
                  value={newProject.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="وصف المشروع"
                />
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-700 mb-3">العدادات الأولية</h4>
              <div className="grid grid-cols-2 gap-3">
                {departments.map(dept => (
                  <div key={dept.id} className="space-y-1">
                    <label className="text-sm text-gray-600">{dept.name}</label>
                    <input
                      type="number"
                      value={newProject.counters[dept.id] || 0}
                      onChange={(e) => handleCounterChange(dept.id, e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSaveProject}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
            >
              {editingProject ? 'تحديث المشروع' : 'إنشاء المشروع'}
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 بحث في المشاريع..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {searchTerm && filteredProjects.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            عرض {filteredProjects.length} من أصل {Object.keys(projects).length} مشروع
          </div>
        )}
      </div>

      {/* Projects List */}
      {Object.keys(projects).length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📭</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد مشاريع</h3>
          <p className="text-gray-500 mb-6">أضف مشروعك الأول لبدء إدارة العدادات</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            إضافة مشروع جديد
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">لا توجد نتائج</h3>
          <p className="text-gray-500 mb-6">لا توجد مشاريع تطابق "{searchTerm}"</p>
          <button
            onClick={() => setSearchTerm('')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            مسح البحث
          </button>
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
                    {projectData.description && (
                      <p className="text-gray-600">{projectData.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-gray-500">
                        إجمالي العدادات: <span className="font-bold">{getTotalCounters(projectData.counters)}</span>
                      </span>
                      <span className="text-sm text-gray-500">
                        آخر تحديث: {projectData.updatedAt ? new Date(projectData.updatedAt).toLocaleDateString() : 'غير متوفر'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditProject(projectName, projectData)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteProject(projectName)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>

              {/* Counters */}
              <div className="p-6">
                <h4 className="font-bold text-gray-700 mb-4">عدادات IR حسب القسم</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {departments.map(dept => {
                    const counter = projectData.counters?.[dept.id] || 0;
                    return (
                      <div key={dept.id} className="border rounded-lg p-4">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium mb-3 ${dept.color}`}>
                          {dept.name}
                        </div>
                        <div className="text-3xl font-bold text-gray-800 mb-2">{counter}</div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={counter}
                            onChange={(e) => handleUpdateCounter(projectName, dept.id, e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                            min="0"
                          />
                          <button
                            onClick={() => handleUpdateCounter(projectName, dept.id, counter + 1)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                          >
                            +1
                          </button>
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
        <h4 className="font-bold text-gray-700 mb-4">إحصائيات المشاريع</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{Object.keys(projects).length}</div>
            <div className="text-sm text-gray-600">المشاريع</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {Object.values(projects).reduce((sum, proj) => 
                sum + getTotalCounters(proj.counters), 0)}
            </div>
            <div className="text-sm text-gray-600">إجمالي العدادات</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(projects).filter(name => 
                getTotalCounters(projects[name]?.counters) > 0).length}
            </div>
            <div className="text-sm text-gray-600">مشاريع نشطة</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {Math.round(Object.values(projects).reduce((sum, proj) => 
                sum + getTotalCounters(proj.counters), 0) / Object.keys(projects).length) || 0}
            </div>
            <div className="text-sm text-gray-600">متوسط العدادات</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsManagementTab;