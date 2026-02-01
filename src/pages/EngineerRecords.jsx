// EngineerRecords.jsx
import { useEffect, useState } from "react";
import { API_URL } from "../config";
import { useNavigate } from "react-router-dom";

export default function EngineerRecords() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "null");

    // Redirect to login if not authenticated
    if (!user || !user.username) {
        navigate("/login");
        return null;
    }

    const [tab, setTab] = useState("personal"); // personal, department, all
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // Filters
    const [projectFilter, setProjectFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all"); // all, ir, cpr, revision
    const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month
    const [statusFilter, setStatusFilter] = useState("all"); // all, pending, completed
    const [departmentFilter, setDepartmentFilter] = useState("all");
    
    // Data for filters
    const [projects, setProjects] = useState([]);
    const [departments, setDepartments] = useState([]);
    
    // Stats
    const [stats, setStats] = useState({
        personal: { total: 0, pending: 0, completed: 0, ir: 0, cpr: 0, revisions: 0 },
        department: { total: 0, pending: 0, completed: 0, ir: 0, cpr: 0, revisions: 0 },
        all: { total: 0, pending: 0, completed: 0, ir: 0, cpr: 0, revisions: 0 }
    });

    // Load data
    useEffect(() => {
        loadProjects();
        fetchData();
    }, [tab, user.username, user.department, user.role]);

    // Load projects list
    const loadProjects = async () => {
        try {
            const res = await fetch(`${API_URL}/projects`);
            const data = await res.json();
            setProjects(Object.keys(data.projects || {}).sort());
        } catch (err) {
            console.error("Error loading projects:", err);
        }
    };

    // Load departments list (for admin)
    const loadDepartments = async () => {
        if (user.role === "admin") {
            try {
                const res = await fetch(`${API_URL}/users`);
                const data = await res.json();
                const depts = [...new Set(data.users?.map(u => u.department).filter(Boolean))].sort();
                setDepartments(depts);
            } catch (err) {
                console.error("Error loading departments:", err);
            }
        }
    };

    // Fetch data based on selected tab
    const fetchData = async () => {
        setLoading(true);
        setError("");

        try {
            let allItems = [];
            
            // Admin can see everything
            if (user.role === "admin") {
                const [irsRes, revsRes, archiveRes] = await Promise.all([
                    fetch(`${API_URL}/irs`),
                    fetch(`${API_URL}/revs`),
                    fetch(`${API_URL}/archive/engineer?user=${user.username}`)
                ]);
                
                const irsData = await irsRes.json();
                const revsData = await revsRes.json();
                const archiveData = await archiveRes.json();
                
                const activeIRs = (irsData.irs || []).map(item => ({
                    ...item,
                    type: item.requestType || "IR",
                    isCPR: item.requestType === "CPR",
                    isRevision: false,
                    isArchived: false,
                    downloadedBy: item.downloadedBy || ""
                }));
                
                const activeRevs = (revsData.revs || []).map(item => ({
                    ...item,
                    type: "REVISION",
                    isRevision: true,
                    isCPR: item.revisionType === "CPR_REVISION",
                    isArchived: false,
                    downloadedBy: item.downloadedBy || ""
                }));
                
                const archivedItems = (archiveData.archive || []).map(item => ({
                    ...item,
                    type: item.isRevision ? "REVISION" : (item.requestType || "IR"),
                    isCPR: item.isRevision ? item.revisionType === "CPR_REVISION" : item.requestType === "CPR",
                    isArchived: true,
                    downloadedBy: item.downloadedBy || ""
                }));
                
                allItems = [...activeIRs, ...activeRevs, ...archivedItems];
                
            } else {
                // Regular users see their own data and department data
                const [personalIRsRes, personalRevsRes, departmentIRsRes, archiveRes] = await Promise.all([
                    fetch(`${API_URL}/irs-by-user-and-dept?user=${user.username}&dept=${user.department}`),
                    fetch(`${API_URL}/revs`),
                    user.role === "head" ? fetch(`${API_URL}/irs`) : Promise.resolve({ json: () => ({ irs: [] }) }),
                    fetch(`${API_URL}/archive/engineer?user=${user.username}`)
                ]);
                
                const personalIRsData = await personalIRsRes.json();
                const personalRevsData = await personalRevsRes.json();
                const departmentIRsData = await departmentIRsRes.json();
                const archiveData = await archiveRes.json();
                
                // Personal IRs
                const personalIRs = [...(personalIRsData.irs || []), ...(personalIRsData.revs || [])]
                    .map(item => ({
                        ...item,
                        type: item.requestType || "IR",
                        isCPR: item.requestType === "CPR",
                        isRevision: item.isRevision || false,
                        isArchived: false,
                        isPersonal: true,
                        downloadedBy: item.downloadedBy || ""
                    }));
                
                // Personal Revisions
                const personalRevs = (personalRevsData.revs || [])
                    .filter(rev => rev.user === user.username)
                    .map(rev => ({
                        ...rev,
                        type: "REVISION",
                        isRevision: true,
                        isCPR: rev.revisionType === "CPR_REVISION",
                        isArchived: false,
                        isPersonal: true,
                        downloadedBy: rev.downloadedBy || ""
                    }));
                
                // Department IRs (for head of department)
                const departmentIRs = (departmentIRsData.irs || [])
                    .filter(ir => ir.department === user.department && ir.user !== user.username)
                    .map(item => ({
                        ...item,
                        type: item.requestType || "IR",
                        isCPR: item.requestType === "CPR",
                        isRevision: false,
                        isArchived: false,
                        isPersonal: false,
                        downloadedBy: item.downloadedBy || ""
                    }));
                
                // Department Revisions (for head of department)
                const departmentRevs = user.role === "head" ? 
                    (personalRevsData.revs || [])
                        .filter(rev => rev.department === user.department && rev.user !== user.username)
                        .map(rev => ({
                            ...rev,
                            type: "REVISION",
                            isRevision: true,
                            isCPR: rev.revisionType === "CPR_REVISION",
                            isArchived: false,
                            isPersonal: false,
                            downloadedBy: rev.downloadedBy || ""
                        })) : [];
                
                // Archived items
                const archivedItems = (archiveData.archive || []).map(item => ({
                    ...item,
                    type: item.isRevision ? "REVISION" : (item.requestType || "IR"),
                    isCPR: item.isRevision ? item.revisionType === "CPR_REVISION" : item.requestType === "CPR",
                    isArchived: true,
                    isPersonal: item.user === user.username,
                    downloadedBy: item.downloadedBy || ""
                }));
                
                allItems = [...personalIRs, ...personalRevs, ...departmentIRs, ...departmentRevs, ...archivedItems];
            }
            
            // Sort by date (newest first)
            allItems.sort((a, b) => {
                const dateA = new Date(a.sentAt || a.receivedDate || a.archivedAt || 0);
                const dateB = new Date(b.sentAt || b.receivedDate || b.archivedAt || 0);
                return dateB - dateA;
            });
            
            setItems(allItems);
            calculateStats(allItems);
            loadDepartments();
            
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Failed to load records. Please try again.");
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    // Calculate statistics
    const calculateStats = (itemsList) => {
        const personalItems = itemsList.filter(item => item.isPersonal || item.user === user.username);
        const departmentItems = itemsList.filter(item => 
            item.department === user.department || 
            (user.role === "head" && item.department === user.department)
        );
        const allItems = itemsList;
        
        const calculate = (list) => ({
            total: list.length,
            pending: list.filter(item => !item.isDone && !item.isArchived).length,
            completed: list.filter(item => item.isDone || item.isArchived).length,
            ir: list.filter(item => !item.isCPR && !item.isRevision).length,
            cpr: list.filter(item => item.isCPR && !item.isRevision).length,
            revisions: list.filter(item => item.isRevision).length
        });
        
        setStats({
            personal: calculate(personalItems),
            department: calculate(departmentItems),
            all: calculate(allItems)
        });
    };

    // Apply filters
    const filteredItems = items.filter(item => {
        // Filter by tab
        if (tab === "personal" && !item.isPersonal && item.user !== user.username) return false;
        if (tab === "department" && item.department !== user.department) return false;
        
        // Filter by project
        if (projectFilter !== "all" && item.project !== projectFilter) return false;
        
        // Filter by type
        if (typeFilter !== "all") {
            if (typeFilter === "ir" && (item.isCPR || item.isRevision)) return false;
            if (typeFilter === "cpr" && (!item.isCPR || item.isRevision)) return false;
            if (typeFilter === "revision" && !item.isRevision) return false;
        }
        
        // Filter by date
        if (dateFilter !== "all") {
            const itemDate = new Date(item.sentAt || item.receivedDate || item.archivedAt);
            const today = new Date();
            
            switch (dateFilter) {
                case "today":
                    if (itemDate.toDateString() !== today.toDateString()) return false;
                    break;
                case "week":
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 7);
                    if (itemDate < weekAgo) return false;
                    break;
                case "month":
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(today.getMonth() - 1);
                    if (itemDate < monthAgo) return false;
                    break;
            }
        }
        
        // Filter by status
        if (statusFilter !== "all") {
            if (statusFilter === "pending" && (item.isDone || item.isArchived)) return false;
            if (statusFilter === "completed" && !item.isDone && !item.isArchived) return false;
        }
        
        // Filter by department (for admin)
        if (departmentFilter !== "all" && item.department !== departmentFilter) return false;
        
        return true;
    });

    // Handle actions
    const handleViewDetails = (item) => {
        alert(`Details for ${item.irNo || item.revNo}:\n\n` +
            `Project: ${item.project}\n` +
            `Type: ${item.type}\n` +
            `User: ${item.user}\n` +
            `Department: ${item.department}\n` +
            `Description: ${item.desc || item.revNote}\n` +
            `Date: ${formatDate(item.sentAt || item.receivedDate)}\n` +
            `Status: ${item.isArchived ? "Archived" : item.isDone ? "Completed" : "Pending"}\n` +
            `Location: ${item.location || "N/A"}\n` +
            `Floor: ${item.floor || "N/A"}\n` +
            `Downloaded by: ${item.downloadedBy || "Not downloaded"}`);
    };

    const handleCopyToClipboard = async (item) => {
        const text = `${item.irNo || item.revNo} - ${item.desc || item.revNote} - ${item.project}`;
        try {
            await navigator.clipboard.writeText(text);
            showToast("Copied to clipboard!");
        } catch (err) {
            console.error("Copy failed:", err);
            showToast("Failed to copy");
        }
    };

    const handleArchive = async (item) => {
        if (!window.confirm(`Archive ${item.irNo || item.revNo}?`)) return;

        try {
            const res = await fetch(`${API_URL}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo: item.irNo || item.revNo,
                    role: "engineer",
                    isRevision: item.isRevision || false,
                    revisionType: item.isCPR ? "CPR_REVISION" : "IR_REVISION"
                }),
            });

            if (res.ok) {
                showToast("Item archived successfully!");
                fetchData();
            } else {
                const data = await res.json();
                throw new Error(data.error || "Archive failed");
            }
        } catch (err) {
            console.error("Archive error:", err);
            showToast(`Archive failed: ${err.message}`);
        }
    };

    const handleUnarchive = async (item) => {
        if (!window.confirm(`Restore ${item.irNo || item.revNo} from archive?`)) return;

        try {
            const res = await fetch(`${API_URL}/unarchive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo: item.irNo || item.revNo,
                    role: "engineer",
                    isRevision: item.isRevision || false
                }),
            });

            if (res.ok) {
                showToast("Item restored successfully!");
                fetchData();
            } else {
                const data = await res.json();
                throw new Error(data.error || "Restore failed");
            }
        } catch (err) {
            console.error("Unarchive error:", err);
            showToast(`Restore failed: ${err.message}`);
        }
    };

    const handleMarkDone = async (item) => {
        if (!window.confirm(`Mark ${item.irNo || item.revNo} as completed?`)) return;

        try {
            const endpoint = item.isRevision ? `${API_URL}/revs/mark-done` : `${API_URL}/irs/mark-done`;
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ irNo: item.irNo || item.revNo }),
            });

            if (res.ok) {
                showToast("Marked as completed!");
                fetchData();
            } else {
                const data = await res.json();
                throw new Error(data.error || "Mark failed");
            }
        } catch (err) {
            console.error("Mark done error:", err);
            showToast(`Mark failed: ${err.message}`);
        }
    };

    // Format date with short month and proper formatting
    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        try {
            const date = new Date(dateStr);
            if (isNaN(date)) return dateStr;
            
            // تنسيق: 31 Jan 2026, 12:56
            return new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }).format(date) + "\n" + 
            new Intl.DateTimeFormat("en-GB", {
                hour: "2-digit",
                minute: "2-digit"
            }).format(date);
        } catch {
            return dateStr;
        }
    };

    // Format short date for grouping
    const formatShortDate = (dateStr) => {
        if (!dateStr) return "Unknown Date";
        try {
            const date = new Date(dateStr);
            if (isNaN(date)) return dateStr;
            
            // تنسيق مختصر لعرض اسم من قام بالتنزيل
            return new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short"
            }).format(date);
        } catch {
            return dateStr;
        }
    };

    // Group items by date
    const groupedItems = filteredItems.reduce((acc, item) => {
        const dateKey = formatShortDate(item.sentAt || item.receivedDate || item.archivedAt);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(item);
        return acc;
    }, {});

    // Sort dates (newest first)
    const sortedDates = Object.keys(groupedItems).sort((a, b) => {
        return new Date(b) - new Date(a);
    });

    // Toast notification
    const [toast, setToast] = useState("");
    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(""), 3000);
    };

    // Get status badge class
    const getStatusClass = (item) => {
        if (item.isArchived) return "bg-gray-100 text-gray-800 border border-gray-300";
        if (item.isDone) return "bg-green-100 text-green-800 border border-green-300";
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
    };

    // Get type badge class
    const getTypeClass = (item) => {
        if (item.isRevision) {
            return item.isCPR ? 
                "bg-green-100 text-green-800 border border-green-300" :
                "bg-purple-100 text-purple-800 border border-purple-300";
        }
        return item.isCPR ? 
            "bg-green-100 text-green-800 border border-green-300" :
            "bg-blue-100 text-blue-800 border border-blue-300";
    };

    // Get user badge class
    const getUserClass = (item) => {
        return item.user === user.username ? 
            "bg-blue-100 text-blue-800" : 
            "bg-gray-100 text-gray-800";
    };

    // Reset filters
    const resetFilters = () => {
        setProjectFilter("all");
        setTypeFilter("all");
        setDateFilter("all");
        setStatusFilter("all");
        setDepartmentFilter("all");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Loading records...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-5 right-5 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-5">
                    {toast}
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                            📋 My Records Dashboard
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Welcome back, <span className="font-semibold text-blue-600">{user.username}</span>
                            <span className="mx-2">•</span>
                            Role: <span className="font-semibold text-blue-600 capitalize">{user.role}</span>
                            <span className="mx-2">•</span>
                            Department: <span className="font-semibold text-blue-600">{user.department}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={fetchData}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                        >
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border mb-6 overflow-hidden">
                    <div className="flex flex-col md:flex-row border-b">
                        <button
                            onClick={() => setTab("personal")}
                            className={`flex-1 py-4 text-center font-medium transition-colors ${tab === "personal" ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                👤 My Requests ({stats.personal.total})
                            </span>
                        </button>
                        
                        {(user.role === "head" || user.role === "admin") && (
                            <button
                                onClick={() => setTab("department")}
                                className={`flex-1 py-4 text-center font-medium transition-colors ${tab === "department" ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600" : "text-gray-600 hover:bg-gray-50"}`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    🏢 My Department ({stats.department.total})
                                </span>
                            </button>
                        )}
                        
                        {user.role === "admin" && (
                            <button
                                onClick={() => setTab("all")}
                                className={`flex-1 py-4 text-center font-medium transition-colors ${tab === "all" ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600" : "text-gray-600 hover:bg-gray-50"}`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    📊 All Requests ({stats.all.total})
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-gray-800">{filteredItems.length}</div>
                        <div className="text-sm text-gray-500">Showing</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                            {filteredItems.filter(item => !item.isDone && !item.isArchived).length}
                        </div>
                        <div className="text-sm text-gray-500">Pending</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {filteredItems.filter(item => item.isDone || item.isArchived).length}
                        </div>
                        <div className="text-sm text-gray-500">Completed</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {filteredItems.filter(item => !item.isCPR && !item.isRevision).length}
                        </div>
                        <div className="text-sm text-gray-500">IR</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {filteredItems.filter(item => item.isCPR && !item.isRevision).length}
                        </div>
                        <div className="text-sm text-gray-500">CPR</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {filteredItems.filter(item => item.isRevision).length}
                        </div>
                        <div className="text-sm text-gray-500">Revisions</div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                        <h3 className="text-lg font-bold text-gray-800">🎯 Filters</h3>
                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm"
                        >
                            Reset All Filters
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Project Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Project
                            </label>
                            <select
                                value={projectFilter}
                                onChange={(e) => setProjectFilter(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-white"
                            >
                                <option value="all">All Projects</option>
                                {projects.map(project => (
                                    <option key={project} value={project}>{project}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Type Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type
                            </label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-white"
                            >
                                <option value="all">All Types</option>
                                <option value="ir">IR Only</option>
                                <option value="cpr">CPR Only</option>
                                <option value="revision">Revisions Only</option>
                            </select>
                        </div>
                        
                        {/* Date Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date Range
                            </label>
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-white"
                            >
                                <option value="all">All Dates</option>
                                <option value="today">Today</option>
                                <option value="week">Last 7 Days</option>
                                <option value="month">Last 30 Days</option>
                            </select>
                        </div>
                        
                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-white"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                        
                        {/* Department Filter (for admin) */}
                        {user.role === "admin" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Department
                                </label>
                                <select
                                    value={departmentFilter}
                                    onChange={(e) => setDepartmentFilter(e.target.value)}
                                    className="w-full p-2 border rounded-lg bg-white"
                                >
                                    <option value="all">All Departments</option>
                                    {departments.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                {error ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <div className="text-red-500 text-4xl mb-3">⚠️</div>
                        <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Data</h3>
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                            onClick={fetchData}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                        >
                            Retry
                        </button>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                        <div className="text-gray-400 text-6xl mb-4">
                            📭
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            No Records Found
                        </h3>
                        <p className="text-gray-500 mb-4">
                            No records match your current filters. Try adjusting your search criteria.
                        </p>
                        <button
                            onClick={resetFilters}
                            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                        >
                            Reset Filters
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {sortedDates.map(dateKey => (
                            <div key={dateKey} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                                {/* Date Header */}
                                <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                                📅 {dateKey}
                                            </h2>
                                            <p className="text-gray-300 mt-1">
                                                {groupedItems[dateKey].length} request{groupedItems[dateKey].length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-gray-600/50 text-white rounded-full text-sm">
                                                Pending: {groupedItems[dateKey].filter(x => !x.isDone && !x.isArchived).length}
                                            </span>
                                            <span className="px-3 py-1 bg-green-600/50 text-white rounded-full text-sm">
                                                Completed: {groupedItems[dateKey].filter(x => x.isDone || x.isArchived).length}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-700 border-b">
                                                <th className="p-4 text-left font-semibold">ID / Number</th>
                                                <th className="p-4 text-left font-semibold">Description</th>
                                                <th className="p-4 text-left font-semibold">Type</th>
                                                <th className="p-4 text-left font-semibold">User</th>
                                                <th className="p-4 text-left font-semibold">Department</th>
                                                <th className="p-4 text-left font-semibold">Time</th>
                                                <th className="p-4 text-left font-semibold">Status</th>
                                                <th className="p-4 text-left font-semibold">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groupedItems[dateKey].map((item, idx) => (
                                                <tr
                                                    key={item.irNo || item.revNo || idx}
                                                    className="border-b hover:bg-gray-50 transition-colors"
                                                >
                                                    <td className="p-4">
                                                        <div className="font-mono font-semibold text-gray-800">
                                                            {item.irNo || item.revNo}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Project: {item.project}
                                                        </div>
                                                    </td>

                                                    <td className="p-4">
                                                        <div className="text-gray-700 font-medium">
                                                            {item.desc || item.revNote || "No description"}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {item.location && `Location: ${item.location}`}
                                                            {item.floor && ` • Floor: ${item.floor}`}
                                                        </div>
                                                    </td>

                                                    <td className="p-4">
                                                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getTypeClass(item)}`}>
                                                            {item.type}
                                                        </span>
                                                    </td>

                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getUserClass(item)}`}>
                                                            {item.user}
                                                        </span>
                                                    </td>

                                                    <td className="p-4">
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                                                            {item.department}
                                                        </span>
                                                    </td>

                                                    <td className="p-4">
                                                        <div className="text-gray-600 whitespace-pre-line">
                                                            {formatDate(item.sentAt || item.receivedDate)}
                                                        </div>
                                                        {item.archivedAt && (
                                                            <div className="text-xs text-amber-600 mt-1">
                                                                Archived: {formatShortDate(item.archivedAt)}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="p-4">
                                                        <div className="space-y-2">
                                                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusClass(item)}`}>
                                                                {item.isArchived ? (
                                                                    <>
                                                                        <span>📁</span> Archived
                                                                    </>
                                                                ) : item.isDone ? (
                                                                    <>
                                                                        <span>✓</span> Completed
                                                                    </>
                                                                ) : (
                                                                    "Pending"
                                                                )}
                                                            </span>
                                                            
                                                            {/* إظهار اسم من قام بتنزيل ملف Word */}
                                                            {item.downloadedBy && (
                                                                <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                                                    <span className="font-medium">📄 Downloaded by:</span> {item.downloadedBy}
                                                                    {item.downloadedAt && (
                                                                        <div className="text-gray-500 mt-1">
                                                                            on {formatShortDate(item.downloadedAt)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-2 min-w-[180px]">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleViewDetails(item)}
                                                                    className="flex-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition"
                                                                >
                                                                    View
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCopyToClipboard(item)}
                                                                    className="flex-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition"
                                                                >
                                                                    Copy
                                                                </button>
                                                            </div>
                                                            
                                                            {item.user === user.username && (
                                                                <div className="flex gap-2">
                                                                    {item.isArchived ? (
                                                                        <button
                                                                            onClick={() => handleUnarchive(item)}
                                                                            className="flex-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition"
                                                                        >
                                                                            Restore
                                                                        </button>
                                                                    ) : !item.isDone ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleMarkDone(item)}
                                                                                className="flex-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition"
                                                                            >
                                                                                Mark Done
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleArchive(item)}
                                                                                className="flex-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-medium transition"
                                                                            >
                                                                                Archive
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleArchive(item)}
                                                                            className="flex-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-medium transition"
                                                                        >
                                                                            Archive
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}