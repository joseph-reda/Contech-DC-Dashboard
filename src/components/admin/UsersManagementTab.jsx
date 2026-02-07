import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';

const UsersManagementTab = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // نموذج بيانات المستخدم
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullname: '',
    department: 'ST',
    role: 'engineer'
  });

  const departments = [
    { value: 'ARCH', label: 'معماري', color: 'bg-blue-100 text-blue-800', icon: '🏛️' },
    { value: 'ST', label: 'إنشائي', color: 'bg-green-100 text-green-800', icon: '🏗️' },
    { value: 'ELECT', label: 'كهرباء', color: 'bg-purple-100 text-purple-800', icon: '⚡' },
    { value: 'MECH', label: 'ميكانيكا', color: 'bg-amber-100 text-amber-800', icon: '🔧' },
    { value: 'SURV', label: 'مساحة', color: 'bg-indigo-100 text-indigo-800', icon: '📐' }
  ];

  const roles = [
    { value: 'engineer', label: 'مهندس', icon: '👷', color: 'bg-blue-50 text-blue-700' },
    { value: 'dc', label: 'مراقب وثائق', icon: '📋', color: 'bg-amber-50 text-amber-700' },
    { value: 'head', label: 'رئيس قسم', icon: '👑', color: 'bg-purple-50 text-purple-700' },
    { value: 'admin', label: 'مسؤول', icon: '🛡️', color: 'bg-red-50 text-red-700' }
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, deptFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('فشل في تحميل المستخدمين', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        (user.username?.toLowerCase().includes(term) ||
         user.fullname?.toLowerCase().includes(term) ||
         user.department?.toLowerCase().includes(term) ||
         user.role?.toLowerCase().includes(term))
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (deptFilter !== 'all') {
      filtered = filtered.filter(user => user.department === deptFilter);
    }

    setFilteredUsers(filtered);
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const resetForm = () => {
    setUserForm({
        username: '',
        password: '',
        confirmPassword: '',
        fullname: '',
        department: 'ST',
        role: 'engineer'
    });
    setEditingUser(null);
    showToast("تم إعادة تعيين النموذج", "info");
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
  };

 const validateForm = () => {
    // التحقق من اسم المستخدم
    if (!userForm.username.trim()) {
        showToast('اسم المستخدم مطلوب', 'error');
        return false;
    }
    
    // التحقق من الاسم الكامل
    if (!userForm.fullname.trim()) {
        showToast('الاسم الكامل مطلوب', 'error');
        return false;
    }
    
    // إذا كان مستخدم جديد، التحقق من كلمة المرور
    if (!editingUser && !userForm.password) {
        showToast('كلمة المرور مطلوبة للمستخدمين الجدد', 'error');
        return false;
    }
    
    // إذا تم إدخال كلمة مرور، التحقق من طولها
    if (userForm.password && userForm.password.length < 6) {
        showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return false;
    }
    
    // التحقق من تطابق كلمة المرور
    if (userForm.password && userForm.password !== userForm.confirmPassword) {
        showToast('كلمات المرور غير متطابقة', 'error');
        return false;
    }
    
    return true;
};


const handleSaveUser = async (e) => {
    e.preventDefault();
    
    // التحقق من صحة البيانات
    if (!validateForm()) {
        return;
    }
    
    setLoading(true);
    try {
        // تحضير البيانات للإرسال
        const userData = {
            username: userForm.username,
            fullname: userForm.fullname,
            department: userForm.department,
            role: userForm.role
        };
        
        // إذا كان هناك كلمة مرور (للمستخدم الجديد أو عند التعديل)
        if (userForm.password && userForm.password.trim() !== "") {
            userData.password = userForm.password;
        }
        
        // ✅ تصحيح: استخدام المسار الصحيح
        const url = editingUser 
            ? `${API_URL}/users`  // استخدام POST لتحديث المستخدم الحالي
            : `${API_URL}/users`; // استخدام POST لإضافة مستخدم جديد
        
        const method = 'POST';
        
        console.log("📤 Sending user data:", userData);
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log("✅ User operation response:", result);
            
            showToast(editingUser ? "تم تحديث المستخدم بنجاح" : "تم إضافة المستخدم بنجاح", "success");
            
            // إعادة تحميل القائمة
            await loadUsers();
            
            // إعادة تعيين النموذج
            resetForm();
            
        } else {
            const errorData = await response.json();
            console.error("❌ Server error:", errorData);
            throw new Error(errorData.error || "فشلت العملية");
        }
    } catch (error) {
        console.error("❌ User operation error:", error);
        showToast(`خطأ: ${error.message}`, "error");
    } finally {
        setLoading(false);
    }
};

 const startEditUser = (user) => {
    console.log("✏️ Editing user:", user);
    setEditingUser(user);
    setUserForm({
        username: user.username,
        password: '',
        confirmPassword: '',
        fullname: user.fullname || '',
        department: user.department || 'ST',
        role: user.role || 'engineer'
    });
    
    // تمرير إلى أعلى الصفحة
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    showToast(`جار تحرير المستخدم ${user.username}`, 'info');
};

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`هل أنت متأكد من حذف المستخدم "${user.username}"؟\n\nهذا الإجراء لا يمكن التراجع عنه.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/${user.username}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showToast(`تم حذف المستخدم "${user.username}"`);
        loadUsers();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'فشل الحذف');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast(error.message, 'error');
    }
  };

  const handleResetPassword = async (user) => {
    const newPassword = prompt(`أدخل كلمة المرور الجديدة للمستخدم "${user.username}":`);
    
    if (!newPassword || newPassword.length < 6) {
      showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          password: newPassword
        })
      });

      if (response.ok) {
        showToast(`تم إعادة تعيين كلمة المرور للمستخدم ${user.username}`);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'فشلت العملية');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      showToast(error.message, 'error');
    }
  };

  const getRoleInfo = (role) => {
    return roles.find(r => r.value === role) || { label: role, icon: '👤', color: 'bg-gray-50 text-gray-700' };
  };

  const getDeptInfo = (dept) => {
    return departments.find(d => d.value === dept) || { label: dept, color: 'bg-gray-100 text-gray-800', icon: '👤' };
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 font-medium">جاري تحميل المستخدمين...</p>
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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">👥 إدارة المستخدمين</h2>
          <p className="text-gray-600">إدارة حسابات المستخدمين، الأدوار، والأذونات</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
          >
            تحديث
          </button>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">
            {users.length} مستخدم
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sticky top-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingUser ? '✏️ تعديل مستخدم' : '➕ إضافة مستخدم جديد'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم *</label>
                <input
                  type="text"
                  name="username"
                  value={userForm.username}
                  onChange={handleInputChange}
                  disabled={editingUser}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="أدخل اسم المستخدم"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  name="fullname"
                  value={userForm.fullname}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="أدخل الاسم الكامل"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة المرور {!editingUser && '*'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={userForm.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={editingUser ? 'اترك فارغاً للحفاظ على الحالي' : 'كلمة المرور'}
                />
              </div>

              {userForm.password && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد كلمة المرور *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={userForm.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="تأكيد كلمة المرور"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                <select
                  name="department"
                  value={userForm.department}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {departments.map(dept => (
                    <option key={dept.value} value={dept.value}>
                      {dept.icon} {dept.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
                <select
                  name="role"
                  value={userForm.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.icon} {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 pt-4">
                <button
                  onClick={handleSaveUser}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  {editingUser ? 'تحديث المستخدم' : 'إنشاء مستخدم'}
                </button>
                
                {editingUser && (
                  <button
                    onClick={resetForm}
                    className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
                  >
                    إلغاء التعديل
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="lg:col-span-3">
          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="🔍 بحث بالاسم، المستخدم، القسم، أو الدور..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">جميع الأدوار</option>
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">جميع الأقسام</option>
                  {departments.map(dept => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {filteredUsers.length !== users.length && (
              <div className="mt-2 text-sm text-gray-600">
                عرض {filteredUsers.length} من أصل {users.length} مستخدم
              </div>
            )}
          </div>

          {/* Users Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-4 text-right font-semibold text-gray-700">المستخدم</th>
                    <th className="p-4 text-right font-semibold text-gray-700">الاسم</th>
                    <th className="p-4 text-right font-semibold text-gray-700">القسم</th>
                    <th className="p-4 text-right font-semibold text-gray-700">الدور</th>
                    <th className="p-4 text-right font-semibold text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-2">👤</div>
                        لا توجد نتائج
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => {
                      const roleInfo = getRoleInfo(user.role);
                      const deptInfo = getDeptInfo(user.department);

                      return (
                        <tr key={user.username} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="font-bold text-gray-800">{user.username}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-gray-700">{user.fullname || '—'}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-sm ${deptInfo.color}`}>
                              {deptInfo.icon} {deptInfo.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-sm ${roleInfo.color}`}>
                              {roleInfo.icon} {roleInfo.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditUser(user)}
                                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm"
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() => handleResetPassword(user)}
                                className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm"
                              >
                                إعادة تعيين كلمة المرور
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm"
                              >
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statistics */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {roles.map(role => {
              const count = users.filter(u => u.role === role.value).length;
              return (
                <div key={role.value} className="bg-white border rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">{role.icon}</div>
                  <div className="text-2xl font-bold text-gray-800">{count}</div>
                  <div className="text-sm text-gray-600">{role.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersManagementTab;