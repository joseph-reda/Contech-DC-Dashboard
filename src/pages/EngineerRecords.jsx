// src/pages/EngineerRecords.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";

export default function EngineerRecords() {
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({
        project: "all",
        type: "all",
        status: "all",
        dateRange: "all"
    });

    const user = JSON.parse(localStorage.getItem("user") || "null");

    // التحقق من المصادقة
    useEffect(() => {
        if (!user || !user.username) {
            navigate("/login");
        }
    }, [navigate, user]);

    // تحميل السجلات
    useEffect(() => {
        loadRecords();
    }, []);

    async function loadRecords() {
        setLoading(true);
        setError("");
        try {
            const url = `${API_URL}/irs-by-user-and-dept?user=${user.username}&dept=${user.department}`;
            const res = await fetch(url);
            
            if (!res.ok) {
                throw new Error(`Failed to load records: ${res.status}`);
            }

            const data = await res.json();
            
            // دمج IRs وRevisions
            const irsList = data.irs || [];
            const revsList = data.revs || [];

            const allRecords = [
                ...irsList.map(ir => ({
                    ...ir,
                    isRevision: false,
                    requestType: ir.requestType || "IR",
                    archivedDate: ir.archivedAt || "",
                    archivedBy: ir.archivedBy || "",
                    itemType: "IR",
                    displayNumber: ir.irNo
                })),
                ...revsList.map(rev => ({
                    ...rev,
                    isRevision: true,
                    requestType: rev.parentRequestType || "IR",
                    archivedDate: rev.archivedAt || "",
                    archivedBy: rev.archivedBy || "",
                    itemType: "REV",
                    displayNumber: rev.displayNumber || rev.revNo
                }))
            ];

            // ترتيب حسب التاريخ (الأحدث أولاً)
            allRecords.sort((a, b) => 
                new Date(b.sentAt || b.createdAt) - new Date(a.sentAt || a.createdAt)
            );

            setRecords(allRecords);
            setToast(`✅ Loaded ${allRecords.length} records`);
        } catch (err) {
            console.error("Load records error:", err);
            setError("Failed to load records. Please try again.");
            setToast("❌ Error loading records");
        } finally {
            setLoading(false);
        }
    }

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(""), 3000);
    };

    // تنسيق التواريخ
    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        try {
            const date = new Date(dateStr);
            if (isNaN(date)) return dateStr;
            return new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }).format(date);
        } catch {
            return dateStr;
        }
    };

    const formatShortDate = (dateStr) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            if (isNaN(date)) return dateStr;
            return new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short"
            }).format(date);
        } catch {
            return dateStr;
        }
    };

    // الحصول على نوع العنصر
    const getItemType = (item) => {
        if (item.isRevision) {
            return item.revisionType === "CPR_REVISION" ? "CPR REVISION" : "IR REVISION";
        }
        return item.requestType === "CPR" ? "CPR" : "IR";
    };

    // الحصول على لون النوع
    const getTypeColor = (item) => {
        if (item.isRevision) {
            return item.revisionType === "CPR_REVISION" 
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-purple-100 text-purple-800 border border-purple-300";
        }
        return item.requestType === "CPR"
            ? "bg-green-100 text-green-800 border border-green-300"
            : "bg-blue-100 text-blue-800 border border-blue-300";
    };

    // الحصول على لون الحالة
    const getStatusColor = (item) => {
        if (item.isArchived) return "bg-gray-100 text-gray-800 border border-gray-300";
        if (item.isDone) return "bg-emerald-100 text-emerald-800 border border-emerald-300";
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
    };

    const getStatusText = (item) => {
        if (item.isArchived) return "Archived";
        if (item.isDone) return "Completed";
        return "Pending";
    };

    // الفلترة والبحث
    const filteredRecords = records.filter(record => {
        // فلترة حسب المشروع
        if (filters.project !== "all" && record.project !== filters.project) return false;
        
        // فلترة حسب النوع
        if (filters.type !== "all") {
            if (filters.type === "ir" && (record.isRevision || record.requestType === "CPR")) return false;
            if (filters.type === "cpr" && record.requestType !== "CPR") return false;
            if (filters.type === "revision" && !record.isRevision) return false;
        }
        
        // فلترة حسب الحالة
        if (filters.status !== "all") {
            if (filters.status === "completed" && !record.isDone) return false;
            if (filters.status === "pending" && record.isDone) return false;
            if (filters.status === "archived" && !record.isArchived) return false;
        }
        
        // فلترة حسب نطاق التاريخ
        if (filters.dateRange !== "all") {
            const recordDate = new Date(record.sentAt || record.createdAt);
            const today = new Date();
            
            switch (filters.dateRange) {
                case "today":
                    if (recordDate.toDateString() !== today.toDateString()) return false;
                    break;
                case "week":
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 7);
                    if (recordDate < weekAgo) return false;
                    break;
                case "month":
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(today.getMonth() - 1);
                    if (recordDate < monthAgo) return false;
                    break;
            }
        }
        
        // البحث
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const irNumber = record.displayNumber?.toLowerCase() || "";
            const desc = record.desc?.toLowerCase() || "";
            const project = record.project?.toLowerCase() || "";
            const location = record.location?.toLowerCase() || "";
            
            return (
                irNumber.includes(term) ||
                desc.includes(term) ||
                project.includes(term) ||
                location.includes(term)
            );
        }
        
        return true;
    });

    // الحصول على المشاريع الفريدة
    const projects = [...new Set(records.map(r => r.project).filter(Boolean))].sort();

    // الإحصائيات
    const stats = {
        total: records.length,
        pending: records.filter(r => !r.isDone && !r.isArchived).length,
        completed: records.filter(r => r.isDone).length,
        archived: records.filter(r => r.isArchived).length,
        revisions: records.filter(r => r.isRevision).length,
        cpr: records.filter(r => !r.isRevision && r.requestType === "CPR").length,
        ir: records.filter(r => !r.isRevision && r.requestType !== "CPR").length
    };

    const resetFilters = () => {
        setFilters({
            project: "all",
            type: "all",
            status: "all",
            dateRange: "all"
        });
        setSearchTerm("");
    };

    // إعادة التحميل
    const handleRefresh = () => {
        loadRecords();
    };

    // عرض التفاصيل
    const handleViewDetails = (item) => {
        const details = `
📋 **Item Details**

🔢 **Number:** ${item.displayNumber}
🏗️ **Project:** ${item.project}
📝 **Type:** ${getItemType(item)}
👤 **User:** ${item.user}
🏢 **Department:** ${item.department}
📍 **Location:** ${item.location || "N/A"}
🏢 **Floor:** ${item.floor || "N/A"}
📅 **Date:** ${formatDate(item.sentAt)}
📋 **Description:** ${item.desc || item.revNote || "No description"}
✅ **Status:** ${getStatusText(item)}
${item.downloadedBy ? `📄 **Downloaded by:** ${item.downloadedBy}` : ""}
${item.archivedBy ? `📁 **Archived by:** ${item.archivedBy}` : ""}
        `.trim();
        
        alert(details);
    };

    // نسخ إلى الحافظة
    const handleCopy = async (item) => {
        const text = `${item.displayNumber} - ${item.project} - ${item.desc || ""}`;
        try {
            await navigator.clipboard.writeText(text);
            showToast("✅ Copied to clipboard!");
        } catch (err) {
            showToast("❌ Failed to copy");
        }
    };

    // أرشفة العنصر
    const handleArchive = async (item) => {
        if (!window.confirm(`Archive ${item.displayNumber}?\n\nThis will move the item to archive.`)) return;

        try {
            const res = await fetch(`${API_URL}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo: item.irNo || item.revNo,
                    role: "engineer",
                    isRevision: item.isRevision || false
                }),
            });

            if (res.ok) {
                showToast("✅ Item archived successfully!");
                loadRecords();
            } else {
                const data = await res.json();
                throw new Error(data.error || "Archive failed");
            }
        } catch (err) {
            console.error("Archive error:", err);
            showToast(`❌ Archive failed: ${err.message}`);
        }
    };

    // استعادة من الأرشيف
    const handleRestore = async (item) => {
        if (!window.confirm(`Restore ${item.displayNumber} from archive?`)) return;

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
                showToast("✅ Item restored successfully!");
                loadRecords();
            } else {
                const data = await res.json();
                throw new Error(data.error || "Restore failed");
            }
        } catch (err) {
            console.error("Restore error:", err);
            showToast(`❌ Restore failed: ${err.message}`);
        }
    };

    // 🎨 مكونات التصميم
    const LoadingScreen = () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading Your Records...</p>
                <p className="text-gray-400 text-sm mt-2">Please wait a moment</p>
            </div>
        </div>
    );

    const ToastNotification = () => (
        toast && (
            <div className="fixed top-5 right-5 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-5">
                {toast}
            </div>
        )
    );

    const StatsCards = () => (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
                <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
                <div className="text-sm text-gray-500">Archived</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.ir}</div>
                <div className="text-sm text-gray-500">IR</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.cpr}</div>
                <div className="text-sm text-gray-500">CPR</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.revisions}</div>
                <div className="text-sm text-gray-500">Revisions</div>
            </div>
        </div>
    );

    const SearchAndFilters = () => (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        🔍 Search Records
                    </label>
                    <input
                        type="text"
                        placeholder="Search by IR number, description, project, location..."
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setSearchTerm("")}
                    className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
                >
                    Clear Search
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <select
                        value={filters.project}
                        onChange={(e) => setFilters(prev => ({...prev, project: e.target.value}))}
                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Projects</option>
                        {projects.map(project => (
                            <option key={project} value={project}>{project}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                        value={filters.type}
                        onChange={(e) => setFilters(prev => ({...prev, type: e.target.value}))}
                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Types</option>
                        <option value="ir">IR Only</option>
                        <option value="cpr">CPR Only</option>
                        <option value="revision">Revisions Only</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}
                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <select
                        value={filters.dateRange}
                        onChange={(e) => setFilters(prev => ({...prev, dateRange: e.target.value}))}
                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                    </select>
                </div>
            </div>

            {(filters.project !== "all" || filters.type !== "all" || 
              filters.status !== "all" || filters.dateRange !== "all" || searchTerm) && (
                <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Active filters: 
                            {filters.project !== "all" && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Project: {filters.project}</span>}
                            {filters.type !== "all" && <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Type: {filters.type}</span>}
                            {filters.status !== "all" && <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Status: {filters.status}</span>}
                            {filters.dateRange !== "all" && <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">Date: {filters.dateRange}</span>}
                        </div>
                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition"
                        >
                            🗑️ Clear All Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    const RecordsTable = () => {
        if (filteredRecords.length === 0) {
            return (
                <div className="bg-white rounded-2xl shadow-lg border p-12 text-center">
                    <div className="text-gray-400 text-6xl mb-4">📭</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        {records.length === 0 ? "No Records Found" : "No Matching Records"}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {records.length === 0 
                            ? "You haven't created any IRs or Revisions yet."
                            : "No records match your current filters."}
                    </p>
                    {records.length === 0 ? (
                        <button
                            onClick={() => navigate("/engineer")}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                        >
                            Create Your First Request
                        </button>
                    ) : (
                        <button
                            onClick={resetFilters}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            );
        }

        return (
            <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">My Records</h2>
                            <p className="text-blue-100">
                                Showing {filteredRecords.length} of {records.length} records
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRefresh}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition flex items-center gap-2"
                            >
                                <span>🔄</span> Refresh
                            </button>
                            <div className="text-sm bg-white/20 px-3 py-1 rounded-full">
                                {user.username} • {user.department}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 text-gray-700 border-b">
                                <th className="p-4 text-left font-semibold">ID / Number</th>
                                <th className="p-4 text-left font-semibold">Description</th>
                                <th className="p-4 text-left font-semibold">Type</th>
                                <th className="p-4 text-left font-semibold">Project</th>
                                <th className="p-4 text-left font-semibold">Date & Time</th>
                                <th className="p-4 text-left font-semibold">Status</th>
                                <th className="p-4 text-left font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRecords.map((item, index) => (
                                <tr 
                                    key={item.irNo || item.revNo || index}
                                    className="border-b hover:bg-gray-50 transition-colors"
                                >
                                    <td className="p-4">
                                        <div className="font-mono font-semibold text-gray-800">
                                            {item.displayNumber}
                                        </div>
                                        {item.isRevision && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Revision of: {item.parentRequestType || "IR"}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="text-gray-700 font-medium">
                                            {item.desc || item.revNote || "No description"}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {item.location && `📍 ${item.location}`}
                                            {item.floor && item.location && " • "}
                                            {item.floor && `🏢 ${item.floor}`}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getTypeColor(item)}`}>
                                            {getItemType(item)}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-gray-800">{item.project}</div>
                                        <div className="text-xs text-gray-500">👤 {item.user}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-gray-600">
                                            {formatDate(item.sentAt || item.createdAt)}
                                        </div>
                                        {item.archivedDate && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                📁 Archived: {formatShortDate(item.archivedDate)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-2">
                                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusColor(item)}`}>
                                                {item.isArchived ? (
                                                    <>
                                                        <span>📁</span> Archived
                                                    </>
                                                ) : item.isDone ? (
                                                    <>
                                                        <span>✅</span> Completed
                                                    </>
                                                ) : (
                                                    "⏳ Pending"
                                                )}
                                            </span>
                                            
                                            {item.downloadedBy && (
                                                <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
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
                                                    👁️ View
                                                </button>
                                                <button
                                                    onClick={() => handleCopy(item)}
                                                    className="flex-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition"
                                                >
                                                    📋 Copy
                                                </button>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                {item.isArchived ? (
                                                    <button
                                                        onClick={() => handleRestore(item)}
                                                        className="flex-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition"
                                                    >
                                                        ↩️ Restore
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleArchive(item)}
                                                        className="flex-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-medium transition"
                                                    >
                                                        📁 Archive
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-gray-50 px-6 py-4 border-t">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-sm text-gray-600">
                            Showing <span className="font-medium">{filteredRecords.length}</span> of{" "}
                            <span className="font-medium">{records.length}</span> records
                        </div>
                        <div className="text-sm text-gray-500">
                            Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
            <ToastNotification />
            
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                            📋 Engineer Records Dashboard
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Welcome back, <span className="font-semibold text-blue-600">{user.username}</span>
                            <span className="mx-2">•</span>
                            Department: <span className="font-semibold text-blue-600">{user.department}</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleRefresh}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                        >
                            🔄 Refresh Data
                        </button>
                        <button
                            onClick={() => navigate("/engineer")}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition flex items-center gap-2"
                        >
                            ← Back to Create
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="text-red-500 text-xl">⚠️</div>
                            <div>
                                <p className="font-medium text-red-700">{error}</p>
                                <button
                                    onClick={handleRefresh}
                                    className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                                >
                                    Click here to retry
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <StatsCards />
                <SearchAndFilters />
                <RecordsTable />

                {/* Information Section */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <div className="text-blue-500 text-2xl">💡</div>
                        <div>
                            <h4 className="font-bold text-blue-800 mb-2">About This Page</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white/50 p-3 rounded-lg">
                                    <p className="text-blue-700 text-sm font-medium">📊 Your Records</p>
                                    <p className="text-blue-600 text-xs mt-1">
                                        • View all your IRs, CPRs, and Revisions<br/>
                                        • Filter by project, type, status, and date<br/>
                                        • See download history<br/>
                                        • Archive completed items
                                    </p>
                                </div>
                                <div className="bg-white/50 p-3 rounded-lg">
                                    <p className="text-emerald-700 text-sm font-medium">📁 Archive Management</p>
                                    <p className="text-emerald-600 text-xs mt-1">
                                        • Archive completed items to keep active list clean<br/>
                                        • Restore archived items when needed<br/>
                                        • Archived items are moved to separate storage<br/>
                                        • Archive doesn't delete items permanently
                                    </p>
                                </div>
                                <div className="bg-white/50 p-3 rounded-lg">
                                    <p className="text-purple-700 text-sm font-medium">⚡ Quick Actions</p>
                                    <p className="text-purple-600 text-xs mt-1">
                                        • View detailed information<br/>
                                        • Copy item details to clipboard<br/>
                                        • Refresh data to see latest updates<br/>
                                        • Clear filters to view all items
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


