import React, { useState, useEffect } from "react";
import { API_URL } from "../../config";

const UsersManagementTab = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // User form state
  const [userForm, setUserForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    fullname: "",
    department: "ST",
    role: "engineer",
    allowedRequestTypes: ["ir"], // array of allowed request types
  });

  // Department options
  const departments = [
    { value: "ARCH", label: "Architectural", color: "bg-blue-100 text-blue-800", icon: "🏛️" },
    { value: "ST", label: "Structural", color: "bg-green-100 text-green-800", icon: "🏗️" },
    { value: "ELECT", label: "Electrical", color: "bg-purple-100 text-purple-800", icon: "⚡" },
    { value: "MECH", label: "Mechanical", color: "bg-amber-100 text-amber-800", icon: "🔧" },
    { value: "SURV", label: "Survey", color: "bg-indigo-100 text-indigo-800", icon: "📐" },
  ];

  // Role options
  const roles = [
    { value: "engineer", label: "Engineer", icon: "👷", color: "bg-blue-50 text-blue-700" },
    { value: "dc", label: "Document Controller", icon: "📋", color: "bg-amber-50 text-amber-700" },
    { value: "head", label: "Head of Department", icon: "👑", color: "bg-purple-50 text-purple-700" },
    { value: "admin", label: "Administrator", icon: "🛡️", color: "bg-red-50 text-red-700" },
  ];

  // Request type options for permissions
  const requestTypeOptions = [
    { value: "ir", label: "IR (Inspection Request)", icon: "📝" },
    { value: "cpr", label: "CPR (Concrete Pouring Request)", icon: "🏗️" },
    { value: "sd", label: "Shop Drawing", icon: "📐" },
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, deptFilter]);

  // Load users from API
  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search and filters
  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.username?.toLowerCase().includes(term) ||
          user.fullname?.toLowerCase().includes(term) ||
          user.department?.toLowerCase().includes(term) ||
          user.role?.toLowerCase().includes(term) ||
          user.allowedRequestTypes?.some(type => type.includes(term))
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    if (deptFilter !== "all") {
      filtered = filtered.filter((user) => user.department === deptFilter);
    }

    setFilteredUsers(filtered);
  };

  // Show toast notification
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // Reset form to initial state
  const resetForm = () => {
    setUserForm({
      username: "",
      password: "",
      confirmPassword: "",
      fullname: "",
      department: "ST",
      role: "engineer",
      allowedRequestTypes: ["ir"],
    });
    setEditingUser(null);
    showToast("Form reset", "info");
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle allowed request type checkbox change
  const handleAllowedTypeChange = (type) => {
    setUserForm((prev) => {
      let newTypes = [...prev.allowedRequestTypes];
      if (newTypes.includes(type)) {
        newTypes = newTypes.filter((t) => t !== type);
      } else {
        newTypes.push(type);
      }
      return { ...prev, allowedRequestTypes: newTypes };
    });
  };

  // Validate form before submit
  const validateForm = () => {
    if (!userForm.username.trim()) {
      showToast("Username is required", "error");
      return false;
    }
    if (!userForm.fullname.trim()) {
      showToast("Full name is required", "error");
      return false;
    }
    if (!editingUser && !userForm.password) {
      showToast("Password is required for new users", "error");
      return false;
    }
    if (userForm.password && userForm.password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return false;
    }
    if (userForm.password && userForm.password !== userForm.confirmPassword) {
      showToast("Passwords do not match", "error");
      return false;
    }
    if (userForm.allowedRequestTypes.length === 0) {
      showToast("At least one request type must be selected", "error");
      return false;
    }
    return true;
  };

  // Save user (create or update)
  const handleSaveUser = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const userData = {
        username: userForm.username.toLowerCase().trim(),
        fullname: userForm.fullname.trim(),
        department: userForm.department,
        role: userForm.role,
        allowedRequestTypes: userForm.allowedRequestTypes,
      };

      if (userForm.password && userForm.password.trim() !== "") {
        userData.password = userForm.password;
      }

      console.log("📤 Sending user data:", userData);

      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ User operation response:", result);

        showToast(
          editingUser ? "User updated successfully" : "User created successfully",
          "success"
        );

        await loadUsers();
        resetForm();
      } else {
        const errorData = await response.json();
        console.error("❌ Server error:", errorData);
        throw new Error(errorData.error || "Operation failed");
      }
    } catch (error) {
      console.error("❌ User operation error:", error);
      showToast(`Error: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  // Start editing a user
 const startEditUser = (user) => {
    console.log("✏️ Editing user:", user);
    setEditingUser(user);
    setUserForm({
        username: user.username,
        password: "",
        confirmPassword: "",
        fullname: user.fullname || "",
        department: user.department || "ST",
        role: user.role || "engineer",
        allowedRequestTypes: user.allowedRequestTypes || ["ir"], // ✅ افتراضي IR إذا لم يكن موجوداً
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast(`Editing user ${user.username}`, "info");
};
  // Delete user
  const handleDeleteUser = async (user) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user "${user.username}"?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/${user.username}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showToast(`User "${user.username}" deleted successfully`);
        loadUsers();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Delete failed");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast(error.message, "error");
    }
  };

  // Reset user password
  const handleResetPassword = async (user) => {
    const newPassword = prompt(
      `Enter new password for user "${user.username}":`
    );

    if (!newPassword || newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user.username,
          password: newPassword,
        }),
      });

      if (response.ok) {
        showToast(`Password reset for user ${user.username}`);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Operation failed");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      showToast(error.message, "error");
    }
  };

  // Helper to get role info
  const getRoleInfo = (role) => {
    return (
      roles.find((r) => r.value === role) || {
        label: role,
        icon: "👤",
        color: "bg-gray-50 text-gray-700",
      }
    );
  };

  // Helper to get department info
  const getDeptInfo = (dept) => {
    return (
      departments.find((d) => d.value === dept) || {
        label: dept,
        color: "bg-gray-100 text-gray-800",
        icon: "👤",
      }
    );
  };

  // Helper to display allowed request types
const renderAllowedTypes = (types) => {
    if (!types || types.length === 0) return <span className="text-gray-400">None</span>;
    return types.map((type) => {
        const option = requestTypeOptions.find(opt => opt.value === type);
        return option ? (
            <span key={type} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs ml-1">
                {option.icon} {option.label.split(' ')[0]}
            </span>
        ) : (
            <span key={type} className="px-2 py-1 bg-gray-100 rounded text-xs ml-1">{type}</span>
        );
    });
};

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`rounded-lg p-4 mb-4 ${toast.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "error" ? "❌" : "✅"}
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">👥 User Management</h2>
          <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
          >
            Refresh
          </button>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg">
            {users.length} users
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sticky top-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {editingUser ? "✏️ Edit User" : "➕ Add New User"}
            </h3>

            <div className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={userForm.username}
                  onChange={handleInputChange}
                  disabled={editingUser}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter username"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullname"
                  value={userForm.fullname}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
              </div>

              {/* Allowed Request Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed Request Types
                </label>
                <div className="space-y-2">
                  {requestTypeOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={userForm.allowedRequestTypes.includes(option.value)}
                        onChange={() => handleAllowedTypeChange(option.value)}
                        className="rounded border-gray-300"
                      />
                      <span>{option.icon} {option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {!editingUser && "*"}
                </label>
                <input
                  type="password"
                  name="password"
                  value={userForm.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    editingUser ? "Leave blank to keep current" : "Password"
                  }
                />
              </div>

              {/* Confirm Password */}
              {userForm.password && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={userForm.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm password"
                  />
                </div>
              )}

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  name="department"
                  value={userForm.department}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {departments.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.icon} {dept.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  name="role"
                  value={userForm.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.icon} {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="space-y-3 pt-4">
                <button
                  onClick={handleSaveUser}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  {editingUser ? "Update User" : "Create User"}
                </button>

                {editingUser && (
                  <button
                    onClick={resetForm}
                    className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
                  >
                    Cancel Edit
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
                  placeholder="🔍 Search by username, name, department, role, or permissions..."
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
                  <option value="all">All Roles</option>
                  {roles.map((role) => (
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
                  <option value="all">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {filteredUsers.length !== users.length && (
              <div className="mt-2 text-sm text-gray-600">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            )}
          </div>

          {/* Users Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-4 text-left font-semibold text-gray-700">Username</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Full Name</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Department</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Role</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Allowed Types</th>
                    <th className="p-4 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-2">👤</div>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const roleInfo = getRoleInfo(user.role);
                      const deptInfo = getDeptInfo(user.department);

                      return (
                        <tr key={user.username} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="font-bold text-gray-800">{user.username}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-gray-700">{user.fullname || "—"}</div>
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
                            <div className="flex flex-wrap gap-1">
                              {renderAllowedTypes(user.allowedRequestTypes)}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditUser(user)}
                                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleResetPassword(user)}
                                className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm"
                              >
                                Reset Password
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm"
                              >
                                Delete
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
            {roles.map((role) => {
              const count = users.filter((u) => u.role === role.value).length;
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