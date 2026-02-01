// src/pages/UsersAdminPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";

export default function UsersAdminPage() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState({ show: false, message: "", type: "" });
    const [actionLoading, setActionLoading] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        engineers: 0,
        dc: 0,
        heads: 0,
        admins: 0
    });

    // Form states
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        confirmPassword: "",
        fullname: "",
        department: "ST",
        role: "engineer"
    });

    const [editingUser, setEditingUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [deptFilter, setDeptFilter] = useState("all");
    const [sortBy, setSortBy] = useState("username");
    const [sortOrder, setSortOrder] = useState("asc");

    // Available departments
    const departments = [
        { value: "ST", label: "Civil/Structure", color: "bg-green-100 text-green-800", icon: "🏗️" },
        { value: "ARCH", label: "Architectural", color: "bg-blue-100 text-blue-800", icon: "🏛️" },
        { value: "ELECT", label: "Electrical", color: "bg-purple-100 text-purple-800", icon: "⚡" },
        { value: "MEP", label: "Mechanical/MEP", color: "bg-amber-100 text-amber-800", icon: "🔧" },
        { value: "SURV", label: "Survey", color: "bg-indigo-100 text-indigo-800", icon: "📐" },
        { value: "Admin", label: "Administration", color: "bg-red-100 text-red-800", icon: "👑" },
        { value: "OTHER", label: "Other", color: "bg-gray-100 text-gray-800", icon: "👤" }
    ];

    // Available roles
    const roles = [
        { value: "engineer", label: "Engineer", icon: "👷", color: "bg-blue-50 text-blue-700", description: "Standard user access" },
        { value: "dc", label: "Document Controller", icon: "📋", color: "bg-amber-50 text-amber-700", description: "Document control access" },
        { value: "head", label: "Head of Department", icon: "👑", color: "bg-purple-50 text-purple-700", description: "Department management" },
        { value: "admin", label: "Administrator", icon: "🛡️", color: "bg-red-50 text-red-700", description: "Full system access" }
    ];

    // Auth check
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user || user.role !== "admin") {
            navigate("/login");
        }
    }, [navigate]);

    // Load users
    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users`);
            if (!res.ok) throw new Error("Failed to load users");

            const data = await res.json();
            const usersList = data.users || [];
            
            // Sort users
            const sortedUsers = sortUsers(usersList);
            setUsers(sortedUsers);
            calculateStats(sortedUsers);
            setError("");
        } catch (err) {
            console.error("Failed to load users:", err);
            setError("Failed to load users. Please check your connection.");
        } finally {
            setLoading(false);
        }
    }

    // Sort users
    const sortUsers = (usersList) => {
        return [...usersList].sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case "username":
                    aValue = a.username?.toLowerCase() || "";
                    bValue = b.username?.toLowerCase() || "";
                    break;
                case "fullname":
                    aValue = a.fullname?.toLowerCase() || "";
                    bValue = b.fullname?.toLowerCase() || "";
                    break;
                case "department":
                    aValue = a.department?.toLowerCase() || "";
                    bValue = b.department?.toLowerCase() || "";
                    break;
                case "role":
                    aValue = a.role?.toLowerCase() || "";
                    bValue = b.role?.toLowerCase() || "";
                    break;
                default:
                    aValue = a.username?.toLowerCase() || "";
                    bValue = b.username?.toLowerCase() || "";
            }
            
            if (sortOrder === "asc") {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });
    };

    // Handle sort
    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortOrder("asc");
        }
    };

    // Calculate statistics
    const calculateStats = (usersList) => {
        const stats = {
            total: usersList.length,
            engineers: usersList.filter(u => u.role === "engineer").length,
            dc: usersList.filter(u => u.role === "dc").length,
            heads: usersList.filter(u => u.role === "head").length,
            admins: usersList.filter(u => u.role === "admin").length
        };
        setStats(stats);
    };

    // Show toast notification
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            username: "",
            password: "",
            confirmPassword: "",
            fullname: "",
            department: "ST",
            role: "engineer"
        });
        setEditingUser(null);
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Check password strength
    const checkPasswordStrength = (password) => {
        if (!password) return { score: 0, text: "No password", color: "text-gray-500", width: "0%" };
        
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        const strength = {
            0: { text: "Very Weak", color: "text-red-600", bgColor: "bg-red-100", width: "25%" },
            1: { text: "Weak", color: "text-red-500", bgColor: "bg-red-50", width: "25%" },
            2: { text: "Fair", color: "text-yellow-500", bgColor: "bg-yellow-50", width: "50%" },
            3: { text: "Good", color: "text-green-500", bgColor: "bg-green-50", width: "75%" },
            4: { text: "Strong", color: "text-green-600", bgColor: "bg-green-100", width: "100%" }
        };
        
        return { score, ...strength[score] };
    };

    // Validate form
    const validateForm = () => {
        if (!formData.username.trim()) {
            showToast("Username is required", "error");
            return false;
        }

        // Username validation
        if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            showToast("Username can only contain letters, numbers, and underscores", "error");
            return false;
        }

        if (formData.username.length < 3) {
            showToast("Username must be at least 3 characters", "error");
            return false;
        }

        if (!editingUser && !formData.password) {
            showToast("Password is required for new users", "error");
            return false;
        }

        if (formData.password && formData.password.length < 6) {
            showToast("Password must be at least 6 characters", "error");
            return false;
        }

        if (formData.password && formData.password !== formData.confirmPassword) {
            showToast("Passwords do not match", "error");
            return false;
        }

        if (!formData.fullname.trim()) {
            showToast("Full name is required", "error");
            return false;
        }

        return true;
    };

    // Create or update user
    const handleSaveUser = async () => {
        if (!validateForm()) return;

        setActionLoading(true);
        try {
            const userData = {
                username: formData.username.trim().toLowerCase(),
                fullname: formData.fullname.trim(),
                department: formData.department,
                role: formData.role
            };

            // Only include password if provided
            if (formData.password) {
                userData.password = formData.password;
            }

            const res = await fetch(`${API_URL}/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData)
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Operation failed");

            showToast(editingUser ? "User updated successfully" : "User created successfully");
            resetForm();
            loadUsers();
        } catch (err) {
            console.error("Save user error:", err);
            showToast(err.message || "Operation failed", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Start editing a user
    const startEditUser = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: "",
            confirmPassword: "",
            fullname: user.fullname || "",
            department: user.department || "ST",
            role: user.role || "engineer"
        });
    };

    // Reset user password
    const handleResetPassword = async (user) => {
        const newPassword = prompt(`Enter new password for user "${user.username}":`);
        
        if (!newPassword) return;
        
        if (newPassword.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch(`${API_URL}/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: user.username,
                    password: newPassword
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Password reset failed");

            showToast(`Password reset for ${user.username}`);
        } catch (err) {
            console.error("Reset password error:", err);
            showToast("Password reset failed", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Delete user
    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Are you sure you want to delete user "${user.username}"?\n\nThis action cannot be undone.`)) {
            return;
        }

        if (user.role === "admin") {
            const admins = users.filter(u => u.role === "admin");
            if (admins.length <= 1) {
                showToast("Cannot delete the only administrator", "error");
                return;
            }
        }

        setActionLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/${user.username}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Delete failed");

            showToast(`User "${user.username}" deleted successfully`);
            loadUsers();
        } catch (err) {
            console.error("Delete user error:", err);
            showToast(err.message || "Delete failed", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        // Search term filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matches =
                user.username.toLowerCase().includes(term) ||
                (user.fullname && user.fullname.toLowerCase().includes(term)) ||
                user.department.toLowerCase().includes(term) ||
                user.role.toLowerCase().includes(term);

            if (!matches) return false;
        }

        // Role filter
        if (roleFilter !== "all" && user.role !== roleFilter) {
            return false;
        }

        // Department filter
        if (deptFilter !== "all" && user.department !== deptFilter) {
            return false;
        }

        return true;
    });

    // Get role info
    const getRoleInfo = (role) => {
        return roles.find(r => r.value === role) || { label: role, icon: "👤", color: "bg-gray-50 text-gray-700", description: "" };
    };

    // Get department info
    const getDeptInfo = (dept) => {
        return departments.find(d => d.value === dept) || { label: dept, color: "bg-gray-100 text-gray-800", icon: "👤" };
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        try {
            const date = new Date(dateStr);
            return new Intl.DateTimeFormat("en-US", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }).format(date);
        } catch {
            return dateStr;
        }
    };

    if (loading) {
        return (
            <>
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-600 font-medium">Loading Users...</p>
                        <p className="text-gray-400 text-sm mt-2">Fetching user data</p>
                    </div>
                </div>
            </>
        );
    }

    const passwordStrength = checkPasswordStrength(formData.password);

    return (
        <>

            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-top-5 ${toast.type === "error" ? "bg-red-600" : "bg-green-600"
                    }`}>
                    <div className="flex items-center gap-2">
                        {toast.type === "error" ? "❌" : "✅"}
                        {toast.message}
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                                    👥 Users Management
                                </h1>
                                <p className="text-gray-600">
                                    Full control over system users, roles, permissions, and passwords
                                </p>
                                <div className="flex items-center gap-4 mt-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-sm text-gray-600">Administrative Access</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={loadUsers}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition flex items-center gap-2"
                                >
                                    <span className="text-lg">🔄</span>
                                    Refresh
                                </button>
                                <div className="text-sm bg-white px-4 py-2 rounded-lg shadow border">
                                    <span className="font-bold text-blue-600">{users.length}</span> total users
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="text-red-500 text-xl">⚠️</div>
                                    <div>
                                        <p className="font-medium text-red-700">{error}</p>
                                        <p className="text-red-600 text-sm mt-1">Check your connection and try again</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Left Column: User Form & Stats */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* User Form Card */}
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden sticky top-24">
                                {/* Form Header */}
                                <div className={`p-6 text-white ${editingUser
                                        ? "bg-gradient-to-r from-blue-600 to-blue-700"
                                        : "bg-gradient-to-r from-emerald-600 to-green-600"
                                    }`}>
                                    <h2 className="text-xl font-bold mb-1">
                                        {editingUser ? "✏️ Edit User" : "➕ Add New User"}
                                    </h2>
                                    <p className="opacity-90 text-sm">
                                        {editingUser ? "Update user details" : "Create a new system user"}
                                    </p>
                                </div>

                                {/* Form Body */}
                                <div className="p-6 space-y-6">
                                    {/* Username */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Username *
                                        </label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            disabled={editingUser}
                                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${editingUser
                                                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                                    : "border-gray-300 focus:border-blue-500"
                                                }`}
                                            placeholder="Enter username (letters, numbers, underscores)"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Minimum 3 characters. Cannot be changed later.
                                        </p>
                                    </div>

                                    {/* Full Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="fullname"
                                            value={formData.fullname}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                            placeholder="Enter full name"
                                        />
                                    </div>

                                    {/* Password Fields */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Password {!editingUser ? "*" : ""}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition pr-10"
                                                placeholder={editingUser ? "Leave empty to keep current" : "Enter password"}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                title={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? "👁️" : "👁️‍🗨️"}
                                            </button>
                                        </div>
                                        
                                        {/* Password Strength Meter */}
                                        {formData.password && (
                                            <div className="mt-2">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className={passwordStrength.color}>
                                                        Strength: {passwordStrength.text}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        {formData.password.length} chars
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                    <div 
                                                        className={`h-1.5 rounded-full ${passwordStrength.bgColor.replace('bg-', 'bg-').replace('-50', '-500').replace('-100', '-500')}`}
                                                        style={{ width: passwordStrength.width }}
                                                    ></div>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {passwordStrength.score < 3 ? "Use uppercase, numbers, and symbols for stronger password" : "Strong password!"}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    {formData.password && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Confirm Password *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    name="confirmPassword"
                                                    value={formData.confirmPassword}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition pr-10"
                                                    placeholder="Confirm password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                    title={showConfirmPassword ? "Hide password" : "Show password"}
                                                >
                                                    {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                                                </button>
                                            </div>
                                            {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                                <p className="text-red-500 text-sm mt-1">❌ Passwords do not match</p>
                                            )}
                                            {formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && (
                                                <p className="text-green-500 text-sm mt-1">✅ Passwords match</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Department */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Department *
                                        </label>
                                        <select
                                            name="department"
                                            value={formData.department}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                                        >
                                            {departments.map(dept => (
                                                <option key={dept.value} value={dept.value}>
                                                    {dept.icon} {dept.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Role */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Role *
                                        </label>
                                        <select
                                            name="role"
                                            value={formData.role}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                                        >
                                            {roles.map(role => (
                                                <option key={role.value} value={role.value}>
                                                    {role.icon} {role.label}
                                                </option>
                                            ))}
                                        </select>
                                        <div className={`mt-2 p-3 rounded-lg text-sm ${getRoleInfo(formData.role).color}`}>
                                            <p className="font-medium">{getRoleInfo(formData.role).description}</p>
                                            <p className="text-xs mt-1">
                                                {formData.role === "admin" && "• Full system access • User management • Project management"}
                                                {formData.role === "dc" && "• Document control • Archive management • IR number updates"}
                                                {formData.role === "head" && "• Department oversight • Reports viewing • Team management"}
                                                {formData.role === "engineer" && "• IR submission • CPR requests • Personal records"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Form Actions */}
                                    <div className="space-y-3 pt-4">
                                        <button
                                            onClick={handleSaveUser}
                                            disabled={actionLoading}
                                            className={`w-full py-3 rounded-lg font-bold text-white transition-all duration-200 ${actionLoading
                                                    ? "bg-gray-400 cursor-not-allowed"
                                                    : editingUser
                                                        ? "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 shadow-lg"
                                                        : "bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5 shadow-lg"
                                                }`}
                                        >
                                            {actionLoading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                                    {editingUser ? "Updating..." : "Creating..."}
                                                </span>
                                            ) : (
                                                editingUser ? "Update User" : "Create User"
                                            )}
                                        </button>

                                        {editingUser && (
                                            <button
                                                onClick={resetForm}
                                                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
                                            >
                                                Cancel Edit
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Card */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <span>📊</span> User Statistics
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-2 border-b">
                                        <span className="text-sm text-gray-600">Total Users</span>
                                        <span className="font-bold text-gray-800 text-lg">{stats.total}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {roles.map(role => {
                                            const count = stats[role.value === "engineer" ? "engineers" : 
                                                              role.value === "dc" ? "dc" : 
                                                              role.value === "head" ? "heads" : "admins"];
                                            return (
                                                <div key={role.value} className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{role.icon}</span>
                                                        <span className="text-sm text-gray-600">{role.label}</span>
                                                    </div>
                                                    <span className={`font-bold ${role.color.replace('bg-', 'text-').replace('-50', '-600')}`}>
                                                        {count}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="pt-3 border-t">
                                        <div className="text-xs text-gray-500">
                                            Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions Card */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <span>⚡</span> Quick Actions
                                </h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            setSearchTerm("");
                                            setRoleFilter("all");
                                            setDeptFilter("all");
                                        }}
                                        className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                                    >
                                        <span>🗑️</span> Clear All Filters
                                    </button>
                                    <button
                                        onClick={() => navigate('/admin/projects')}
                                        className="w-full py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                                    >
                                        <span>📁</span> Go to Projects
                                    </button>
                                    <button
                                        onClick={() => navigate('/admin')}
                                        className="w-full py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                                    >
                                        <span>👑</span> Admin Dashboard
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Users List */}
                        <div className="lg:col-span-3">
                            {/* Search and Filters */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            🔍 Search Users
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Search by username, name, department, or role..."
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Role
                                        </label>
                                        <select
                                            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full"
                                            value={roleFilter}
                                            onChange={(e) => setRoleFilter(e.target.value)}
                                        >
                                            <option value="all">All Roles</option>
                                            {roles.map(role => (
                                                <option key={role.value} value={role.value}>
                                                    {role.icon} {role.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Department
                                        </label>
                                        <select
                                            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full"
                                            value={deptFilter}
                                            onChange={(e) => setDeptFilter(e.target.value)}
                                        >
                                            <option value="all">All Departments</option>
                                            {departments.map(dept => (
                                                <option key={dept.value} value={dept.value}>
                                                    {dept.icon} {dept.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                {/* Active Filters */}
                                {(searchTerm || roleFilter !== "all" || deptFilter !== "all") && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm text-gray-600">Active filters:</span>
                                            {searchTerm && (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1">
                                                    Search: "{searchTerm}"
                                                    <button onClick={() => setSearchTerm("")} className="text-blue-600 hover:text-blue-800">×</button>
                                                </span>
                                            )}
                                            {roleFilter !== "all" && (
                                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center gap-1">
                                                    Role: {getRoleInfo(roleFilter).label}
                                                    <button onClick={() => setRoleFilter("all")} className="text-purple-600 hover:text-purple-800">×</button>
                                                </span>
                                            )}
                                            {deptFilter !== "all" && (
                                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                                                    Dept: {getDeptInfo(deptFilter).label}
                                                    <button onClick={() => setDeptFilter("all")} className="text-green-600 hover:text-green-800">×</button>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Users List */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                                {/* Table Header */}
                                <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <h2 className="text-xl font-bold mb-1">All System Users</h2>
                                            <p className="text-slate-300 text-sm">
                                                Showing {filteredUsers.length} of {users.length} users
                                                {filteredUsers.length !== users.length && " (filtered)"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-sm bg-white/10 px-3 py-1 rounded-full">
                                                {filteredUsers.length} users
                                            </div>
                                            <div className="text-sm text-slate-300">
                                                Sorted by: <span className="font-medium capitalize">{sortBy}</span> ({sortOrder})
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                {filteredUsers.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <div className="text-gray-400 text-6xl mb-4">👤</div>
                                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                            {searchTerm || roleFilter !== "all" || deptFilter !== "all"
                                                ? "No Matching Users Found"
                                                : "No Users Found"}
                                        </h3>
                                        <p className="text-gray-500 mb-6">
                                            {searchTerm || roleFilter !== "all" || deptFilter !== "all"
                                                ? "Try adjusting your search criteria or clear filters"
                                                : "Add your first user using the form on the left"}
                                        </p>
                                        <button
                                            onClick={resetForm}
                                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                                        >
                                            Add First User
                                        </button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-700 border-b">
                                                    <th 
                                                        className="p-4 text-left font-semibold cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handleSort("username")}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            User
                                                            {sortBy === "username" && (
                                                                <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                                                            )}
                                                        </div>
                                                    </th>
                                                    <th 
                                                        className="p-4 text-left font-semibold cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handleSort("fullname")}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            Full Name
                                                            {sortBy === "fullname" && (
                                                                <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                                                            )}
                                                        </div>
                                                    </th>
                                                    <th 
                                                        className="p-4 text-left font-semibold cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handleSort("department")}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            Department
                                                            {sortBy === "department" && (
                                                                <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                                                            )}
                                                        </div>
                                                    </th>
                                                    <th 
                                                        className="p-4 text-left font-semibold cursor-pointer hover:bg-gray-100"
                                                        onClick={() => handleSort("role")}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            Role
                                                            {sortBy === "role" && (
                                                                <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                                                            )}
                                                        </div>
                                                    </th>
                                                    <th className="p-4 text-left font-semibold">Status</th>
                                                    <th className="p-4 text-left font-semibold">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.map((user) => {
                                                    const roleInfo = getRoleInfo(user.role);
                                                    const deptInfo = getDeptInfo(user.department);
                                                    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

                                                    return (
                                                        <tr
                                                            key={user.username}
                                                            className="border-b hover:bg-gray-50 transition-colors group"
                                                        >
                                                            {/* User Info */}
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getDeptColor(user.department)}`}>
                                                                        {user.username.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-gray-800">
                                                                            {user.username}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            Created: {formatDate(user.createdAt) || "Unknown"}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Full Name */}
                                                            <td className="p-4">
                                                                <div className="font-medium text-gray-800">
                                                                    {user.fullname || "—"}
                                                                </div>
                                                                {user.fullname && (
                                                                    <div className="text-xs text-gray-500">
                                                                        Display name
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Department */}
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-lg">{deptInfo.icon}</span>
                                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${deptInfo.color}`}>
                                                                        {deptInfo.label}
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            {/* Role */}
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-lg">{roleInfo.icon}</span>
                                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                                                                        {roleInfo.label}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    {roleInfo.description}
                                                                </div>
                                                            </td>

                                                            {/* Status */}
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${user.username === currentUser.username ? "bg-green-500 animate-pulse" : "bg-green-500"}`}></div>
                                                                    <span className="text-sm text-gray-600">
                                                                        {user.username === currentUser.username ? "You (Online)" : "Active"}
                                                                    </span>
                                                                </div>
                                                                {user.lastLogin && (
                                                                    <div className="text-xs text-gray-400 mt-1">
                                                                        Last login: {formatDate(user.lastLogin)}
                                                                    </div>
                                                                )}
                                                            </td>

                                                            {/* Actions */}
                                                            <td className="p-4">
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => startEditUser(user)}
                                                                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition flex items-center gap-2 group-hover:bg-blue-100"
                                                                        title="Edit user details"
                                                                    >
                                                                        <span>✏️</span>
                                                                        <span className="hidden sm:inline">Edit</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleResetPassword(user)}
                                                                        disabled={actionLoading}
                                                                        className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium transition flex items-center gap-2 group-hover:bg-green-100"
                                                                        title="Reset password"
                                                                    >
                                                                        <span>🔑</span>
                                                                        <span className="hidden sm:inline">Reset PW</span>
                                                                    </button>
                                                                    {user.role !== "admin" || stats.admins > 1 ? (
                                                                        <button
                                                                            onClick={() => handleDeleteUser(user)}
                                                                            disabled={actionLoading}
                                                                            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 group-hover:bg-red-50 ${actionLoading
                                                                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                                                    : "bg-red-50 hover:bg-red-100 text-red-700"
                                                                                }`}
                                                                            title="Delete user"
                                                                        >
                                                                            <span>🗑️</span>
                                                                            <span className="hidden sm:inline">Delete</span>
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            disabled
                                                                            className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed flex items-center gap-2"
                                                                            title="Cannot delete the only administrator"
                                                                        >
                                                                            <span>🛡️</span>
                                                                            <span className="hidden sm:inline">Protected</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Table Footer */}
                                {filteredUsers.length > 0 && (
                                    <div className="bg-gray-50 px-6 py-4 border-t">
                                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                            <div className="text-sm text-gray-600">
                                                Showing <span className="font-medium">{filteredUsers.length}</span> of{" "}
                                                <span className="font-medium">{users.length}</span> users
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-sm text-gray-600">
                                                    Sort by:{" "}
                                                    <select
                                                        className="ml-1 border rounded px-2 py-1"
                                                        value={sortBy}
                                                        onChange={(e) => setSortBy(e.target.value)}
                                                    >
                                                        <option value="username">Username</option>
                                                        <option value="fullname">Full Name</option>
                                                        <option value="department">Department</option>
                                                        <option value="role">Role</option>
                                                    </select>
                                                    <select
                                                        className="ml-1 border rounded px-2 py-1"
                                                        value={sortOrder}
                                                        onChange={(e) => setSortOrder(e.target.value)}
                                                    >
                                                        <option value="asc">Ascending</option>
                                                        <option value="desc">Descending</option>
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={loadUsers}
                                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2"
                                                >
                                                    <span>🔄</span> Refresh List
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Users Summary */}
                            {filteredUsers.length > 0 && (
                                <div className="mt-6">
                                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl border border-gray-200 p-6">
                                        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                            <span>📈</span> Filtered Users Summary
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {roles.map(role => {
                                                const count = filteredUsers.filter(u => u.role === role.value).length;
                                                if (count === 0) return null;

                                                return (
                                                    <div key={role.value} className="bg-white rounded-xl p-4 text-center border shadow-sm">
                                                        <div className="text-2xl mb-2">{role.icon}</div>
                                                        <div className="text-2xl font-bold text-gray-800">{count}</div>
                                                        <div className="text-sm text-gray-500">{role.label}</div>
                                                        <div className="text-xs text-gray-400 mt-1">
                                                            {Math.round((count / filteredUsers.length) * 100)}% of filtered
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Admin Notes */}
                    <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
                        <div className="flex items-start gap-4">
                            <div className="text-blue-500 text-2xl">💡</div>
                            <div className="flex-1">
                                <h4 className="font-bold text-blue-800 mb-2">User Management Guidelines</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white/50 p-3 rounded-lg">
                                        <p className="text-blue-700 text-sm font-medium">Password Security</p>
                                        <p className="text-blue-600 text-xs mt-1">
                                            • Minimum 6 characters<br/>
                                            • Use strong passwords<br/>
                                            • Reset passwords regularly<br/>
                                            • Never share passwords
                                        </p>
                                    </div>
                                    <div className="bg-white/50 p-3 rounded-lg">
                                        <p className="text-emerald-700 text-sm font-medium">Role Management</p>
                                        <p className="text-emerald-600 text-xs mt-1">
                                            • Admins: Full system access<br/>
                                            • DC: Document control only<br/>
                                            • Heads: Department oversight<br/>
                                            • Engineers: Basic access
                                        </p>
                                    </div>
                                    <div className="bg-white/50 p-3 rounded-lg">
                                        <p className="text-purple-700 text-sm font-medium">Best Practices</p>
                                        <p className="text-purple-600 text-xs mt-1">
                                            • Regular user audits<br/>
                                            • Monitor login activity<br/>
                                            • Remove inactive users<br/>
                                            • Keep roles updated
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// Helper function
function getDeptColor(dept) {
    switch(dept) {
        case "ARCH": return "bg-blue-100 text-blue-800";
        case "ST": return "bg-green-100 text-green-800";
        case "ELECT": return "bg-purple-100 text-purple-800";
        case "MEP": return "bg-amber-100 text-amber-800";
        case "SURV": return "bg-indigo-100 text-indigo-800";
        case "Admin": return "bg-red-100 text-red-800";
        default: return "bg-gray-100 text-gray-800";
    }
}