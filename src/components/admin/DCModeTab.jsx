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
    const [archiveIRs, setArchiveIRs] = useState([]);
    const [archiveRevisions, setArchiveRevisions] = useState([]);
    const [allIRs, setAllIRs] = useState([]);
    
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
        byStatus: {}
    });
    
    // Projects List
    const [projects, setProjects] = useState([]);
    
    // Departments
    const departments = [
        { value: "ARCH", label: "معماري", color: "bg-blue-100 text-blue-800", icon: "🏛️" },
        { value: "ST", label: "إنشائي", color: "bg-green-100 text-green-800", icon: "🏗️" },
        { value: "ELECT", label: "كهرباء", color: "bg-purple-100 text-purple-800", icon: "⚡" },
        { value: "MEP", label: "ميكانيكا", color: "bg-amber-100 text-amber-800", icon: "🔧" },
        { value: "SURV", label: "مساحة", color: "bg-indigo-100 text-indigo-800", icon: "📐" }
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
            showToast("فشل في تحميل بيانات الـ DC", "error");
        } finally {
            setLoading(false);
        }
    };
    
    const loadPendingData = async () => {
        try {
            const [irsRes, revsRes] = await Promise.all([
                fetch(`${API_URL}/irs`),
                fetch(`${API_URL}/revs`)
            ]);
            
            let pendingIRsData = [];
            let pendingRevsData = [];
            
            if (irsRes.ok) {
                const data = await irsRes.json();
                pendingIRsData = (data.irs || []).filter(ir => !ir.isDone && !ir.isArchived);
            }
            
            if (revsRes.ok) {
                const data = await revsRes.json();
                pendingRevsData = (data.revs || []).filter(rev => !rev.isDone && !rev.isArchived);
            }
            
            setPendingIRs(pendingIRsData);
            setPendingRevisions(pendingRevsData);
        } catch (error) {
            console.error("Failed to load pending data:", error);
        }
    };
    
    const loadArchiveData = async () => {
        try {
            const res = await fetch(`${API_URL}/archive/dc`);
            if (res.ok) {
                const data = await res.json();
                const archiveData = data.archive || [];
                
                const archiveIRsData = archiveData.filter(item => !item.isRevision);
                const archiveRevsData = archiveData.filter(item => item.isRevision);
                
                setArchiveIRs(archiveIRsData);
                setArchiveRevisions(archiveRevsData);
            }
        } catch (error) {
            console.error("Failed to load archive data:", error);
        }
    };
    
    const loadAllIRsData = async () => {
        try {
            const [irsRes, revsRes] = await Promise.all([
                fetch(`${API_URL}/irs`),
                fetch(`${API_URL}/revs`)
            ]);
            
            let allIRsData = [];
            
            if (irsRes.ok) {
                const data = await irsRes.json();
                allIRsData = [...(data.irs || [])];
            }
            
            if (revsRes.ok) {
                const data = await revsRes.json();
                allIRsData = [...allIRsData, ...(data.revs || [])];
            }
            
            setAllIRs(allIRsData);
        } catch (error) {
            console.error("Failed to load all IRs data:", error);
        }
    };
    
    const loadProjects = async () => {
        try {
            const res = await fetch(`${API_URL}/projects`);
            if (res.ok) {
                const data = await res.json();
                const projectsList = Object.keys(data.projects || {});
                setProjects(projectsList);
            }
        } catch (error) {
            console.error("Failed to load projects:", error);
        }
    };
    
    const calculateStatistics = () => {
        const allItems = [...pendingIRs, ...pendingRevisions, ...archiveIRs, ...archiveRevisions];
        
        const stats = {
            totalPending: pendingIRs.length + pendingRevisions.length,
            totalArchive: archiveIRs.length + archiveRevisions.length,
            totalAll: allItems.length,
            byProject: {},
            byDepartment: {},
            byStatus: {}
        };
        
        // Calculate by project
        allItems.forEach(item => {
            const project = item.project || "Unknown";
            stats.byProject[project] = (stats.byProject[project] || 0) + 1;
        });
        
        // Calculate by department
        allItems.forEach(item => {
            const dept = item.department || item.deptAbbr || "Unknown";
            stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
        });
        
        // Calculate by status
        allItems.forEach(item => {
            const status = item.isArchived ? "archived" : 
                          item.isDone ? "completed" : "pending";
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
        });
        
        setStats(stats);
    };
    
    // Get current data based on active view
    const getCurrentData = () => {
        switch(activeView) {
            case "pending":
                return [...pendingIRs, ...pendingRevisions];
            case "archive":
                return [...archiveIRs, ...archiveRevisions];
            case "all":
                return allIRs;
            default:
                return [];
        }
    };
    
    // Filter and sort data
    const getFilteredData = () => {
        let data = getCurrentData();
        
        // Apply filters
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(item => {
                return (
                    (item.irNo && item.irNo.toLowerCase().includes(term)) ||
                    (item.revNo && item.revNo.toLowerCase().includes(term)) ||
                    (item.project && item.project.toLowerCase().includes(term)) ||
                    (item.user && item.user.toLowerCase().includes(term)) ||
                    (item.fullname && item.fullname.toLowerCase().includes(term)) ||
                    (item.desc && item.desc.toLowerCase().includes(term))
                );
            });
        }
        
        if (projectFilter !== "all") {
            data = data.filter(item => item.project === projectFilter);
        }
        
        if (departmentFilter !== "all") {
            data = data.filter(item => 
                item.department === departmentFilter || 
                item.deptAbbr === departmentFilter
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
                data = data.filter(item => !item.isRevision);
            } else if (typeFilter === "CPR") {
                data = data.filter(item => item.requestType === "CPR");
            } else if (typeFilter === "REV") {
                data = data.filter(item => item.isRevision);
            }
        }
        
        // Apply sorting
        data.sort((a, b) => {
            let aValue, bValue;
            
            switch(sortBy) {
                case "date":
                    aValue = new Date(a.sentAt || a.createdAt || a.updatedAt).getTime();
                    bValue = new Date(b.sentAt || b.createdAt || b.updatedAt).getTime();
                    break;
                case "irNo":
                    aValue = a.irNo || a.revNo || "";
                    bValue = b.irNo || b.revNo || "";
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
        if (!window.confirm(`هل تريد الموافقة على ${item.isRevision ? 'المراجعة' : 'طلب التفتيش'} ${item.irNo || item.revNo}؟`)) {
            return;
        }
        
        setSaving(true);
        try {
            const endpoint = item.isRevision ? "revs" : "irs";
            const itemId = item.irNo || item.revNo;
            
            const res = await fetch(`${API_URL}/${endpoint}/mark-done`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo: itemId,
                    downloadedBy: user?.username || "admin"
                })
            });
            
            if (res.ok) {
                showToast(`تمت الموافقة على ${item.isRevision ? 'المراجعة' : 'طلب التفتيش'}`, "success");
                loadAllData();
            } else {
                throw new Error("Failed to approve");
            }
        } catch (error) {
            console.error("Approve error:", error);
            showToast("فشل في الموافقة", "error");
        } finally {
            setSaving(false);
        }
    };
    
    const handleReject = async (item) => {
        const reason = prompt("أدخل سبب الرفض:");
        if (!reason) return;
        
        setSaving(true);
        try {
            const endpoint = item.isRevision ? "revs" : "irs";
            const itemId = item.irNo || item.revNo;
            
            const res = await fetch(`${API_URL}/${endpoint}/${itemId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...item,
                    status: "rejected",
                    rejectionReason: reason,
                    isDone: true,
                    updatedAt: new Date().toISOString()
                })
            });
            
            if (res.ok) {
                showToast(`تم رفض ${item.isRevision ? 'المراجعة' : 'طلب التفتيش'}`, "success");
                loadAllData();
            } else {
                throw new Error("Failed to reject");
            }
        } catch (error) {
            console.error("Reject error:", error);
            showToast("فشل في الرفض", "error");
        } finally {
            setSaving(false);
        }
    };
    
    const handleArchive = async (item) => {
        if (!window.confirm(`هل تريد أرشفة ${item.isRevision ? 'المراجعة' : 'طلب التفتيش'} ${item.irNo || item.revNo}؟`)) {
            return;
        }
        
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo: item.irNo || item.revNo,
                    role: "dc",
                    isRevision: item.isRevision
                })
            });
            
            if (res.ok) {
                showToast(`تم أرشفة ${item.isRevision ? 'المراجعة' : 'طلب التفتيش'}`, "success");
                loadAllData();
            } else {
                throw new Error("Failed to archive");
            }
        } catch (error) {
            console.error("Archive error:", error);
            showToast("فشل في الأرشيف", "error");
        } finally {
            setSaving(false);
        }
    };
    
    const handleUnarchive = async (item) => {
        if (!window.confirm(`هل تريد استعادة ${item.isRevision ? 'المراجعة' : 'طلب التفتيش'} ${item.irNo || item.revNo} من الأرشيف؟`)) {
            return;
        }
        
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/unarchive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo: item.irNo || item.revNo,
                    role: "dc",
                    isRevision: item.isRevision
                })
            });
            
            if (res.ok) {
                showToast(`تمت استعادة ${item.isRevision ? 'المراجعة' : 'طلب التفتيش'}`, "success");
                loadAllData();
            } else {
                throw new Error("Failed to unarchive");
            }
        } catch (error) {
            console.error("Unarchive error:", error);
            showToast("فشل في الاستعادة", "error");
        } finally {
            setSaving(false);
        }
    };
    
    const handleDelete = async (item) => {
        if (!window.confirm(`هل تريد حذف ${item.isRevision ? 'المراجعة' : 'طلب التفتيش'} ${item.irNo || item.revNo} نهائياً؟\n\nهذا الإجراء لا يمكن التراجع عنه.`)) {
            return;
        }
        
        setSaving(true);
        try {
            const endpoint = item.isArchived ? 
                (item.isRevision ? "revs/delete" : "irs/delete") : 
                (item.isRevision ? "revs/delete" : "irs/delete");
            
            const res = await fetch(`${API_URL}/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo: item.irNo || item.revNo,
                    role: "dc"
                })
            });
            
            if (res.ok) {
                showToast(`تم حذف ${item.isRevision ? 'المراجعة' : 'طلب التفتيش'}`, "success");
                loadAllData();
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            console.error("Delete error:", error);
            showToast("فشل في الحذف", "error");
        } finally {
            setSaving(false);
        }
    };
    
    const handleUpdateIRNumber = async () => {
        const { irNo, newSerial } = updatingIRNumber;
        
        if (!irNo || !newSerial || parseInt(newSerial) < 1) {
            showToast("يرجى إدخال رقم IR ورقم تسلسلي صحيح", "error");
            return;
        }
        
        setSaving(true);
        try {
            // Find the item
            const item = getCurrentData().find(item => item.irNo === irNo);
            if (!item) {
                showToast("لم يتم العثور على طلب التفتيش", "error");
                return;
            }
            
            const res = await fetch(`${API_URL}/irs/update-ir-number`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo: irNo,
                    newSerial: parseInt(newSerial),
                    project: item.project,
                    department: item.department,
                    requestType: item.requestType || "IR"
                })
            });
            
            if (res.ok) {
                showToast("تم تحديث رقم IR بنجاح", "success");
                setUpdatingIRNumber({ irNo: "", newSerial: "", showModal: false });
                loadAllData();
            } else {
                throw new Error("Failed to update IR number");
            }
        } catch (error) {
            console.error("Update IR number error:", error);
            showToast("فشل في تحديث رقم IR", "error");
        } finally {
            setSaving(false);
        }
    };
    
    const handleDownloadWord = async (item) => {
        try {
            // Prepare data for word generation
            const wordData = {
                irNo: item.irNo,
                project: item.project,
                department: item.department,
                desc: item.desc,
                requestType: item.requestType || "IR",
                downloadedBy: user?.username || "admin"
            };
            
            // Add additional fields for CPR
            if (item.requestType === "CPR") {
                wordData.concreteGrade = item.concreteGrade;
                wordData.pouringElement = item.pouringElement;
                wordData.floor = item.floor;
            }
            
            // Generate word document
            const res = await fetch(`${API_URL}/generate-word`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(wordData)
            });
            
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${item.irNo || item.revNo}.docx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                showToast("تم تحميل الوثيقة بنجاح", "success");
                
                // Mark as done if it's pending
                if (!item.isDone && !item.isArchived) {
                    handleApprove(item);
                }
            } else {
                throw new Error("Failed to generate word document");
            }
        } catch (error) {
            console.error("Download word error:", error);
            showToast("فشل في تحميل الوثيقة", "error");
        }
    };
    
    const handleShowDetails = (item) => {
        setSelectedItem(item);
        setShowDetailsModal(true);
    };
    
    const handleBulkAction = async (action, selectedItems) => {
        if (!selectedItems || selectedItems.length === 0) {
            showToast("لم يتم اختيار أي عناصر", "warning");
            return;
        }
        
        const confirmMessage = {
            approve: `هل تريد الموافقة على ${selectedItems.length} عنصر؟`,
            reject: `هل تريد رفض ${selectedItems.length} عنصر؟`,
            archive: `هل تريد أرشفة ${selectedItems.length} عنصر؟`,
            delete: `هل تريد حذف ${selectedItems.length} عنصر نهائياً؟`
        }[action];
        
        if (!window.confirm(confirmMessage)) {
            return;
        }
        
        setSaving(true);
        try {
            // Process each item
            for (const item of selectedItems) {
                switch(action) {
                    case "approve":
                        await handleApprove(item);
                        break;
                    case "archive":
                        await handleArchive(item);
                        break;
                    case "delete":
                        await handleDelete(item);
                        break;
                }
            }
            
            showToast(`تم تنفيذ الإجراء على ${selectedItems.length} عنصر`, "success");
        } catch (error) {
            console.error("Bulk action error:", error);
            showToast("فشل في تنفيذ الإجراء المجمع", "error");
        } finally {
            setSaving(false);
        }
    };
    
    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "—";
        try {
            const date = new Date(dateString);
            return new Intl.DateTimeFormat('ar-EG', {
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
            return { label: "مؤرشف", color: "bg-gray-100 text-gray-800", icon: "🗄️" };
        }
        if (item.isDone) {
            return { label: "مكتمل", color: "bg-green-100 text-green-800", icon: "✅" };
        }
        return { label: "قيد الانتظار", color: "bg-amber-100 text-amber-800", icon: "⏳" };
    };
    
    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 font-medium">جاري تحميل بيانات الـ DC...</p>
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
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">📋 وضع Document Controller</h2>
                        <p className="text-gray-600">مراجعة، أرشفة، وإدارة جميع طلبات التفتيش والمراجعات</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadAllData}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            <span className={saving ? "animate-spin" : ""}>🔄</span>
                            {saving ? "جار التحديث..." : "تحديث البيانات"}
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
                        قيد الانتظار ({stats.totalPending})
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
                        الأرشيف ({stats.totalArchive})
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
                        الكل ({stats.totalAll})
                    </button>
                </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-700">قيد الانتظار</p>
                            <p className="text-2xl font-bold text-blue-800">{stats.totalPending}</p>
                        </div>
                        <div className="text-2xl">⏳</div>
                    </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-700">مكتمل</p>
                            <p className="text-2xl font-bold text-green-800">{stats.byStatus.completed || 0}</p>
                        </div>
                        <div className="text-2xl">✅</div>
                    </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-700">مؤرشف</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.totalArchive}</p>
                        </div>
                        <div className="text-2xl">🗄️</div>
                    </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-700">إجمالي</p>
                            <p className="text-2xl font-bold text-purple-800">{stats.totalAll}</p>
                        </div>
                        <div className="text-2xl">📊</div>
                    </div>
                </div>
            </div>
            
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">🔍 بحث</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="ابحث برقم IR، المشروع، المستخدم..."
                        />
                    </div>
                    
                    {/* Project Filter */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">📁 المشروع</label>
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                            <option value="all">جميع المشاريع</option>
                            {projects.map(project => (
                                <option key={project} value={project}>{project}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Department Filter */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">🏗️ القسم</label>
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                            <option value="all">جميع الأقسام</option>
                            {departments.map(dept => (
                                <option key={dept.value} value={dept.value}>{dept.label}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Type Filter */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">📄 النوع</label>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                            <option value="all">الكل</option>
                            <option value="IR">طلبات التفتيش</option>
                            <option value="CPR">طلبات CPR</option>
                            <option value="REV">مراجعات</option>
                        </select>
                    </div>
                    
                    {/* Status Filter (for all view) */}
                    {activeView === "all" && (
                        <div className="md:col-span-1">
                            <label className="block text-sm text-gray-600 mb-1">📊 الحالة</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                                <option value="all">جميع الحالات</option>
                                <option value="pending">قيد الانتظار</option>
                                <option value="completed">مكتمل</option>
                                <option value="archived">مؤرشف</option>
                            </select>
                        </div>
                    )}
                    
                    {/* Sort Controls */}
                    <div className="md:col-span-1">
                        <label className="block text-sm text-gray-600 mb-1">🔢 الترتيب</label>
                        <div className="flex gap-2">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                                <option value="date">التاريخ</option>
                                <option value="irNo">رقم IR</option>
                                <option value="project">المشروع</option>
                                <option value="user">المستخدم</option>
                            </select>
                            <button
                                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                                className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                                title={sortOrder === "asc" ? "تصاعدي" : "تنازلي"}
                            >
                                {sortOrder === "asc" ? "↑" : "↓"}
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Active Filters */}
                {(searchTerm || projectFilter !== "all" || departmentFilter !== "all" || typeFilter !== "all" || statusFilter !== "all") && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-gray-600">الفلاتر النشطة:</span>
                            {searchTerm && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1">
                                    بحث: "{searchTerm}"
                                    <button onClick={() => setSearchTerm("")} className="text-blue-600 hover:text-blue-800">×</button>
                                </span>
                            )}
                            {projectFilter !== "all" && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                                    مشروع: {projectFilter}
                                    <button onClick={() => setProjectFilter("all")} className="text-green-600 hover:text-green-800">×</button>
                                </span>
                            )}
                            {departmentFilter !== "all" && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center gap-1">
                                    قسم: {getDeptInfo(departmentFilter).label}
                                    <button onClick={() => setDepartmentFilter("all")} className="text-purple-600 hover:text-purple-800">×</button>
                                </span>
                            )}
                            {typeFilter !== "all" && (
                                <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full flex items-center gap-1">
                                    نوع: {typeFilter}
                                    <button onClick={() => setTypeFilter("all")} className="text-amber-600 hover:text-amber-800">×</button>
                                </span>
                            )}
                            {statusFilter !== "all" && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full flex items-center gap-1">
                                    حالة: {statusFilter === "pending" ? "قيد الانتظار" : 
                                          statusFilter === "completed" ? "مكتمل" : "مؤرشف"}
                                    <button onClick={() => setStatusFilter("all")} className="text-gray-600 hover:text-gray-800">×</button>
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setProjectFilter("all");
                                    setDepartmentFilter("all");
                                    setTypeFilter("all");
                                    setStatusFilter("all");
                                }}
                                className="text-sm text-gray-600 hover:text-gray-800"
                            >
                                مسح الكل
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Data Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Table Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold">
                                {activeView === "pending" ? "طلبات قيد الانتظار" :
                                 activeView === "archive" ? "الأرشيف" : "جميع الطلبات"}
                            </h3>
                            <p className="text-slate-300 text-sm">
                                عرض {filteredData.length} من {getCurrentData().length} عنصر
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {filteredData.length > 0 && (
                                <button
                                    onClick={() => {
                                        // Select all items for bulk action
                                        const selectedItems = filteredData.filter(item => 
                                            activeView === "pending" ? !item.isDone && !item.isArchived : 
                                            activeView === "archive" ? item.isArchived :
                                            true
                                        );
                                        
                                        if (selectedItems.length === 0) {
                                            showToast("لا توجد عناصر مناسبة للإجراء المجمع", "warning");
                                            return;
                                        }
                                        
                                        const action = prompt(`اختر إجراء مجمع:\n1. approve - الموافقة\n2. archive - الأرشيف\n3. delete - الحذف`);
                                        
                                        if (action && ["approve", "archive", "delete"].includes(action)) {
                                            handleBulkAction(action, selectedItems);
                                        }
                                    }}
                                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                                >
                                    ⚡ إجراء مجمع
                                </button>
                            )}
                            <div className="text-sm bg-white/10 px-3 py-1 rounded-full">
                                {filteredData.length} عنصر
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Table Content */}
                {filteredData.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="text-gray-400 text-6xl mb-4">
                            {activeView === "pending" ? "⏳" :
                             activeView === "archive" ? "🗄️" : "📋"}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            لا توجد عناصر
                        </h3>
                        <p className="text-gray-500 mb-6">
                            {searchTerm || projectFilter !== "all" || departmentFilter !== "all" || typeFilter !== "all" || statusFilter !== "all"
                                ? "لم يتم العثور على عناصر تطابق معايير البحث"
                                : activeView === "pending" 
                                    ? "لا توجد طلبات قيد الانتظار حالياً"
                                    : activeView === "archive"
                                        ? "لا توجد عناصر في الأرشيف"
                                        : "لا توجد عناصر في النظام"}
                        </p>
                        {(searchTerm || projectFilter !== "all" || departmentFilter !== "all" || typeFilter !== "all" || statusFilter !== "all") && (
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setProjectFilter("all");
                                    setDepartmentFilter("all");
                                    setTypeFilter("all");
                                    setStatusFilter("all");
                                }}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                            >
                                مسح الفلاتر
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 text-gray-700 border-b">
                                    <th className="p-4 text-left font-semibold">الرقم</th>
                                    <th className="p-4 text-left font-semibold">النوع</th>
                                    <th className="p-4 text-left font-semibold">المشروع</th>
                                    <th className="p-4 text-left font-semibold">القسم</th>
                                    <th className="p-4 text-left font-semibold">المستخدم</th>
                                    <th className="p-4 text-left font-semibold">التاريخ</th>
                                    <th className="p-4 text-left font-semibold">الحالة</th>
                                    <th className="p-4 text-left font-semibold">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, index) => {
                                    const isRevision = item.isRevision;
                                    const isArchived = item.isArchived;
                                    const isDone = item.isDone;
                                    const deptInfo = getDeptInfo(item.department || item.deptAbbr);
                                    const statusInfo = getStatusInfo(item);
                                    
                                    return (
                                        <tr key={index} className="border-b hover:bg-gray-50 transition-colors">
                                            {/* Number */}
                                            <td className="p-4">
                                                <div className="font-mono font-bold text-gray-800">
                                                    {item.irNo || item.revNo}
                                                </div>
                                                {item.requestType === "CPR" && (
                                                    <div className="text-xs text-teal-600">CPR</div>
                                                )}
                                            </td>
                                            
                                            {/* Type */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">
                                                        {isRevision ? "🔄" : 
                                                         item.requestType === "CPR" ? "🏗️" : "📝"}
                                                    </span>
                                                    <span className="text-sm">
                                                        {isRevision ? "مراجعة" : 
                                                         item.requestType === "CPR" ? "CPR" : "IR"}
                                                    </span>
                                                </div>
                                            </td>
                                            
                                            {/* Project */}
                                            <td className="p-4">
                                                <div className="font-medium text-gray-800">
                                                    {item.project}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                                    {item.location && `📍 ${item.location}`}
                                                    {item.floor && ` • ${item.floor}`}
                                                </div>
                                            </td>
                                            
                                            {/* Department */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${deptInfo.color}`}>
                                                        {deptInfo.icon} {deptInfo.label}
                                                    </span>
                                                </div>
                                            </td>
                                            
                                            {/* User */}
                                            <td className="p-4">
                                                <div className="font-medium text-gray-800">
                                                    {item.fullname || item.user}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {item.user}
                                                </div>
                                            </td>
                                            
                                            {/* Date */}
                                            <td className="p-4">
                                                <div className="text-sm text-gray-700">
                                                    {formatDate(item.sentAt || item.createdAt)}
                                                </div>
                                                {item.updatedAt && item.updatedAt !== item.createdAt && (
                                                    <div className="text-xs text-gray-500">
                                                        معدل: {formatDate(item.updatedAt).split('،')[0]}
                                                    </div>
                                                )}
                                            </td>
                                            
                                            {/* Status */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                                        {statusInfo.icon} {statusInfo.label}
                                                    </span>
                                                </div>
                                                {item.rejectionReason && (
                                                    <div className="text-xs text-red-600 mt-1" title={item.rejectionReason}>
                                                        ❌ مرفوض
                                                    </div>
                                                )}
                                            </td>
                                            
                                            {/* Actions */}
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {/* View Details */}
                                                    <button
                                                        onClick={() => handleShowDetails(item)}
                                                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                                                        title="عرض التفاصيل"
                                                    >
                                                        👁️
                                                    </button>
                                                    
                                                    {/* Download Word */}
                                                    {!isRevision && (
                                                        <button
                                                            onClick={() => handleDownloadWord(item)}
                                                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded"
                                                            title="تحميل وثيقة Word"
                                                        >
                                                            📄
                                                        </button>
                                                    )}
                                                    
                                                    {/* Update IR Number */}
                                                    {!isRevision && !isArchived && (
                                                        <button
                                                            onClick={() => setUpdatingIRNumber({
                                                                irNo: item.irNo,
                                                                newSerial: "",
                                                                showModal: true
                                                            })}
                                                            className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded"
                                                            title="تحديث رقم IR"
                                                        >
                                                            🔢
                                                        </button>
                                                    )}
                                                    
                                                    {/* Approve */}
                                                    {!isDone && !isArchived && (
                                                        <button
                                                            onClick={() => handleApprove(item)}
                                                            disabled={saving}
                                                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded disabled:opacity-50"
                                                            title="الموافقة"
                                                        >
                                                            ✅
                                                        </button>
                                                    )}
                                                    
                                                    {/* Reject */}
                                                    {!isDone && !isArchived && (
                                                        <button
                                                            onClick={() => handleReject(item)}
                                                            disabled={saving}
                                                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded disabled:opacity-50"
                                                            title="الرفض"
                                                        >
                                                            ❌
                                                        </button>
                                                    )}
                                                    
                                                    {/* Archive/Unarchive */}
                                                    {!isArchived ? (
                                                        <button
                                                            onClick={() => handleArchive(item)}
                                                            disabled={saving}
                                                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-50"
                                                            title="الأرشيف"
                                                        >
                                                            🗄️
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUnarchive(item)}
                                                            disabled={saving}
                                                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded disabled:opacity-50"
                                                            title="استعادة من الأرشيف"
                                                        >
                                                            ↩️
                                                        </button>
                                                    )}
                                                    
                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        disabled={saving}
                                                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded disabled:opacity-50"
                                                        title="حذف"
                                                    >
                                                        🗑️
                                                    </button>
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
                {filteredData.length > 0 && (
                    <div className="bg-gray-50 px-4 py-3 border-t">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-gray-600">
                                عرض <span className="font-medium">{filteredData.length}</span> من{" "}
                                <span className="font-medium">{getCurrentData().length}</span> عنصر
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-sm text-gray-500">
                                    تم التحديث: {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <button
                                    onClick={loadAllData}
                                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-sm"
                                >
                                    🔄 تحديث
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Update IR Number Modal */}
            {updatingIRNumber.showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in">
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
                            <h3 className="text-xl font-bold">🔢 تحديث رقم IR</h3>
                            <p className="text-purple-100 text-sm mt-1">تحديث الرقم التسلسلي لطلب التفتيش</p>
                        </div>
                        
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    رقم IR الحالي
                                </label>
                                <input
                                    type="text"
                                    value={updatingIRNumber.irNo}
                                    readOnly
                                    className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600"
                                />
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    الرقم التسلسلي الجديد *
                                </label>
                                <input
                                    type="number"
                                    value={updatingIRNumber.newSerial}
                                    onChange={(e) => setUpdatingIRNumber(prev => ({
                                        ...prev,
                                        newSerial: e.target.value
                                    }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                    placeholder="أدخل الرقم التسلسلي الجديد"
                                    min="1"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    سيتم توليد رقم IR جديد بناءً على هذا الرقم
                                </p>
                            </div>
                            
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setUpdatingIRNumber({ irNo: "", newSerial: "", showModal: false })}
                                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleUpdateIRNumber}
                                    disabled={saving || !updatingIRNumber.newSerial}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
                                >
                                    {saving ? "جار التحديث..." : "💾 تحديث"}
                                </button>
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
                                    <h3 className="text-xl font-bold">تفاصيل {selectedItem.isRevision ? 'المراجعة' : 'طلب التفتيش'}</h3>
                                    <p className="text-blue-100 text-sm mt-1">
                                        {selectedItem.irNo || selectedItem.revNo}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-2xl hover:opacity-70"
                                >
                                    &times;
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Basic Info */}
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-gray-700 mb-2">المعلومات الأساسية</h4>
                                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">الرقم:</span>
                                                <span className="font-medium">{selectedItem.irNo || selectedItem.revNo}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">النوع:</span>
                                                <span className="font-medium">
                                                    {selectedItem.isRevision ? 'مراجعة' : 
                                                     selectedItem.requestType === 'CPR' ? 'طلب CPR' : 'طلب تفتيش'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">المشروع:</span>
                                                <span className="font-medium">{selectedItem.project}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">القسم:</span>
                                                <span className="font-medium">{selectedItem.department}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">المستخدم:</span>
                                                <span className="font-medium">{selectedItem.fullname} ({selectedItem.user})</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Location Info */}
                                    {(selectedItem.location || selectedItem.floor) && (
                                        <div>
                                            <h4 className="font-medium text-gray-700 mb-2">الموقع</h4>
                                            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                                {selectedItem.location && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">الموقع:</span>
                                                        <span className="font-medium">{selectedItem.location}</span>
                                                    </div>
                                                )}
                                                {selectedItem.floor && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">الطابق:</span>
                                                        <span className="font-medium">{selectedItem.floor}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Details */}
                                <div className="space-y-4">
                                    {/* Description */}
                                    <div>
                                        <h4 className="font-medium text-gray-700 mb-2">الوصف</h4>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <p className="text-gray-800">{selectedItem.desc}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Dates */}
                                    <div>
                                        <h4 className="font-medium text-gray-700 mb-2">التواريخ</h4>
                                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">تاريخ الإرسال:</span>
                                                <span className="font-medium">{formatDate(selectedItem.sentAt || selectedItem.createdAt)}</span>
                                            </div>
                                            {selectedItem.completedAt && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">تاريخ الإكمال:</span>
                                                    <span className="font-medium">{formatDate(selectedItem.completedAt)}</span>
                                                </div>
                                            )}
                                            {selectedItem.archivedAt && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">تاريخ الأرشيف:</span>
                                                    <span className="font-medium">{formatDate(selectedItem.archivedAt)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Status */}
                                    <div>
                                        <h4 className="font-medium text-gray-700 mb-2">الحالة</h4>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                                {getStatusInfo(selectedItem).icon}
                                                <span className="font-medium">{getStatusInfo(selectedItem).label}</span>
                                            </div>
                                            {selectedItem.rejectionReason && (
                                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                                    <p className="text-sm text-red-700 font-medium">سبب الرفض:</p>
                                                    <p className="text-red-600 text-sm">{selectedItem.rejectionReason}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Additional Info for CPR */}
                            {selectedItem.requestType === "CPR" && (
                                <div className="mt-6 pt-6 border-t">
                                    <h4 className="font-medium text-gray-700 mb-3">معلومات CPR</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedItem.concreteGrade && (
                                            <div className="bg-teal-50 p-3 rounded-lg">
                                                <p className="text-sm text-teal-700 font-medium">درجة الخرسانة</p>
                                                <p className="text-teal-800">{selectedItem.concreteGrade}</p>
                                            </div>
                                        )}
                                        {selectedItem.pouringElement && (
                                            <div className="bg-teal-50 p-3 rounded-lg">
                                                <p className="text-sm text-teal-700 font-medium">عنصر الصب</p>
                                                <p className="text-teal-800">{selectedItem.pouringElement}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Revision Info */}
                            {selectedItem.isRevision && (
                                <div className="mt-6 pt-6 border-t">
                                    <h4 className="font-medium text-gray-700 mb-3">معلومات المراجعة</h4>
                                    <div className="bg-amber-50 p-4 rounded-lg">
                                        {selectedItem.revNote && (
                                            <div className="mb-3">
                                                <p className="text-sm text-amber-700 font-medium">ملاحظة المراجعة:</p>
                                                <p className="text-amber-800">{selectedItem.revNote}</p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-amber-700 font-medium">رقم المراجعة:</p>
                                                <p className="text-amber-800">{selectedItem.userRevNumber || selectedItem.revText}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-amber-700 font-medium">نوع المراجعة:</p>
                                                <p className="text-amber-800">
                                                    {selectedItem.revisionType === "CPR_REVISION" ? "مراجعة CPR" : "مراجعة IR"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Modal Actions */}
                        <div className="bg-gray-50 p-6 border-t flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                                المعرّف: {selectedItem.id || selectedItem.irNo || selectedItem.revNo}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg"
                                >
                                    إغلاق
                                </button>
                                {!selectedItem.isRevision && (
                                    <button
                                        onClick={() => {
                                            handleDownloadWord(selectedItem);
                                            setShowDetailsModal(false);
                                        }}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                                    >
                                        📄 تحميل وثيقة
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}