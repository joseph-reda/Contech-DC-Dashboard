// src/components/admin/DCModeTab.jsx
import { useEffect, useState } from "react";
import { API_URL } from "../../config";

export default function DCModeTab({ user }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "" });
    const [activeView, setActiveView] = useState("pending"); // pending, archive, all

    // Data States
    const [pendingIRs, setPendingIRs] = useState([]);
    const [pendingRevisions, setPendingRevisions] = useState([]);
    const [pendingSD, setPendingSD] = useState([]);
    const [archiveIRs, setArchiveIRs] = useState([]);
    const [archiveRevisions, setArchiveRevisions] = useState([]);
    const [archiveSD, setArchiveSD] = useState([]);
    const [allIRs, setAllIRs] = useState([]);
    const [allRevisions, setAllRevisions] = useState([]);
    const [allSD, setAllSD] = useState([]);

    // Filter States
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [projectFilter, setProjectFilter] = useState("all");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [sortBy, setSortBy] = useState("date");
    const [sortOrder, setSortOrder] = useState("desc");

    // Selected Item
    const [selectedItem, setSelectedItem] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Update States
    const [updatingIRNumber, setUpdatingIRNumber] = useState({
        irNo: "",
        newSerial: "",
        showModal: false
    });

    // Statistics
    const [stats, setStats] = useState({
        totalPending: 0,
        totalArchive: 0,
        totalAll: 0,
        byProject: {},
        byDepartment: {},
        byStatus: {},
        sdPending: 0,
        sdArchive: 0,
        sdTotal: 0
    });

    // Projects List
    const [projects, setProjects] = useState([]);

    // Departments
    const departments = [
        { value: "ARCH", label: "Architectural", color: "bg-blue-100 text-blue-800", icon: "🏛️" },
        { value: "ST", label: "Structural", color: "bg-green-100 text-green-800", icon: "🏗️" },
        { value: "ELECT", label: "Electrical", color: "bg-purple-100 text-purple-800", icon: "⚡" },
        { value: "MECH", label: "Mechanical", color: "bg-amber-100 text-amber-800", icon: "🔧" },
        { value: "SURV", label: "Survey", color: "bg-indigo-100 text-indigo-800", icon: "📐" }
    ];

    // Show toast notification
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
    };

    // Load all data
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadPendingData(),
                loadArchiveData(),
                loadAllIRsData(),
                loadProjects()
            ]);
            calculateStatistics();
        } catch (error) {
            console.error("Failed to load DC data:", error);
            showToast("Failed to load DC data", "error");
        } finally {
            setLoading(false);
        }
    };

    const loadPendingData = async () => {
        try {
            const [irsRes, revsRes, sdRes] = await Promise.all([
                fetch(`${API_URL}/irs`),
                fetch(`${API_URL}/revs`),
                fetch(`${API_URL}/shopdrawings`)
            ]);

            if (irsRes.ok) {
                const data = await irsRes.json();
                setPendingIRs((data.irs || []).filter(ir => !ir.isDone && !ir.isArchived));
            }
            if (revsRes.ok) {
                const data = await revsRes.json();
                setPendingRevisions((data.revs || []).filter(rev => !rev.isDone && !rev.isArchived));
            }
            if (sdRes.ok) {
                const data = await sdRes.json();
                setPendingSD((data.shopdrawings || []).filter(sd => !sd.isDone && !sd.isArchived));
            }
        } catch (error) {
            console.error("Failed to load pending data:", error);
        }
    };

    const loadArchiveData = async () => {
        try {
            // Assuming you have an endpoint like /archive/dc or you can filter from /all
            // For now, we'll fetch all and filter locally
            const [irsAllRes, revsAllRes, sdAllRes] = await Promise.all([
                fetch(`${API_URL}/irs/all`),
                fetch(`${API_URL}/revs/all`),
                fetch(`${API_URL}/shopdrawings/all`)
            ]);

            if (irsAllRes.ok) {
                const data = await irsAllRes.json();
                setArchiveIRs((data.irs || []).filter(ir => ir.isArchived));
            }
            if (revsAllRes.ok) {
                const data = await revsAllRes.json();
                setArchiveRevisions((data.revs || []).filter(rev => rev.isArchived));
            }
            if (sdAllRes.ok) {
                const data = await sdAllRes.json();
                setArchiveSD((data.shopdrawings || []).filter(sd => sd.isArchived));
            }
        } catch (error) {
            console.error("Failed to load archive data:", error);
        }
    };

    const loadAllIRsData = async () => {
        try {
            const [irsRes, revsRes, sdRes] = await Promise.all([
                fetch(`${API_URL}/irs/all`),
                fetch(`${API_URL}/revs/all`),
                fetch(`${API_URL}/shopdrawings/all`)
            ]);

            if (irsRes.ok) {
                const data = await irsRes.json();
                setAllIRs(data.irs || []);
            }
            if (revsRes.ok) {
                const data = await revsRes.json();
                setAllRevisions(data.revs || []);
            }
            if (sdRes.ok) {
                const data = await sdRes.json();
                setAllSD(data.shopdrawings || []);
            }
        } catch (error) {
            console.error("Failed to load all IRs data:", error);
        }
    };

    const loadProjects = async () => {
        try {
            const res = await fetch(`${API_URL}/projects`);
            if (res.ok) {
                const data = await res.json();
                setProjects(Object.keys(data.projects || {}));
            }
        } catch (error) {
            console.error("Failed to load projects:", error);
        }
    };

    const calculateStatistics = () => {
        const allItems = [...pendingIRs, ...pendingRevisions, ...pendingSD, ...archiveIRs, ...archiveRevisions, ...archiveSD];
        const stats = {
            totalPending: pendingIRs.length + pendingRevisions.length + pendingSD.length,
            totalArchive: archiveIRs.length + archiveRevisions.length + archiveSD.length,
            totalAll: allItems.length,
            byProject: {},
            byDepartment: {},
            byStatus: {},
            sdPending: pendingSD.length,
            sdArchive: archiveSD.length,
            sdTotal: allSD.length
        };

        allItems.forEach(item => {
            const project = item.project || "Unknown";
            stats.byProject[project] = (stats.byProject[project] || 0) + 1;
            const dept = item.department || item.deptAbbr || "Unknown";
            stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
            const status = item.isArchived ? "archived" : item.isDone ? "completed" : "pending";
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        });

        setStats(stats);
    };

    // Get current data based on active view
    const getCurrentData = () => {
        switch (activeView) {
            case "pending":
                return [...pendingIRs, ...pendingRevisions, ...pendingSD];
            case "archive":
                return [...archiveIRs, ...archiveRevisions, ...archiveSD];
            case "all":
                return [...allIRs, ...allRevisions, ...allSD];
            default:
                return [];
        }
    };

    // Filter and sort data
    const getFilteredData = () => {
        let data = getCurrentData();

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(item => {
                return (
                    (item.irNo && item.irNo.toLowerCase().includes(term)) ||
                    (item.revNo && item.revNo.toLowerCase().includes(term)) ||
                    (item.sdNo && item.sdNo.toLowerCase().includes(term)) ||
                    (item.project && item.project.toLowerCase().includes(term)) ||
                    (item.user && item.user.toLowerCase().includes(term)) ||
                    (item.subject && item.subject.toLowerCase().includes(term)) ||
                    (item.desc && item.desc.toLowerCase().includes(term))
                );
            });
        }

        if (projectFilter !== "all") {
            data = data.filter(item => item.project === projectFilter);
        }

        if (departmentFilter !== "all") {
            data = data.filter(item => 
                item.department === departmentFilter || item.deptAbbr === departmentFilter
            );
        }

        if (statusFilter !== "all") {
            data = data.filter(item => {
                if (statusFilter === "pending") return !item.isDone && !item.isArchived;
                if (statusFilter === "completed") return item.isDone && !item.isArchived;
                if (statusFilter === "archived") return item.isArchived;
                return true;
            });
        }

        if (typeFilter !== "all") {
            if (typeFilter === "IR") {
                data = data.filter(item => !item.isRevision && !item.sdNo);
            } else if (typeFilter === "CPR") {
                data = data.filter(item => item.requestType === "CPR");
            } else if (typeFilter === "REV") {
                data = data.filter(item => item.isRevision);
            } else if (typeFilter === "SD") {
                data = data.filter(item => item.sdNo);
            }
        }

        data.sort((a, b) => {
            let aValue, bValue;
            switch (sortBy) {
                case "date":
                    aValue = new Date(a.sentAt || a.createdAt || a.updatedAt).getTime();
                    bValue = new Date(b.sentAt || b.createdAt || b.updatedAt).getTime();
                    break;
                case "irNo":
                    aValue = a.irNo || a.revNo || a.sdNo || "";
                    bValue = b.irNo || b.revNo || b.sdNo || "";
                    break;
                case "project":
                    aValue = a.project || "";
                    bValue = b.project || "";
                    break;
                case "user":
                    aValue = a.user || a.fullname || "";
                    bValue = b.user || b.fullname || "";
                    break;
                default:
                    aValue = new Date(a.sentAt || a.createdAt).getTime();
                    bValue = new Date(b.sentAt || b.createdAt).getTime();
            }
            if (sortOrder === "asc") {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return data;
    };

    // DC Actions
    const handleApprove = async (item) => {
        if (!window.confirm(`Approve ${item.isRevision ? 'revision' : item.sdNo ? 'shop drawing' : 'inspection request'} ${item.irNo || item.revNo || item.sdNo}?`)) {
            return;
        }
        setSaving(true);
        try {
            let endpoint = "";
            if (item.isRevision) endpoint = "revs";
            else if (item.sdNo) endpoint = "shopdrawings";
            else endpoint = "irs";
            const itemId = item.irNo || item.revNo || item.sdNo;

            const res = await fetch(`${API_URL}/${endpoint}/mark-done`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uniqueId: item.uniqueId || item.id,
                    downloadedBy: user?.username || "admin"
                })
            });

            if (res.ok) {
                showToast(`${item.isRevision ? 'Revision' : item.sdNo ? 'Shop drawing' : 'IR'} approved`, "success");
                loadAllData();
            } else {
                throw new Error("Failed to approve");
            }
        } catch (error) {
            console.error("Approve error:", error);
            showToast("Failed to approve", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleReject = async (item) => {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;
        // Not implemented in backend, but we can update locally
        showToast("Rejection not implemented in backend", "info");
    };

    const handleArchive = async (item) => {
        if (!window.confirm(`Archive ${item.isRevision ? 'revision' : item.sdNo ? 'shop drawing' : 'IR'} ${item.irNo || item.revNo || item.sdNo}?`)) {
            return;
        }
        setSaving(true);
        try {
            const collection = item.isRevision ? "revs" : item.sdNo ? "shopdrawings" : "irs";
            const res = await fetch(`${API_URL}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uniqueId: item.uniqueId || item.id,
                    role: "dc",
                    collection: collection
                })
            });

            if (res.ok) {
                showToast(`Item archived`, "success");
                loadAllData();
            } else {
                throw new Error("Failed to archive");
            }
        } catch (error) {
            console.error("Archive error:", error);
            showToast("Failed to archive", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleUnarchive = async (item) => {
        if (!window.confirm(`Restore ${item.isRevision ? 'revision' : item.sdNo ? 'shop drawing' : 'IR'} ${item.irNo || item.revNo || item.sdNo} from archive?`)) {
            return;
        }
        setSaving(true);
        try {
            const collection = item.isRevision ? "revs" : item.sdNo ? "shopdrawings" : "irs";
            const res = await fetch(`${API_URL}/unarchive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uniqueId: item.uniqueId || item.id,
                    collection: collection
                })
            });

            if (res.ok) {
                showToast(`Item restored`, "success");
                loadAllData();
            } else {
                throw new Error("Failed to unarchive");
            }
        } catch (error) {
            console.error("Unarchive error:", error);
            showToast("Failed to unarchive", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Permanently delete ${item.isRevision ? 'revision' : item.sdNo ? 'shop drawing' : 'IR'} ${item.irNo || item.revNo || item.sdNo}?\nThis action cannot be undone.`)) {
            return;
        }
        setSaving(true);
        try {
            let endpoint = "";
            if (item.isRevision) endpoint = "revs/delete";
            else if (item.sdNo) endpoint = "shopdrawings/delete";
            else endpoint = "irs/delete";

            const res = await fetch(`${API_URL}/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uniqueId: item.uniqueId || item.id
                })
            });

            if (res.ok) {
                showToast(`Item deleted`, "success");
                loadAllData();
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            console.error("Delete error:", error);
            showToast("Failed to delete", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateIRNumber = async () => {
        const { irNo, newSerial } = updatingIRNumber;
        if (!irNo || !newSerial || parseInt(newSerial) < 1) {
            showToast("Please enter a valid IR number and serial", "error");
            return;
        }
        setSaving(true);
        try {
            const item = getCurrentData().find(item => item.irNo === irNo);
            if (!item) {
                showToast("IR not found", "error");
                return;
            }
            const res = await fetch(`${API_URL}/irs/update-ir-number`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uniqueId: item.uniqueId || item.id,
                    irNo: irNo,
                    newSerial: parseInt(newSerial),
                    project: item.project,
                    department: item.department,
                    requestType: item.requestType || "IR"
                })
            });
            if (res.ok) {
                showToast("IR number updated", "success");
                setUpdatingIRNumber({ irNo: "", newSerial: "", showModal: false });
                loadAllData();
            } else {
                throw new Error("Failed to update IR number");
            }
        } catch (error) {
            console.error("Update IR number error:", error);
            showToast("Failed to update IR number", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadWord = async (item) => {
        try {
            let endpoint = "";
            let payload = {};
            if (item.sdNo) {
                endpoint = "shopdrawings/generate-word";
                payload = { uniqueId: item.uniqueId || item.id, downloadedBy: user?.username || "admin" };
            } else {
                endpoint = "generate-word";
                payload = {
                    irNo: item.irNo,
                    project: item.project,
                    department: item.department,
                    desc: item.desc || item.subject,
                    requestType: item.requestType || "IR",
                    downloadedBy: user?.username || "admin",
                    ...(item.requestType === "CPR" && {
                        concreteGrade: item.concreteGrade,
                        pouringElement: item.pouringElement,
                        floor: item.floor
                    })
                };
            }

            const res = await fetch(`${API_URL}/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${item.irNo || item.sdNo || 'document'}.docx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                showToast("Document downloaded", "success");

                if (!item.isDone && !item.isArchived) {
                    handleApprove(item);
                }
            } else {
                throw new Error("Failed to generate word document");
            }
        } catch (error) {
            console.error("Download word error:", error);
            showToast("Failed to download document", "error");
        }
    };

    const handleShowDetails = (item) => {
        setSelectedItem(item);
        setShowDetailsModal(true);
    };

    const handleUpdateAction = async (item, newAction) => {
        if (!newAction || !['A','B','C','D'].includes(newAction)) return;
        setSaving(true);
        try {
            const collection = item.isRevision ? "revs" : item.sdNo ? "shopdrawings" : "irs";
            const res = await fetch(`${API_URL}/update-action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uniqueId: item.uniqueId || item.id,
                    collection: collection,
                    action: newAction,
                    updatedBy: user?.username || "admin"
                })
            });
            if (res.ok) {
                showToast(`Action updated to ${newAction}`, "success");
                loadAllData();
            } else {
                throw new Error("Failed to update action");
            }
        } catch (error) {
            console.error("Update action error:", error);
            showToast("Failed to update action", "error");
        } finally {
            setSaving(false);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "—";
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch {
            return dateString;
        }
    };

    // Get department info
    const getDeptInfo = (dept) => {
        return departments.find(d => d.value === dept) || 
               { label: dept, color: "bg-gray-100 text-gray-800", icon: "👤" };
    };

    // Get status info
    const getStatusInfo = (item) => {
        if (item.isArchived) {
            return { label: "Archived", color: "bg-gray-100 text-gray-800", icon: "🗄️" };
        }
        if (item.isDone) {
            return { label: "Completed", color: "bg-green-100 text-green-800", icon: "✅" };
        }
        return { label: "Pending", color: "bg-amber-100 text-amber-800", icon: "⏳" };
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading DC data...</p>
                </div>
            </div>
        );
    }

    const filteredData = getFilteredData();

    return (
        <div className="p-6">
            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-top-5 ${
                    toast.type === "error" ? "bg-red-600" : 
                    toast.type === "warning" ? "bg-amber-600" : 
                    "bg-green-600"
                }`}>
                    <div className="flex items-center gap-2">
                        {toast.type === "error" ? "❌" : toast.type === "warning" ? "⚠️" : "✅"}
                        {toast.message}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">📋 Document Controller Mode</h2>
                        <p className="text-gray-600">Review, archive, and manage all requests, revisions, and shop drawings</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadAllData}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            <span className={saving ? "animate-spin" : ""}>🔄</span>
                            {saving ? "Updating..." : "Refresh Data"}
                        </button>
                        <div className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                            {user?.username || "admin"} • DC
                        </div>
                    </div>
                </div>

                {/* View Tabs */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        onClick={() => setActiveView("pending")}
                        className={`px-4 py-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                            activeView === "pending"
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-gray-600 hover:text-gray-800"
                        }`}
                    >
                        <span>⏳</span>
                        Pending ({stats.totalPending})
                    </button>
                    <button
                        onClick={() => setActiveView("archive")}
                        className={`px-4 py-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                            activeView === "archive"
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-gray-600 hover:text-gray-800"
                        }`}
                    >
                        <span>🗄️</span>
                        Archive ({stats.totalArchive})
                    </button>
                    <button
                        onClick={() => setActiveView("all")}
                        className={`px-4 py-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                            activeView === "all"
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-gray-600 hover:text-gray-800"
                        }`}
                    >
                        <span>📋</span>
                        All ({stats.totalAll})
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-sm text-blue-700">Pending</p><p className="text-2xl font-bold text-blue-800">{stats.totalPending}</p></div>
                        <div className="text-2xl">⏳</div>
                    </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-sm text-green-700">Completed</p><p className="text-2xl font-bold text-green-800">{stats.byStatus.completed || 0}</p></div>
                        <div className="text-2xl">✅</div>
                    </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-sm text-gray-700">Archived</p><p className="text-2xl font-bold text-gray-800">{stats.totalArchive}</p></div>
                        <div className="text-2xl">🗄️</div>
                    </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-sm text-purple-700">Shop Drawings</p><p className="text-2xl font-bold text-purple-800">{stats.sdTotal}</p></div>
                        <div className="text-2xl">📐</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="lg:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">🔍 Search</label>
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Search by number, project, user..." />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">📁 Project</label>
                        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                            <option value="all">All Projects</option>
                            {projects.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">🏗️ Department</label>
                        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                            <option value="all">All Departments</option>
                            {departments.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">📄 Type</label>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                            <option value="all">All Types</option>
                            <option value="IR">IR</option>
                            <option value="CPR">CPR</option>
                            <option value="REV">Revision</option>
                            <option value="SD">Shop Drawing</option>
                        </select>
                    </div>
                    {activeView === "all" && (
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">📊 Status</label>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">🔢 Sort By</label>
                        <div className="flex gap-2">
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg">
                                <option value="date">Date</option>
                                <option value="irNo">Number</option>
                                <option value="project">Project</option>
                                <option value="user">User</option>
                            </select>
                            <button onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="px-3 py-2 border rounded-lg hover:bg-gray-50">{sortOrder === "asc" ? "↑" : "↓"}</button>
                        </div>
                    </div>
                </div>
                {(searchTerm || projectFilter !== "all" || departmentFilter !== "all" || typeFilter !== "all" || statusFilter !== "all") && (
                    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                        <span className="text-sm text-gray-600">Active filters:</span>
                        {searchTerm && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1">Search: "{searchTerm}" <button onClick={() => setSearchTerm("")}>×</button></span>}
                        {projectFilter !== "all" && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">Project: {projectFilter} <button onClick={() => setProjectFilter("all")}>×</button></span>}
                        {departmentFilter !== "all" && <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center gap-1">Dept: {departmentFilter} <button onClick={() => setDepartmentFilter("all")}>×</button></span>}
                        {typeFilter !== "all" && <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full flex items-center gap-1">Type: {typeFilter} <button onClick={() => setTypeFilter("all")}>×</button></span>}
                        {statusFilter !== "all" && <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full flex items-center gap-1">Status: {statusFilter} <button onClick={() => setStatusFilter("all")}>×</button></span>}
                        <button onClick={() => { setSearchTerm(""); setProjectFilter("all"); setDepartmentFilter("all"); setTypeFilter("all"); setStatusFilter("all"); }} className="text-sm text-gray-600 hover:text-gray-800">Clear All</button>
                    </div>
                )}
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold">{activeView === "pending" ? "Pending Items" : activeView === "archive" ? "Archive" : "All Items"}</h3>
                            <p className="text-slate-300 text-sm">Showing {filteredData.length} of {getCurrentData().length} items</p>
                        </div>
                        <div className="text-sm bg-white/10 px-3 py-1 rounded-full">{filteredData.length} items</div>
                    </div>
                </div>

                {filteredData.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="text-gray-400 text-6xl mb-4">📭</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No items found</h3>
                        <button onClick={() => { setSearchTerm(""); setProjectFilter("all"); setDepartmentFilter("all"); setTypeFilter("all"); setStatusFilter("all"); }} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Clear Filters</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 text-gray-700 border-b">
                                    <th className="p-4 text-left font-semibold">Number</th>
                                    <th className="p-4 text-left font-semibold">Type</th>
                                    <th className="p-4 text-left font-semibold">Project</th>
                                    <th className="p-4 text-left font-semibold">Department</th>
                                    <th className="p-4 text-left font-semibold">User</th>
                                    <th className="p-4 text-left font-semibold">Date</th>
                                    <th className="p-4 text-left font-semibold">Status</th>
                                    <th className="p-4 text-left font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, index) => {
                                    const isRevision = item.isRevision;
                                    const isSD = !!item.sdNo;
                                    const isArchived = item.isArchived;
                                    const isDone = item.isDone;
                                    const deptInfo = getDeptInfo(item.department || item.deptAbbr);
                                    const statusInfo = getStatusInfo(item);
                                    return (
                                        <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                <div className="font-mono font-bold text-gray-800">{item.irNo || item.revNo || item.sdNo}</div>
                                                {item.requestType === "CPR" && <div className="text-xs text-teal-600">CPR</div>}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{isRevision ? "🔄" : isSD ? "📐" : item.requestType === "CPR" ? "🏗️" : "📝"}</span>
                                                    <span className="text-sm">{isRevision ? "Revision" : isSD ? "Shop Drawing" : item.requestType === "CPR" ? "CPR" : "IR"}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-800">{item.project}</div>
                                                {item.location && <div className="text-xs text-gray-500 truncate max-w-[150px]">📍 {item.location}</div>}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${deptInfo.color}`}>{deptInfo.icon} {deptInfo.label}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-gray-800">{item.user}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-gray-700">{formatDate(item.sentAt || item.createdAt)}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>{statusInfo.icon} {statusInfo.label}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-1">
                                                    <button onClick={() => handleShowDetails(item)} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded" title="Details">👁️</button>
                                                    {!isRevision && !isSD && (
                                                        <button onClick={() => handleDownloadWord(item)} className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded" title="Download Word">📄</button>
                                                    )}
                                                    {isSD && (
                                                        <button onClick={() => handleDownloadWord(item)} className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded" title="Download Word">📄</button>
                                                    )}
                                                    {!isRevision && !isSD && !isArchived && (
                                                        <button onClick={() => setUpdatingIRNumber({ irNo: item.irNo, newSerial: "", showModal: true })} className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded" title="Update IR Number">🔢</button>
                                                    )}
                                                    {!isDone && !isArchived && (
                                                        <button onClick={() => handleApprove(item)} disabled={saving} className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded disabled:opacity-50" title="Approve">✅</button>
                                                    )}
                                                    {!isArchived ? (
                                                        <button onClick={() => handleArchive(item)} disabled={saving} className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-50" title="Archive">🗄️</button>
                                                    ) : (
                                                        <button onClick={() => handleUnarchive(item)} disabled={saving} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded disabled:opacity-50" title="Restore">↩️</button>
                                                    )}
                                                    <button onClick={() => handleDelete(item)} disabled={saving} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded disabled:opacity-50" title="Delete">🗑️</button>
                                                    {!isArchived && (
                                                        <select onChange={(e) => handleUpdateAction(item, e.target.value)} defaultValue="" className="text-xs border rounded p-1">
                                                            <option value="" disabled>Action</option>
                                                            <option value="A">A</option>
                                                            <option value="B">B</option>
                                                            <option value="C">C</option>
                                                            <option value="D">D</option>
                                                        </select>
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

                {filteredData.length > 0 && (
                    <div className="bg-gray-50 px-4 py-3 border-t">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-gray-600">Showing <span className="font-medium">{filteredData.length}</span> of <span className="font-medium">{getCurrentData().length}</span> items</div>
                            <button onClick={loadAllData} className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm">🔄 Refresh</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Update IR Number Modal */}
            {updatingIRNumber.showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in">
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                            <h3 className="text-xl font-bold">🔢 Update IR Number</h3>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Current IR Number</label>
                                <input type="text" value={updatingIRNumber.irNo} readOnly className="w-full px-4 py-3 bg-gray-100 border rounded-lg" />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">New Serial Number *</label>
                                <input type="number" value={updatingIRNumber.newSerial} onChange={(e) => setUpdatingIRNumber(prev => ({ ...prev, newSerial: e.target.value }))} className="w-full px-4 py-3 border rounded-lg" placeholder="Enter new serial" min="1" />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setUpdatingIRNumber({ irNo: "", newSerial: "", showModal: false })} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg">Cancel</button>
                                <button onClick={handleUpdateIRNumber} disabled={saving} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50">{saving ? "Updating..." : "Update"}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Details Modal */}
            {showDetailsModal && selectedItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in max-h-[90vh] flex flex-col">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold">Details</h3>
                                    <p className="text-blue-100 text-sm mt-1">{selectedItem.irNo || selectedItem.revNo || selectedItem.sdNo}</p>
                                </div>
                                <button onClick={() => setShowDetailsModal(false)} className="text-2xl hover:opacity-70">&times;</button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto">{JSON.stringify(selectedItem, null, 2)}</pre>
                        </div>
                        <div className="bg-gray-50 p-6 border-t flex justify-end gap-3">
                            <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg">Close</button>
                            {!selectedItem.isRevision && (
                                <button onClick={() => { handleDownloadWord(selectedItem); setShowDetailsModal(false); }} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">📄 Download Word</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}