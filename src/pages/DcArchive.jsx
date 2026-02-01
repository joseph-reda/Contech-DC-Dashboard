import { useEffect, useState } from "react";
import { API_URL } from "../config";
import { useNavigate } from "react-router-dom";
import SidebarComponent from "../components/SidebarComponent";

export default function DcArchive() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState({});
    const [deleting, setDeleting] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    
    // فلاتر الـ Sidebar
    const [sidebarFilters, setSidebarFilters] = useState({
        project: "all",
        department: "all",
        type: "all",
        status: "all"
    });

    // Advanced Filters
    const [advancedFilters, setAdvancedFilters] = useState({
        project: "all",
        type: "all",
        status: "all",
        dateRange: "all",
        department: "all",
        archivedBy: "all"
    });

    // Authentication check
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user || user.role !== "dc") {
            navigate("/login");
        }
    }, [navigate]);

    // Load Archived IRs for DC
    useEffect(() => {
        loadArchive();
    }, []);

    async function loadArchive() {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/archive/dc`);
            if (!res.ok) throw new Error("Failed to load archive");
            
            const data = await res.json();
            
            if (data.archive) {
                const formatted = data.archive.map(item => ({
                    ...item,
                    irNo: item.isRevision ? item.revNo || item.irNo : item.irNo,
                    desc: item.isRevision ? item.revNote || item.desc : item.desc,
                    archivedDate: item.archivedAt || "Unknown",
                    requestType: item.requestType || (item.isRevision ? "REVISION" : "IR"),
                    revisionType: item.revisionType || "IR_REVISION",
                    parentRequestType: item.parentRequestType || "IR",
                    downloadedBy: item.downloadedBy || "",
                    // ⭐⭐ حقول جديدة للمراجعات ⭐⭐
                    userRevNumber: item.userRevNumber || item.revText,
                    displayNumber: item.displayNumber || 
                        (item.userRevNumber ? 
                            `REV-${item.revisionType === "CPR_REVISION" ? "CPR-" : "IR-"}${item.userRevNumber}` : 
                            item.revNo),
                    isCPRRevision: item.revisionType === "CPR_REVISION" || item.isCPRRevision,
                    isIRRevision: item.revisionType === "IR_REVISION" || item.isIRRevision
                }));
                setItems(formatted);
            }
        } catch (err) {
            console.error("Error loading archive:", err);
            showToast("❌ Failed to load archive");
        } finally {
            setLoading(false);
        }
    }

    // Helper Functions
    function getDepartmentAbbr(department) {
        if (!department) return "";
        const dept = department.toUpperCase();
        if (dept.includes("ARCH")) return "ARCH";
        if (dept.includes("CIVIL") || dept.includes("STRUCT")) return "ST";
        if (dept.includes("ELECT")) return "ELECT";
        if (dept.includes("MEP") || dept.includes("MECH")) return "MEP";
        if (dept.includes("SURV")) return "SURV";
        if (dept.includes("REV")) return "REV";
        return dept.substring(0, 4);
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        try {
            const date = new Date(dateStr);
            if (isNaN(date)) return dateStr;
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

    const [toast, setToast] = useState("");
    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(""), 3000);
    };

    const getStatusClass = (item) => {
        if (item.isDone) return "bg-green-100 text-green-800 border border-green-300";
        if (item.isRevision) return "bg-amber-100 text-amber-800 border border-amber-300";
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
    };

    const getTypeClass = (item) => {
        if (item.isRevision) {
            if (item.revisionType === "CPR_REVISION" || item.isCPRRevision) {
                return "bg-green-100 text-green-800 border border-green-300";
            }
            return "bg-purple-100 text-purple-800 border border-purple-300";
        }
        if (item.requestType === "CPR") return "bg-green-100 text-green-800 border border-green-300";
        return "bg-blue-100 text-blue-800 border border-blue-300";
    };

    const getDeptClass = (dept) => {
        switch (dept) {
            case "ARCH": return "bg-blue-100 text-blue-800";
            case "ST": return "bg-green-100 text-green-800";
            case "ELECT": return "bg-purple-100 text-purple-800";
            case "MEP": return "bg-amber-100 text-amber-800";
            case "SURV": return "bg-indigo-100 text-indigo-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getArchivedByClass = (archivedBy) => {
        if (archivedBy === "dc") return "bg-blue-100 text-blue-800";
        if (archivedBy === "engineer") return "bg-green-100 text-green-800";
        return "bg-gray-100 text-gray-800";
    };

    const getRevDisplayNumber = (rev) => {
        if (!rev) return "REV";
        if (rev.displayNumber) return rev.displayNumber;
        if (rev.userRevNumber) {
            const prefix = rev.revisionType === "CPR_REVISION" ? "REV-CPR-" : "REV-IR-";
            return `${prefix}${rev.userRevNumber}`;
        }
        if (rev.revText) {
            const prefix = rev.revisionType === "CPR_REVISION" ? "REV-CPR-" : "REV-IR-";
            return `${prefix}${rev.revText}`;
        }
        return rev.revNo || "REV";
    };

    const getRevTypeText = (rev) => {
        if (!rev) return "REVISION";
        if (rev.revisionType === "CPR_REVISION" || rev.isCPRRevision) {
            return "CPR REVISION";
        } else {
            return "IR REVISION";
        }
    };

    // Filter and search logic
    const filteredItems = items.filter(item => {
        // Filter by project from Sidebar
        if (sidebarFilters.project !== "all" && item.project !== sidebarFilters.project) return false;
        
        // Filter by department from Sidebar
        if (sidebarFilters.department !== "all") {
            const dept = getDepartmentAbbr(item.department);
            if (dept !== sidebarFilters.department) return false;
        }
        
        // Filter by type from Sidebar
        if (sidebarFilters.type !== "all") {
            if (sidebarFilters.type === "ir" && item.isRevision) return false;
            if (sidebarFilters.type === "revision" && !item.isRevision) return false;
            if (sidebarFilters.type === "cpr") {
                if (item.isRevision) {
                    if (item.revisionType !== "CPR_REVISION" && !item.isCPRRevision) return false;
                } else {
                    if (item.requestType !== "CPR") return false;
                }
            }
        }
        
        // Filter by status from Sidebar
        if (sidebarFilters.status !== "all") {
            if (sidebarFilters.status === "completed" && !item.isDone) return false;
            if (sidebarFilters.status === "pending" && item.isDone) return false;
        }
        
        // Advanced Filters
        if (advancedFilters.project !== "all" && item.project !== advancedFilters.project) return false;
        
        if (advancedFilters.type !== "all") {
            if (advancedFilters.type === "ir" && (item.isRevision || item.requestType === "CPR")) return false;
            if (advancedFilters.type === "cpr" && (!item.isCPR || item.isRevision)) return false;
            if (advancedFilters.type === "revision" && !item.isRevision) return false;
        }
        
        if (advancedFilters.status !== "all") {
            if (advancedFilters.status === "pending" && item.isDone) return false;
            if (advancedFilters.status === "completed" && !item.isDone) return false;
        }
        
        if (advancedFilters.department !== "all") {
            const dept = getDepartmentAbbr(item.department);
            if (dept !== advancedFilters.department) return false;
        }
        
        if (advancedFilters.archivedBy !== "all" && item.archivedBy !== advancedFilters.archivedBy) return false;
        
        // Filter by date range
        if (advancedFilters.dateRange !== "all") {
            const itemDate = new Date(item.archivedDate || item.sentAt);
            const today = new Date();
            
            switch (advancedFilters.dateRange) {
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
        
        // Search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const itemNumber = formatIrNumber(item.irNo).toLowerCase();
            const displayNumber = item.isRevision ? getRevDisplayNumber(item).toLowerCase() : "";
            
            return (
                itemNumber.includes(term) ||
                displayNumber.includes(term) ||
                (item.desc && item.desc.toLowerCase().includes(term)) ||
                (item.project && item.project.toLowerCase().includes(term)) ||
                (item.user && item.user.toLowerCase().includes(term)) ||
                (item.archivedBy && item.archivedBy.toLowerCase().includes(term)) ||
                (item.downloadedBy && item.downloadedBy.toLowerCase().includes(term))
            );
        }
        
        return true;
    });

    // Group by project
    const grouped = filteredItems.reduce((acc, item) => {
        const project = item.project || "Unknown";
        if (!acc[project]) acc[project] = [];
        acc[project].push(item);
        return acc;
    }, {});

    // Get unique values for filters
    const projects = [...new Set(items.map(item => item.project).filter(Boolean))].sort();
    const departments = [...new Set(items.map(item => getDepartmentAbbr(item.department)).filter(Boolean))].sort();
    const archivedByOptions = [...new Set(items.map(item => item.archivedBy).filter(Boolean))].sort();

    // Action Handlers
    async function handleRestore(item) {
        if (!window.confirm(`Restore ${formatIrNumber(item.irNo)} from archive?`)) return;

        setRestoring(prev => ({ ...prev, [item.irNo]: true }));

        try {
            const res = await fetch(`${API_URL}/unarchive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    irNo: item.irNo,
                    role: "dc",
                    isRevision: item.isRevision || false
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Restore failed");

            setItems(prev => prev.filter(x => x.irNo !== item.irNo));
            showToast("✅ Item restored successfully!");
        } catch (err) {
            console.error("Restore error:", err);
            showToast("❌ Restore failed: " + err.message);
        } finally {
            setRestoring(prev => ({ ...prev, [item.irNo]: false }));
        }
    }

    async function handleDelete(item) {
        if (!window.confirm(`Permanently delete ${formatIrNumber(item.irNo)} from archive?\n\n⚠️ This action cannot be undone!`)) return;

        setDeleting(prev => ({ ...prev, [item.irNo]: true }));

        try {
            const endpoint = item.isRevision ? `${API_URL}/revs` : `${API_URL}/irs`;
            const url = `${endpoint}?irNo=${encodeURIComponent(item.irNo)}`;
            
            const res = await fetch(url, { 
                method: "DELETE",
                headers: { "Content-Type": "application/json" }
            });
            
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Delete failed");

            setItems(prev => prev.filter(x => x.irNo !== item.irNo));
            showToast("🗑️ Item deleted permanently!");
        } catch (err) {
            console.error("Delete error:", err);
            showToast("❌ Delete failed: " + err.message);
        } finally {
            setDeleting(prev => ({ ...prev, [item.irNo]: false }));
            setShowDeleteConfirm(null);
        }
    }

    const resetAllFilters = () => {
        setSidebarFilters({
            project: "all",
            department: "all",
            type: "all",
            status: "all"
        });
        setAdvancedFilters({
            project: "all",
            type: "all",
            status: "all",
            dateRange: "all",
            department: "all",
            archivedBy: "all"
        });
        setSearchTerm("");
    };

    // Calculate stats
    const stats = {
        total: items.length,
        irs: items.filter(item => !item.isRevision && item.requestType !== "CPR").length,
        cpr: items.filter(item => !item.isRevision && item.requestType === "CPR").length,
        revisions: items.filter(item => item.isRevision).length,
        cprRevisions: items.filter(item => item.isRevision && (item.revisionType === "CPR_REVISION" || item.isCPRRevision)).length,
        irRevisions: items.filter(item => item.isRevision && (item.revisionType === "IR_REVISION" || item.isIRRevision)).length,
        completed: items.filter(item => item.isDone).length,
        pending: items.filter(item => !item.isDone).length,
        archivedByDC: items.filter(item => item.archivedBy === "dc").length,
        archivedByEngineer: items.filter(item => item.archivedBy === "engineer").length
    };

    // 🎨 Render Components
    const LoadingScreen = () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading Archive...</p>
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

    const DeleteConfirmationModal = () => (
        showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in">
                    <div className="text-red-500 text-4xl mb-4 text-center">⚠️</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Permanent Delete</h3>
                    <p className="text-gray-600 mb-6 text-center">
                        Are you sure you want to permanently delete<br/>
                        <span className="font-bold">{formatIrNumber(showDeleteConfirm.irNo)}</span>?
                    </p>
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-6 text-center">
                        ⚠️ This action cannot be undone!
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleDelete(showDeleteConfirm)}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                        >
                            Delete Permanently
                        </button>
                    </div>
                </div>
            </div>
        )
    );

    const ArchiveStats = () => (
        <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-700 mb-3">📊 Archive Stats</h4>
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Archived</span>
                    <span className="font-bold">{stats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">IR Requests</span>
                    <span className="font-bold text-blue-600">{stats.irs}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">CPR Requests</span>
                    <span className="font-bold text-green-600">{stats.cpr}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Revisions</span>
                    <span className="font-bold text-purple-600">{stats.revisions}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">IR Revisions</span>
                    <span className="font-bold text-amber-600">{stats.irRevisions}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">CPR Revisions</span>
                    <span className="font-bold text-green-600">{stats.cprRevisions}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Archived by DC</span>
                    <span className="font-bold text-blue-600">{stats.archivedByDC}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Archived by Engineer</span>
                    <span className="font-bold text-green-600">{stats.archivedByEngineer}</span>
                </div>
            </div>
        </div>
    );

    const ActiveFilters = () => (
        <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-700 mb-3">🎯 Active Filters</h4>
            <div className="space-y-2">
                {(sidebarFilters.project !== "all" || advancedFilters.project !== "all") && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Project:</span>
                        <span className="text-sm font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {sidebarFilters.project !== "all" ? sidebarFilters.project : advancedFilters.project}
                        </span>
                    </div>
                )}
                {(sidebarFilters.department !== "all" || advancedFilters.department !== "all") && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Department:</span>
                        <span className="text-sm font-medium bg-green-100 text-green-700 px-2 py-1 rounded">
                            {sidebarFilters.department !== "all" ? sidebarFilters.department : advancedFilters.department}
                        </span>
                    </div>
                )}
                {(sidebarFilters.type !== "all" || advancedFilters.type !== "all") && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Type:</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${
                            (sidebarFilters.type === "cpr" || advancedFilters.type === "cpr") ? "bg-green-100 text-green-700" :
                            (sidebarFilters.type === "revision" || advancedFilters.type === "revision") ? "bg-amber-100 text-amber-700" :
                            "bg-blue-100 text-blue-700"
                        }`}>
                            {sidebarFilters.type !== "all" ? 
                                (sidebarFilters.type === "cpr" ? "CPR Only" :
                                 sidebarFilters.type === "revision" ? "Revisions Only" :
                                 "IR Only") :
                                (advancedFilters.type === "cpr" ? "CPR Only" :
                                 advancedFilters.type === "revision" ? "Revisions Only" :
                                 "IR Only")
                            }
                        </span>
                    </div>
                )}
                {(sidebarFilters.status !== "all" || advancedFilters.status !== "all") && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${
                            (sidebarFilters.status === "pending" || advancedFilters.status === "pending") ? "bg-yellow-100 text-yellow-700" :
                            "bg-green-100 text-green-700"
                        }`}>
                            {sidebarFilters.status !== "all" ? 
                                (sidebarFilters.status === "pending" ? "Pending" : "Completed") :
                                (advancedFilters.status === "pending" ? "Pending" : "Completed")
                            }
                        </span>
                    </div>
                )}
                {(sidebarFilters.project !== "all" || 
                  sidebarFilters.department !== "all" || 
                  sidebarFilters.type !== "all" || 
                  sidebarFilters.status !== "all" ||
                  advancedFilters.project !== "all" ||
                  advancedFilters.department !== "all" ||
                  advancedFilters.type !== "all" ||
                  advancedFilters.status !== "all" ||
                  advancedFilters.dateRange !== "all" ||
                  advancedFilters.archivedBy !== "all") && (
                    <button
                        onClick={resetAllFilters}
                        className="w-full mt-2 p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition"
                    >
                        🗑️ Clear All Filters
                    </button>
                )}
            </div>
        </div>
    );

    const MainStatsCards = () => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">{filteredItems.length}</div>
                <div className="text-sm text-gray-500">Showing</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                    {filteredItems.filter(item => !item.isDone).length}
                </div>
                <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">
                    {filteredItems.filter(item => item.isDone).length}
                </div>
                <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                    {filteredItems.filter(item => item.archivedBy === "dc").length}
                </div>
                <div className="text-sm text-gray-500">Archived by DC</div>
            </div>
        </div>
    );

    const SearchBar = () => (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        🔍 Search Archive
                    </label>
                    <input
                        type="text"
                        placeholder="Search by number, description, user, project, archived by, downloaded by..."
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setSearchTerm("")}
                    className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
                >
                    Clear Search
                </button>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
                <p>💡 Tips: Search by archived by (e.g., "dc"), downloaded by (e.g., "username"), project, or item type</p>
            </div>
        </div>
    );

    const AdvancedFiltersSection = () => (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <h3 className="text-lg font-bold text-gray-800">🎯 Advanced Filters</h3>
                <button
                    onClick={() => setAdvancedFilters({
                        project: "all",
                        type: "all",
                        status: "all",
                        dateRange: "all",
                        department: "all",
                        archivedBy: "all"
                    })}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm"
                >
                    Reset Advanced Filters
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <select
                        value={advancedFilters.project}
                        onChange={(e) => setAdvancedFilters(prev => ({...prev, project: e.target.value}))}
                        className="w-full p-2 border rounded-lg bg-white"
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
                        value={advancedFilters.type}
                        onChange={(e) => setAdvancedFilters(prev => ({...prev, type: e.target.value}))}
                        className="w-full p-2 border rounded-lg bg-white"
                    >
                        <option value="all">All Types</option>
                        <option value="ir">IR Only</option>
                        <option value="cpr">CPR Only</option>
                        <option value="revision">Revisions Only</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <select
                        value={advancedFilters.dateRange}
                        onChange={(e) => setAdvancedFilters(prev => ({...prev, dateRange: e.target.value}))}
                        className="w-full p-2 border rounded-lg bg-white"
                    >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                        value={advancedFilters.status}
                        onChange={(e) => setAdvancedFilters(prev => ({...prev, status: e.target.value}))}
                        className="w-full p-2 border rounded-lg bg-white"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                        value={advancedFilters.department}
                        onChange={(e) => setAdvancedFilters(prev => ({...prev, department: e.target.value}))}
                        className="w-full p-2 border rounded-lg bg-white"
                    >
                        <option value="all">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Archived By</label>
                    <select
                        value={advancedFilters.archivedBy}
                        onChange={(e) => setAdvancedFilters(prev => ({...prev, archivedBy: e.target.value}))}
                        className="w-full p-2 border rounded-lg bg-white"
                    >
                        <option value="all">All</option>
                        {archivedByOptions.map(by => (
                            <option key={by} value={by}>{by === "dc" ? "📁 DC" : "👷 Engineer"}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );

    const EmptyArchiveState = () => (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <div className="text-gray-400 text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Archive is Empty</h3>
            <p className="text-gray-500">No items have been archived yet.</p>
            <button
                onClick={() => navigate("/dc")}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
                Go to DC Dashboard
            </button>
        </div>
    );

    const NoMatchingItemsState = () => (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Matching Items</h3>
            <p className="text-gray-500">No archived items match your filters.</p>
            <button
                onClick={resetAllFilters}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
                Clear All Filters
            </button>
        </div>
    );

    const ArchiveTableRow = ({ item, isDeleting, isRestoring }) => {
        const deptAbbr = getDepartmentAbbr(item.department);
        const revTypeText = getRevTypeText(item);
        const displayNumber = item.isRevision ? getRevDisplayNumber(item) : formatIrNumber(item.irNo);

        return (
            <tr className="border-b hover:bg-gray-50 transition-colors">
                {/* ID Column */}
                <td className="p-4">
                    <div className="font-mono text-sm font-semibold text-gray-800">
                        {displayNumber}
                    </div>
                    <div className="flex gap-1 mt-1">
                        {item.isRevision && (
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                item.revisionType === "CPR_REVISION" || item.isCPRRevision
                                ? "bg-green-100 text-green-800" 
                                : "bg-amber-100 text-amber-800"
                            }`}>
                                {revTypeText}
                            </span>
                        )}
                        {!item.isRevision && item.requestType === "CPR" && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                                CPR
                            </span>
                        )}
                    </div>
                </td>
                
                {/* Description Column */}
                <td className="p-4">
                    <div className="text-gray-700 font-medium">{item.desc}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        {item.location && `Location: ${item.location}`}
                        {item.floor && item.location && " • "}
                        {item.floor && `Floor: ${item.floor}`}
                    </div>
                </td>
                
                {/* Type Column */}
                <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeClass(item)}`}>
                        {item.isRevision 
                            ? revTypeText
                            : (item.requestType === "CPR" ? "CPR" : "IR")
                        }
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                        User: {item.user || "—"}
                    </div>
                </td>
                
                {/* Department Column */}
                <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDeptClass(deptAbbr)}`}>
                        {deptAbbr}
                    </span>
                </td>
                
                {/* Archived Date Column */}
                <td className="p-4">
                    <div className="text-gray-600 whitespace-pre-line">{formatDate(item.archivedDate)}</div>
                    <div className="text-xs text-gray-400">
                        Original: {formatShortDate(item.sentAt)}
                    </div>
                </td>
                
                {/* Archived By Column */}
                <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getArchivedByClass(item.archivedBy)}`}>
                        {item.archivedBy === "dc" ? "📁 DC" : "👷 Engineer"}
                    </span>
                </td>
                
                {/* Status Column */}
                <td className="p-4">
                    <div className="space-y-2">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusClass(item)}`}>
                            {item.isDone ? (
                                <>
                                    <span>✓</span> Completed
                                </>
                            ) : item.isRevision ? (
                                "Revision"
                            ) : (
                                "Pending"
                            )}
                        </span>
                        
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
                
                {/* Actions Column */}
                <td className="p-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleRestore(item)}
                            disabled={isRestoring || isDeleting}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all min-w-[100px] ${
                                isRestoring 
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            }`}
                        >
                            {isRestoring ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                    Restoring...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <span>↩️</span> Restore
                                </span>
                            )}
                        </button>
                        
                        <button
                            onClick={() => setShowDeleteConfirm(item)}
                            disabled={isDeleting || isRestoring}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all min-w-[100px] ${
                                isDeleting 
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                                    : "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                            }`}
                        >
                            {isDeleting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                    Deleting...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <span>🗑️</span> Delete
                                </span>
                            )}
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    const ProjectSection = ({ project, items }) => (
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                            📌
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{project}</h2>
                            <p className="text-gray-300 text-sm">
                                {items.length} archived item{items.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-gray-600 text-white rounded-full text-sm">
                            IRs: {items.filter(x => !x.isRevision && x.requestType !== "CPR").length}
                        </span>
                        <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm">
                            CPR: {items.filter(x => !x.isRevision && x.requestType === "CPR").length}
                        </span>
                        <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm">
                            REVs: {items.filter(x => x.isRevision).length}
                        </span>
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
                            <th className="p-4 text-left font-semibold">Department</th>
                            <th className="p-4 text-left font-semibold">Archived Date</th>
                            <th className="p-4 text-left font-semibold">Archived By</th>
                            <th className="p-4 text-left font-semibold">Status</th>
                            <th className="p-4 text-left font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => {
                            const isDeleting = deleting[item.irNo];
                            const isRestoring = restoring[item.irNo];
                            
                            return (
                                <ArchiveTableRow 
                                    key={item.irNo} 
                                    item={item} 
                                    isDeleting={isDeleting} 
                                    isRestoring={isRestoring} 
                                />
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="bg-gray-50 px-6 py-3 border-t">
                <div className="flex justify-between items-center text-sm text-gray-600">
                    <div>
                        Project: <span className="font-medium">{project}</span>
                    </div>
                    <div className="flex gap-4">
                        <span>Items: {items.length}</span>
                        <span>Completed: {items.filter(x => x.isDone).length}</span>
                        <span>Pending: {items.filter(x => !x.isDone).length}</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const ArchiveInfo = () => (
        items.length > 0 && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <div className="text-blue-500 text-2xl">ℹ️</div>
                    <div>
                        <h4 className="font-bold text-blue-800 mb-1">Archive Information</h4>
                        <p className="text-blue-700 text-sm">
                            • Archived items are moved here from the main dashboard<br/>
                            • You can restore items back to the main dashboard<br/>
                            • Permanent delete removes items completely from the system<br/>
                            • Items are archived by DC or Engineers<br/>
                            • "Downloaded by" shows who downloaded the Word file
                        </p>
                    </div>
                </div>
            </div>
        )
    );

    const Footer = () => (
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm border-t">
            <div className="flex flex-col md:flex-row justify-between items-center">
                <p>DC Archive • Total Archived: {items.length} • Showing: {filteredItems.length}</p>
                <p>Last Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
        </div>
    );

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <ToastNotification />
            <DeleteConfirmationModal />
            
            <div className="mx-auto px-20 py-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar */}
                    <div className="lg:w-1/4">
                        <SidebarComponent 
                            onFilterChange={setSidebarFilters}
                            initialFilters={sidebarFilters}
                            showQuickActions={true}
                            showProjectStats={true}
                            showDeptStats={true}
                        />
                        
                        <ArchiveStats />
                        <ActiveFilters />
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:w-3/4">
                        <MainStatsCards />
                        <SearchBar />
                        <AdvancedFiltersSection />

                        {/* Main Content */}
                        {items.length === 0 ? (
                            <EmptyArchiveState />
                        ) : filteredItems.length === 0 ? (
                            <NoMatchingItemsState />
                        ) : (
                            <div className="space-y-8">
                                {Object.keys(grouped).map((project) => (
                                    <ProjectSection 
                                        key={project} 
                                        project={project} 
                                        items={grouped[project]} 
                                    />
                                ))}
                            </div>
                        )}

                        <ArchiveInfo />
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}

/**
 * تنسيق رقم IR/CPR بشكل مختصر
 */
function formatIrNumber(full) {
    if (!full) return "";
    try {
        // إذا كان رقم CPR أو IR عادي
        if (full.includes("BADYA-CON")) {
            const parts = full.split("-");
            if (parts.length >= 6) {
                const project = parts[2] || "";
                const type = parts[3] || "";
                const dept = parts[4] || "";
                const number = parts[5] || "";
                
                if (type === "CPR") {
                    return `CPR-${project}-${dept}-${number}`;
                }
                return `${project}-${dept}-${number}`;
            }
        }
        
        // إذا كان رقم Revision
        if (full.includes("REV-")) {
            const revParts = full.split("-");
            if (revParts.length >= 3) {
                return `REV-${revParts[1]}-${revParts[2]}`;
            }
        }
        
        return full;
    } catch {
        return full;
    }
}