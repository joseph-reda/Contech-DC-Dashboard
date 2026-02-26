// src/pages/DcArchive.jsx - النسخة النهائية مع دمج النشاط وإزالة الأعمدة
import { useEffect, useState, useCallback, memo, useRef } from "react";
import { API_URL } from "../config";
import { useNavigate } from "react-router-dom";
import { 
    getDepartmentAbbr,
    formatDate,
    formatShortDate 
} from "../utils/formatters";

// ==================== COMPONENTS خارج المكون الرئيسي ====================

// مكون Toast Notification
const ToastNotification = memo(({ toast, onClose }) => {
    useEffect(() => {
        if (toast.show) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast.show, onClose]);

    if (!toast.show) return null;

    return (
        <div className={`fixed top-5 right-5 z-50 px-6 py-4 rounded-xl shadow-2xl text-white font-medium animate-in fade-in slide-in-from-top-5 flex items-center gap-3 ${
            toast.type === "error" ? "bg-red-600" : 
            toast.type === "warning" ? "bg-amber-600" : 
            "bg-emerald-600"
        }`}>
            <span className="text-xl">
                {toast.type === "error" ? "❌" : toast.type === "warning" ? "⚠️" : "✅"}
            </span>
            {toast.message}
        </div>
    );
});

// مكون DeleteConfirmationModal
const DeleteConfirmationModal = memo(({ show, item, onConfirm, onCancel, isDeleting }) => {
    if (!show || !item) return null;
    
    const getDisplayNumber = (item) => {
        if (item.isRevision) {
            if (item.displayNumber) return item.displayNumber;
            if (item.userRevNumber) {
                const prefix = item.revisionType === "CPR_REVISION" ? "REV-CPR-" : "REV-IR-";
                return `${prefix}${item.userRevNumber}`;
            }
            return item.revNo || "REV";
        }
        return item.irNo || "N/A";
    };

    const getTypeText = (item) => {
        if (item.isRevision) {
            if (item.revisionType === "CPR_REVISION" || item.isCPRRevision) {
                return "CPR REVISION";
            }
            return "IR REVISION";
        }
        return item.requestType === 'CPR' ? 'CPR' : 'IR';
    };

    const displayNumber = getDisplayNumber(item);
    const typeText = getTypeText(item);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in duration-200">
                <div className="text-center mb-4">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-4xl text-red-500">⚠️</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Permanent Delete</h3>
                    <p className="text-gray-600">
                        Are you sure you want to permanently delete this item?
                    </p>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-gray-600 font-medium">Item:</div>
                        <div className="font-bold text-gray-900">{displayNumber}</div>
                        
                        <div className="text-gray-600 font-medium">Type:</div>
                        <div className="font-bold text-gray-900">{typeText}</div>
                        
                        <div className="text-gray-600 font-medium">Project:</div>
                        <div className="font-bold text-gray-900">{item.project || 'Unknown'}</div>
                        
                        <div className="text-gray-600 font-medium">Description:</div>
                        <div className="font-bold text-gray-900 truncate" title={item.desc}>
                            {item.desc?.substring(0, 40) || 'No description'}
                            {item.desc?.length > 40 ? '...' : ''}
                        </div>
                    </div>
                </div>
                
                <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl mb-6 text-center border border-red-200">
                    ⚠️ <span className="font-bold">Warning:</span> This action cannot be undone! 
                    The item will be permanently removed from the system.
                </div>
                
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-medium transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(item)}
                        disabled={isDeleting}
                        className={`flex-1 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
                            isDeleting 
                                ? 'bg-red-400 cursor-not-allowed' 
                                : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                    >
                        {isDeleting ? (
                            <>
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                Deleting...
                            </>
                        ) : (
                            <>
                                <span>🗑️</span>
                                Delete Permanently
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
});

// مكون ActionEdit (للتعديل)
const ActionEdit = memo(({ value, onSave, onCancel }) => {
    const [selectedAction, setSelectedAction] = useState(value || 'A');

    return (
        <div className="flex items-center gap-1">
            <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-16 px-1 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
            </select>
            <button
                onClick={() => onSave(selectedAction)}
                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
                ✓
            </button>
            <button
                onClick={onCancel}
                className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
            >
                ✗
            </button>
        </div>
    );
});

// مكون ArchiveTableRow - مع دمج IrAttach و SdAttach وعرض النشاط الموحد
const ArchiveTableRow = memo(({ 
    item, 
    isDeleting, 
    isRestoring, 
    isUpdatingAction,
    onRestore, 
    onDeleteClick,
    onUpdateAction,
    getDeptClass,
    getArchivedByClass,
    getStatusClass,
    getTypeClass,
    getDepartmentAbbr
}) => {
    const deptAbbr = getDepartmentAbbr(item.department);
    const isDeletingNow = isDeleting[item.irNo];
    const isRestoringNow = isRestoring[item.irNo];
    const [isEditingAction, setIsEditingAction] = useState(false);
    
    // دمج IrAttach و SdAttach في مصفوفة واحدة
    const allAttachments = [
        ...(item.tags?.engineer || []).map(tag => ({ type: 'ir', value: tag })),
        ...(item.tags?.sd || []).map(tag => ({ type: 'sd', value: tag }))
    ];

    const actionValue = item.action || "";

    const handleRestore = (e) => {
        e.stopPropagation();
        onRestore(item);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        onDeleteClick(item);
    };

    const handleEditAction = (e) => {
        e.stopPropagation();
        setIsEditingAction(true);
    };

    const handleSaveAction = (newAction) => {
        setIsEditingAction(false);
        onUpdateAction(item, newAction);
    };

    const handleCancelAction = () => {
        setIsEditingAction(false);
    };

    // تنسيق النشاط (من قام بالتحميل ومن قام بتغيير الـ Action)
    const renderActivity = () => {
        const activities = [];
        
        if (item.downloadedBy && item.downloadedAt) {
            activities.push(
                <div key="download" className="text-xs text-blue-600 mb-1">
                    <span className="font-medium">📥 Downloaded:</span> {item.downloadedBy} on {formatShortDate(item.downloadedAt)}
                </div>
            );
        }
        
        if (item.actionUpdatedBy && item.actionUpdatedAt) {
            activities.push(
                <div key="action" className="text-xs text-purple-600">
                    <span className="font-medium">✏️ Action changed:</span> {item.actionUpdatedBy} to {item.action} on {formatShortDate(item.actionUpdatedAt)}
                </div>
            );
        }
        
        if (activities.length === 0) {
            return <span className="text-xs text-gray-400">—</span>;
        }
        
        return <div className="space-y-1">{activities}</div>;
    };

    return (
        <tr className="border-b hover:bg-gray-50 transition-colors">
            {/* ID Column - الرقم الكامل مع نوع مختصر */}
            <td className="p-4 align-top">
                <div className="font-mono font-semibold text-gray-800">
                    {item.irNo || item.revNo || "N/A"}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                    {item.isRevision && (
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                            item.revisionType === "CPR_REVISION" || item.isCPRRevision
                            ? "bg-green-100 text-green-800" 
                            : "bg-amber-100 text-amber-800"
                        }`}>
                            {item.revisionType === "CPR_REVISION" ? "CPR REV" : "IR REV"}
                        </span>
                    )}
                    {!item.isRevision && item.requestType === "CPR" && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                            CPR
                        </span>
                    )}
                </div>
                {/* عرض القسم هنا بدلاً من عمود منفصل */}
                <div className="mt-2">
                    <span className={`px-2 py-1 text-xs font-medium ${getDeptClass(deptAbbr)}`}>
                        {deptAbbr}
                    </span>
                </div>
            </td>
            
            {/* Description Column */}
            <td className="p-4 align-top">
                <div className="text-gray-700 font-medium line-clamp-2">{item.desc || "No description"}</div>
                <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-1">
                    {item.location && <span>📍 {item.location}</span>}
                    {item.floor && item.location && " • "}
                    {item.floor && <span>🏢 {item.floor}</span>}
                </div>
                {/* تاريخ الأرشفة ضمن الوصف */}
                {item.archivedDate && (
                    <div className="text-xs text-gray-400 mt-1">
                        📁 Archived: {formatShortDate(item.archivedDate)}
                    </div>
                )}
            </td>
            
            {/* Type Column (مختصر) */}
            <td className="p-4 align-top">
                <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getTypeClass(item)}`}>
                    {item.isRevision 
                        ? (item.revisionType === "CPR_REVISION" ? "CPR REV" : "IR REV")
                        : (item.requestType === "CPR" ? "CPR" : "IR")
                    }
                </span>
                <div className="text-xs text-gray-500 mt-2">
                    👤 {item.user || "—"}
                </div>
            </td>

            {/* Action Column - مع إمكانية التعديل */}
            <td className="p-4 align-top">
                {isEditingAction ? (
                    <ActionEdit
                        value={actionValue}
                        onSave={handleSaveAction}
                        onCancel={handleCancelAction}
                    />
                ) : (
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                            actionValue === 'A' ? 'bg-green-600' :
                            actionValue === 'B' ? 'bg-blue-600' :
                            actionValue === 'C' ? 'bg-amber-600' :
                            'bg-red-600'
                        }`}>
                            {actionValue}
                        </span>
                        <button
                            onClick={handleEditAction}
                            disabled={isUpdatingAction}
                            className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                            title="Edit Action"
                        >
                            ✏️
                        </button>
                    </div>
                )}
            </td>
            
            {/* Attachments Column - موحد */}
            <td className="p-4 align-top">
                {allAttachments.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {allAttachments.map((attach, idx) => (
                            <span 
                                key={idx} 
                                className={`px-2 py-1 text-xs rounded-full ${
                                    attach.type === 'ir' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-green-100 text-green-800'
                                }`}
                                title={attach.type === 'ir' ? 'IR Attachment' : 'SD Attachment'}
                            >
                                {attach.type === 'ir' ? '📎' : '📌'} {attach.value}
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="text-xs text-gray-400">—</span>
                )}
            </td>
            
            {/* Activity Column - موحد (تحميل + تعديل action) */}
            <td className="p-4 align-top min-w-[150px]">
                {renderActivity()}
            </td>
            
            {/* Status Column */}
            <td className="p-4 align-top">
                <div className="space-y-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusClass(item)}`}>
                        {item.isDone ? (
                            <>
                                <span>✅</span> Completed
                            </>
                        ) : item.isRevision ? (
                            "🔄 Revision"
                        ) : (
                            "⏳ Pending"
                        )}
                    </span>
                </div>
            </td>
            
            {/* Actions Column (Restore/Delete) */}
            <td className="p-4 align-top">
                <div className="flex flex-col sm:flex-row gap-2 min-w-[160px]">
                    <button
                        onClick={handleRestore}
                        disabled={isRestoringNow || isDeletingNow}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 flex items-center justify-center gap-2 ${
                            isRestoringNow 
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        }`}
                        title="Restore from archive"
                    >
                        {isRestoringNow ? (
                            <>
                                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                <span>Restoring...</span>
                            </>
                        ) : (
                            <>
                                <span>↩️</span>
                                <span>Restore</span>
                            </>
                        )}
                    </button>
                    
                    <button
                        onClick={handleDeleteClick}
                        disabled={isDeletingNow || isRestoringNow}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 flex items-center justify-center gap-2 ${
                            isDeletingNow 
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                                : "bg-red-600 hover:bg-red-700 text-white shadow-sm"
                        }`}
                        title="Delete permanently"
                    >
                        {isDeletingNow ? (
                            <>
                                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                <span>Deleting...</span>
                            </>
                        ) : (
                            <>
                                <span>🗑️</span>
                                <span>Delete</span>
                            </>
                        )}
                    </button>
                </div>
            </td>
        </tr>
    );
}, (prevProps, nextProps) => {
    return prevProps.item.irNo === nextProps.item.irNo &&
           prevProps.isDeleting[prevProps.item.irNo] === nextProps.isDeleting[nextProps.item.irNo] &&
           prevProps.isRestoring[prevProps.item.irNo] === nextProps.isRestoring[nextProps.item.irNo] &&
           prevProps.isUpdatingAction === nextProps.isUpdatingAction;
});

// مكون ProjectSection (مع إزالة الأعمدة: Department, Archived By, Archived Date)
const ProjectSection = memo(({ 
    project, 
    items, 
    isDeleting,
    isRestoring,
    isUpdatingAction,
    onRestore,
    onDeleteClick,
    onUpdateAction,
    getDeptClass,
    getArchivedByClass,
    getStatusClass,
    getTypeClass,
    getDepartmentAbbr
}) => {
    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-200">
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-600 rounded-xl flex items-center justify-center text-2xl">
                            📌
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{project}</h2>
                            <p className="text-gray-300 text-sm">
                                {items.length} archived item{items.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 bg-gray-600 text-white rounded-full text-sm">
                            IRs: {items.filter(x => !x.isRevision && x.requestType !== "CPR").length}
                        </span>
                        <span className="px-3 py-1.5 bg-green-600 text-white rounded-full text-sm">
                            CPR: {items.filter(x => !x.isRevision && x.requestType === "CPR").length}
                        </span>
                        <span className="px-3 py-1.5 bg-purple-600 text-white rounded-full text-sm">
                            REVs: {items.filter(x => x.isRevision).length}
                        </span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 text-gray-700 border-b">
                            <th className="p-4 text-left font-semibold">ID / Dept</th>
                            <th className="p-4 text-left font-semibold">Description</th>
                            <th className="p-4 text-left font-semibold">Type / User</th>
                            <th className="p-4 text-left font-semibold">Action</th>
                            <th className="p-4 text-left font-semibold">Attachments</th>
                            <th className="p-4 text-left font-semibold">Activity</th>
                            <th className="p-4 text-left font-semibold">Status</th>
                            <th className="p-4 text-left font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <ArchiveTableRow
                                key={`${item.irNo}-${index}`}
                                item={item}
                                isDeleting={isDeleting}
                                isRestoring={isRestoring}
                                isUpdatingAction={isUpdatingAction[item.irNo]}
                                onRestore={onRestore}
                                onDeleteClick={onDeleteClick}
                                onUpdateAction={onUpdateAction}
                                getDeptClass={getDeptClass}
                                getArchivedByClass={getArchivedByClass}
                                getStatusClass={getStatusClass}
                                getTypeClass={getTypeClass}
                                getDepartmentAbbr={getDepartmentAbbr}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Project:</span>
                        <span>{project}</span>
                    </div>
                    <div className="flex gap-4">
                        <span>📦 Items: <span className="font-bold">{items.length}</span></span>
                        <span>✅ Completed: <span className="font-bold text-emerald-600">{items.filter(x => x.isDone).length}</span></span>
                        <span>⏳ Pending: <span className="font-bold text-amber-600">{items.filter(x => !x.isDone).length}</span></span>
                    </div>
                </div>
            </div>
        </div>
    );
});

// مكون StatsCards (بدون تغيير)
const StatsCards = memo(({ filteredItems, items }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-5 text-center border border-gray-100">
            <div className="text-3xl font-bold text-gray-800">{filteredItems.length}</div>
            <div className="text-sm text-gray-500 mt-1">Showing</div>
            <div className="text-xs text-gray-400 mt-1">of {items.length} total</div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 text-center border border-gray-100">
            <div className="text-3xl font-bold text-yellow-600">
                {filteredItems.filter(item => !item.isDone).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">Pending</div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 text-center border border-gray-100">
            <div className="text-3xl font-bold text-emerald-600">
                {filteredItems.filter(item => item.isDone).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">Completed</div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 text-center border border-gray-100">
            <div className="text-3xl font-bold text-blue-600">
                {filteredItems.filter(item => item.archivedBy === "dc").length}
            </div>
            <div className="text-sm text-gray-500 mt-1">Archived by DC</div>
        </div>
    </div>
));

// مكون SearchBar (بدون تغيير)
const SearchBar = memo(({ searchTerm, onSearchChange, onClear }) => {
    const [localSearch, setLocalSearch] = useState(searchTerm);
    const timeoutRef = useRef(null);

    const handleChange = (e) => {
        const value = e.target.value;
        setLocalSearch(value);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            onSearchChange(value);
        }, 500);
    };

    const handleClear = () => {
        setLocalSearch("");
        onClear();
    };

    return (
        <div className="bg-white rounded-xl shadow p-6 mb-6 border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        🔍 Search Archive
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by number, description, user, project..."
                            className="w-full p-3 pl-10 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            value={localSearch}
                            onChange={handleChange}
                            autoComplete="off"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    </div>
                </div>
                <button
                    onClick={handleClear}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition"
                >
                    Clear Search
                </button>
            </div>
            
            <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-xl">
                <p className="flex items-center gap-2">
                    <span>💡</span>
                    Tips: Search by number, project, user, or description
                </p>
            </div>
        </div>
    );
});

// مكون AdvancedFilters (مع إضافة فلتر Action)
const AdvancedFilters = memo(({ 
    filters, 
    onFilterChange, 
    onReset,
    projects,
    departments,
    archivedByOptions,
    actionFilter,
    onActionFilterChange,
    actionOptions
}) => {
    const handleFilterChange = (key, value) => {
        onFilterChange({ ...filters, [key]: value });
    };

    const hasActiveFilters = filters.project !== "all" || filters.type !== "all" || 
                            filters.status !== "all" || filters.department !== "all" || 
                            filters.archivedBy !== "all" || filters.dateRange !== "all" ||
                            actionFilter !== "all";

    return (
        <div className="bg-white rounded-xl shadow p-6 mb-6 border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span>🎯</span> Filters
                </h3>
                <button
                    onClick={onReset}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition"
                >
                    Reset All Filters
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <select
                        value={filters.project}
                        onChange={(e) => handleFilterChange("project", e.target.value)}
                        className="w-full p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                        onChange={(e) => handleFilterChange("type", e.target.value)}
                        className="w-full p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                        value={filters.dateRange}
                        onChange={(e) => handleFilterChange("dateRange", e.target.value)}
                        className="w-full p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                        value={filters.status}
                        onChange={(e) => handleFilterChange("status", e.target.value)}
                        className="w-full p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                        value={filters.department}
                        onChange={(e) => handleFilterChange("department", e.target.value)}
                        className="w-full p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                        value={filters.archivedBy}
                        onChange={(e) => handleFilterChange("archivedBy", e.target.value)}
                        className="w-full p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                        <option value="all">All</option>
                        {archivedByOptions.map(by => (
                            <option key={by} value={by}>{by === "dc" ? "📁 DC" : "👷 Engineer"}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                    <select
                        value={actionFilter}
                        onChange={(e) => onActionFilterChange(e.target.value)}
                        className="w-full p-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                        <option value="all">All Actions</option>
                        {actionOptions.map(action => (
                            <option key={action} value={action}>Action {action}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-gray-600">Active filters:</span>
                        {filters.project !== "all" && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                Project: {filters.project}
                            </span>
                        )}
                        {filters.type !== "all" && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                Type: {filters.type}
                            </span>
                        )}
                        {filters.status !== "all" && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                Status: {filters.status}
                            </span>
                        )}
                        {filters.department !== "all" && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                                Dept: {filters.department}
                            </span>
                        )}
                        {filters.archivedBy !== "all" && (
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                                Archived by: {filters.archivedBy}
                            </span>
                        )}
                        {filters.dateRange !== "all" && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                                Date: {filters.dateRange}
                            </span>
                        )}
                        {actionFilter !== "all" && (
                            <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded text-xs">
                                Action: {actionFilter}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

// مكون EmptyState (بدون تغيير)
const EmptyState = memo(({ isFiltered, onReset, onNavigate }) => (
    <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
        <div className="text-gray-300 text-7xl mb-6">
            {isFiltered ? "🔍" : "📁"}
        </div>
        <h3 className="text-2xl font-semibold text-gray-700 mb-3">
            {isFiltered ? "No Matching Items" : "Archive is Empty"}
        </h3>
        <p className="text-gray-500 text-lg mb-8">
            {isFiltered 
                ? "No archived items match your filters. Try adjusting your search criteria."
                : "No items have been archived yet. Archive items from the DC dashboard."}
        </p>
        {isFiltered ? (
            <button
                onClick={onReset}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition shadow-lg hover:shadow-xl"
            >
                Clear All Filters
            </button>
        ) : (
            <button
                onClick={onNavigate}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition shadow-lg hover:shadow-xl"
            >
                Go to DC Dashboard
            </button>
        )}
    </div>
));

// مكون LoadingScreen (بدون تغيير)
const LoadingScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-6"></div>
            <p className="text-2xl text-gray-600 font-medium">Loading Archive...</p>
            <p className="text-gray-400 mt-2">Please wait a moment</p>
        </div>
    </div>
);

// ==================== المكون الرئيسي ====================
export default function DcArchive() {
    const navigate = useNavigate();
    
    // State
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [restoring, setRestoring] = useState({});
    const [deleting, setDeleting] = useState({});
    const [updatingAction, setUpdatingAction] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [toast, setToast] = useState({ show: false, message: "", type: "" });
    
    // Pagination (client-side only)
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const pageSize = 50;
    
    // Filters
    const [filters, setFilters] = useState({
        project: "all",
        type: "all",
        status: "all",
        dateRange: "all",
        department: "all",
        archivedBy: "all"
    });
    const [actionFilter, setActionFilter] = useState("all");
    const actionOptions = ["A", "B", "C", "D"];

    // Refs
    const toastTimeoutRef = useRef(null);
    const lastItemRef = useRef(null);
    const observerRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    // Authentication check
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user || user.role !== "dc") {
            navigate("/login");
        }
    }, [navigate]);

    // Debounce search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
            setItems([]);
        }, 500);
        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [searchTerm]);

    // Load data when filters or search changes
    useEffect(() => {
        loadArchive(true);
    }, [filters, debouncedSearch, actionFilter]);

    // Cleanup toast timeout
    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        };
    }, []);

    // ===================== Toast Helper =====================
    const showToastMessage = useCallback((msg, type = "info") => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast({ show: true, message: msg, type });
        toastTimeoutRef.current = setTimeout(() => {
            setToast({ show: false, message: "", type: "" });
            toastTimeoutRef.current = null;
        }, 3000);
    }, []);

    const hideToast = useCallback(() => {
        setToast({ show: false, message: "", type: "" });
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }
    }, []);

    // ===================== Load Archive from /irs/all and /revs/all =====================
    const loadArchive = useCallback(async (reset = false) => {
        if (reset) {
            setLoading(true);
            setItems([]);
            setPage(1);
        } else {
            setLoadingMore(true);
        }

        try {
            const [irsRes, revsRes] = await Promise.all([
                fetch(`${API_URL}/irs/all`),
                fetch(`${API_URL}/revs/all`)
            ]);

            if (!irsRes.ok || !revsRes.ok) {
                throw new Error("Failed to load data");
            }

            const irsData = await irsRes.json();
            const revsData = await revsRes.json();

            const allItems = [
                ...(irsData.irs || []).map(item => ({ ...item, isRevision: false })),
                ...(revsData.revs || []).map(item => ({ ...item, isRevision: true }))
            ];

            // تطبيق الفلاتر الأساسية (isArchived == true)
            let filtered = allItems.filter(item => item.isArchived === true);

            if (filters.project !== "all") {
                filtered = filtered.filter(item => item.project === filters.project);
            }
            if (filters.type !== "all") {
                filtered = filtered.filter(item => {
                    if (filters.type === "ir") return !item.isRevision && item.requestType !== "CPR";
                    if (filters.type === "cpr") return !item.isRevision && item.requestType === "CPR";
                    if (filters.type === "revision") return item.isRevision;
                    return true;
                });
            }
            if (filters.status !== "all") {
                filtered = filtered.filter(item => {
                    if (filters.status === "pending") return !item.isDone;
                    if (filters.status === "completed") return item.isDone;
                    return true;
                });
            }
            if (filters.department !== "all") {
                filtered = filtered.filter(item => getDepartmentAbbr(item.department) === filters.department);
            }
            if (filters.archivedBy !== "all") {
                filtered = filtered.filter(item => item.archivedBy === filters.archivedBy);
            }
            if (filters.dateRange !== "all") {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
                const monthAgo = new Date(today); monthAgo.setMonth(today.getMonth() - 1);
                filtered = filtered.filter(item => {
                    const date = new Date(item.archivedAt || item.sentAt);
                    if (filters.dateRange === "today") return date >= today;
                    if (filters.dateRange === "week") return date >= weekAgo;
                    if (filters.dateRange === "month") return date >= monthAgo;
                    return true;
                });
            }
            if (actionFilter !== "all") {
                filtered = filtered.filter(item => (item.action || "A") === actionFilter);
            }
            if (debouncedSearch) {
                const term = debouncedSearch.toLowerCase();
                filtered = filtered.filter(item => 
                    (item.irNo?.toLowerCase().includes(term)) ||
                    (item.desc?.toLowerCase().includes(term)) ||
                    (item.project?.toLowerCase().includes(term)) ||
                    (item.user?.toLowerCase().includes(term))
                );
            }

            // ترتيب حسب التاريخ
            filtered.sort((a, b) => new Date(b.archivedAt || b.sentAt) - new Date(a.archivedAt || a.sentAt));

            // تطبيق Pagination محلي
            const start = (page - 1) * pageSize;
            const paginated = filtered.slice(0, start + pageSize);
            const hasMoreData = filtered.length > start + pageSize;

            const formatted = paginated.map(item => ({
                ...item,
                irNo: item.isRevision ? item.revNo || item.irNo : item.irNo,
                desc: item.isRevision ? item.revNote || item.desc : item.desc,
                archivedDate: item.archivedAt || "Unknown",
                requestType: item.requestType || (item.isRevision ? "REVISION" : "IR"),
                revisionType: item.revisionType || "IR_REVISION",
                parentRequestType: item.parentRequestType || "IR",
                downloadedBy: item.downloadedBy || "",
                downloadedAt: item.downloadedAt || "",
                userRevNumber: item.userRevNumber || item.revText,
                isCPRRevision: item.revisionType === "CPR_REVISION" || item.isCPRRevision,
                isIRRevision: item.revisionType === "IR_REVISION" || item.isIRRevision,
                departmentAbbr: getDepartmentAbbr(item.department),
                tags: item.tags || { engineer: [], sd: [] },
                action: item.action || "A",
                actionUpdatedBy: item.actionUpdatedBy || "",
                actionUpdatedAt: item.actionUpdatedAt || ""
            }));

            if (reset) {
                setItems(formatted);
            } else {
                setItems(prev => [...prev, ...formatted]);
            }

            setHasMore(hasMoreData);
            if (!reset) {
                setPage(prev => prev + 1);
            }
        } catch (err) {
            console.error("Error loading archive:", err);
            showToastMessage("❌ Failed to load archive", "error");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [filters, debouncedSearch, actionFilter, page, pageSize, showToastMessage]);

    // ===================== Intersection Observer for Infinite Scroll =====================
    useEffect(() => {
        if (loading || loadingMore || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    loadArchive(false);
                }
            },
            { threshold: 0.5, rootMargin: "100px" }
        );

        if (lastItemRef.current) {
            observer.observe(lastItemRef.current);
        }

        return () => {
            if (lastItemRef.current) {
                observer.unobserve(lastItemRef.current);
            }
        };
    }, [loading, loadingMore, hasMore, items.length]);

    // ===================== Style Helper Functions =====================
    const getStatusClass = useCallback((item) => {
        if (item.isDone) return "bg-emerald-100 text-emerald-800 border border-emerald-300";
        if (item.isRevision) return "bg-amber-100 text-amber-800 border border-amber-300";
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
    }, []);

    const getTypeClass = useCallback((item) => {
        if (item.isRevision) {
            if (item.revisionType === "CPR_REVISION" || item.isCPRRevision) {
                return "bg-green-100 text-green-800 border border-green-300";
            }
            return "bg-purple-100 text-purple-800 border border-purple-300";
        }
        if (item.requestType === "CPR") return "bg-green-100 text-green-800 border border-green-300";
        return "bg-blue-100 text-blue-800 border border-blue-300";
    }, []);

    const getDeptClass = useCallback((dept) => {
        const classes = {
            "ARCH": "bg-blue-100 text-blue-800",
            "ST": "bg-green-100 text-green-800",
            "ELECT": "bg-purple-100 text-purple-800",
            "MECH": "bg-amber-100 text-amber-800",
            "MEP": "bg-amber-100 text-amber-800",
            "SURV": "bg-indigo-100 text-indigo-800"
        };
        return classes[dept] || "bg-gray-100 text-gray-800";
    }, []);

    const getArchivedByClass = useCallback((archivedBy) => {
        if (archivedBy === "dc") return "bg-blue-100 text-blue-800";
        if (archivedBy === "engineer") return "bg-green-100 text-green-800";
        return "bg-gray-100 text-gray-800";
    }, []);

    // ===================== Get Filter Options =====================
    const projects = [...new Set(items.map(item => item.project).filter(Boolean))].sort();
    const departments = [...new Set(items.map(item => getDepartmentAbbr(item.department)).filter(Boolean))].sort();
    const archivedByOptions = [...new Set(items.map(item => item.archivedBy).filter(Boolean))].sort();

    // ===================== Action Handlers =====================
    const handleRestore = useCallback(async (item) => {
        if (!window.confirm(`Restore ${item.irNo} from archive?`)) return;
        setRestoring(prev => ({ ...prev, [item.irNo]: true }));
        try {
            const res = await fetch(`${API_URL}/unarchive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ irNo: item.irNo, role: "dc", isRevision: item.isRevision || false }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Restore failed");
            setItems(prev => prev.filter(x => x.irNo !== item.irNo));
            showToastMessage("✅ Item restored successfully!", "success");
        } catch (err) {
            console.error("Restore error:", err);
            showToastMessage("❌ Restore failed: " + err.message, "error");
        } finally {
            setRestoring(prev => ({ ...prev, [item.irNo]: false }));
        }
    }, [showToastMessage]);

    const handleDelete = useCallback(async (item) => {
        setDeleting(prev => ({ ...prev, [item.irNo]: true }));
        try {
            const isRevision = item.isRevision || false;
            const endpoint = isRevision ? `${API_URL}/revs/delete` : `${API_URL}/irs/delete`;
            const itemIdentifier = isRevision ? 'revNo' : 'irNo';
            const itemId = item[itemIdentifier] || item.irNo;
            const res = await fetch(endpoint, { 
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({ [itemIdentifier]: itemId, role: "dc" })
            });
            if (!res.ok) {
                let errorMessage = `Delete failed: ${res.status}`;
                try { const errorData = await res.json(); errorMessage = errorData.error || errorMessage; } catch {}
                throw new Error(errorMessage);
            }
            setItems(prev => prev.filter(x => x.irNo !== item.irNo));
            showToastMessage("🗑️ Item deleted permanently!", "success");
        } catch (err) {
            console.error("❌ Delete error:", err);
            showToastMessage(`❌ Delete failed: ${err.message}`, "error");
        } finally {
            setDeleting(prev => ({ ...prev, [item.irNo]: false }));
            setShowDeleteConfirm(null);
        }
    }, [showToastMessage]);

    // دالة تحديث Action باستخدام نقطة النهاية الجديدة مع إرسال اسم المستخدم
    const handleUpdateAction = useCallback(async (item, newAction) => {
        setUpdatingAction(prev => ({ ...prev, [item.irNo]: true }));
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const username = user.username || "unknown";
            const collection = item.isRevision ? "revs" : "irs";
            const res = await fetch(`${API_URL}/update-action`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo: item.irNo,
                    collection,
                    action: newAction,
                    updatedBy: username
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update action");
            
            // تحديث الحالة المحلية مع إضافة معلومات التحديث
            setItems(prev => prev.map(i => 
                i.irNo === item.irNo 
                    ? { 
                        ...i, 
                        action: newAction,
                        actionUpdatedBy: username,
                        actionUpdatedAt: new Date().toISOString()
                    } 
                    : i
            ));
            showToastMessage(`✅ Action updated to ${newAction}`, "success");
        } catch (err) {
            console.error("Update action error:", err);
            showToastMessage(`❌ Failed to update action: ${err.message}`, "error");
        } finally {
            setUpdatingAction(prev => ({ ...prev, [item.irNo]: false }));
        }
    }, [showToastMessage]);

    const handleFilterChange = useCallback((newFilters) => {
        setFilters(newFilters);
        setPage(1);
        setItems([]);
    }, []);

    const handleActionFilterChange = useCallback((value) => {
        setActionFilter(value);
        setPage(1);
        setItems([]);
    }, []);

    const resetAllFilters = useCallback(() => {
        setFilters({
            project: "all", type: "all", status: "all", dateRange: "all", department: "all", archivedBy: "all"
        });
        setActionFilter("all");
        setSearchTerm("");
        setPage(1);
        setItems([]);
        showToastMessage("Filters cleared", "info");
    }, [showToastMessage]);

    const handleRefresh = useCallback(() => {
        loadArchive(true);
        showToastMessage("Archive refreshed", "success");
    }, [loadArchive, showToastMessage]);

    // ===================== Calculate Stats =====================
    const stats = {
        total: items.length,
        irs: items.filter(item => !item.isRevision && item.requestType !== "CPR").length,
        cpr: items.filter(item => !item.isRevision && item.requestType === "CPR").length,
        revisions: items.filter(item => item.isRevision).length,
        completed: items.filter(item => item.isDone).length,
        pending: items.filter(item => !item.isDone).length,
        archivedByDC: items.filter(item => item.archivedBy === "dc").length,
        archivedByEngineer: items.filter(item => item.archivedBy === "engineer").length
    };

    // Main render
    if (loading && items.length === 0) return <LoadingScreen />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <ToastNotification toast={toast} onClose={hideToast} />
            
            <DeleteConfirmationModal
                show={showDeleteConfirm !== null}
                item={showDeleteConfirm?.item}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(null)}
                isDeleting={showDeleteConfirm ? deleting[showDeleteConfirm.item.irNo] : false}
            />
            
            <div className="mx-auto px-4 md:px-8 lg:px-20 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">📁 DC Archive</h1>
                        <p className="text-gray-600 text-lg">
                            Total Archived: <span className="font-bold text-blue-600">{items.length}</span>
                            <span className="mx-3 text-gray-400">•</span>
                            Showing: <span className="font-bold text-emerald-600">{items.length}</span>
                            <span className="mx-3 text-gray-400">•</span>
                            <button onClick={handleRefresh} className="text-blue-500 hover:text-blue-700 font-medium inline-flex items-center gap-1">🔄 Refresh</button>
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate("/dc")} className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition flex items-center gap-2 shadow-sm">← Back to Dashboard</button>
                        <div className="text-sm bg-white/90 px-4 py-2 rounded-full shadow">📋 Archive Management</div>
                    </div>
                </div>

                <StatsCards filteredItems={items} items={items} />
                
                <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} onClear={() => setSearchTerm("")} />
                
                <AdvancedFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onReset={resetAllFilters}
                    projects={projects}
                    departments={departments}
                    archivedByOptions={archivedByOptions}
                    actionFilter={actionFilter}
                    onActionFilterChange={handleActionFilterChange}
                    actionOptions={actionOptions}
                />

                {/* Main Content */}
                {items.length === 0 ? (
                    <EmptyState isFiltered={false} onReset={resetAllFilters} onNavigate={() => navigate("/dc")} />
                ) : (
                    <div className="space-y-8">
                        {Object.keys(items.reduce((acc, item) => {
                            const proj = item.project || "Unknown";
                            if (!acc[proj]) acc[proj] = [];
                            acc[proj].push(item);
                            return acc;
                        }, {})).sort().map((project) => (
                            <ProjectSection
                                key={project}
                                project={project}
                                items={items.filter(item => (item.project || "Unknown") === project)}
                                isDeleting={deleting}
                                isRestoring={restoring}
                                isUpdatingAction={updatingAction}
                                onRestore={handleRestore}
                                onDeleteClick={(item) => setShowDeleteConfirm({ item })}
                                onUpdateAction={handleUpdateAction}
                                getDeptClass={getDeptClass}
                                getArchivedByClass={getArchivedByClass}
                                getStatusClass={getStatusClass}
                                getTypeClass={getTypeClass}
                                getDepartmentAbbr={getDepartmentAbbr}
                            />
                        ))}
                    </div>
                )}

                {/* Loading More Indicator */}
                {loadingMore && (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p className="text-gray-600 mt-2">Loading more items...</p>
                    </div>
                )}

                {/* End of Records Message */}
                {!hasMore && items.length > 0 && (
                    <div className="text-center py-4 text-gray-500">🎉 You've reached the end of archive</div>
                )}

                {/* Archive Info */}
                {items.length > 0 && (
                    <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8">
                        <div className="flex items-start gap-4">
                            <div className="text-blue-500 text-3xl">ℹ️</div>
                            <div className="flex-1">
                                <h4 className="font-bold text-blue-800 text-xl mb-4">Archive Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white/80 backdrop-blur p-4 rounded-xl">
                                        <p className="text-blue-700 text-sm font-medium mb-2 flex items-center gap-2">📁 Archive Operations</p>
                                        <p className="text-blue-600 text-sm">
                                            • Archived items are moved here from main dashboard<br/>
                                            • Restore items back to main dashboard<br/>
                                            • Permanent delete removes items completely<br/>
                                            • Archived by DC or Engineers
                                        </p>
                                    </div>
                                    <div className="bg-white/80 backdrop-blur p-4 rounded-xl">
                                        <p className="text-emerald-700 text-sm font-medium mb-2 flex items-center gap-2">📊 Statistics</p>
                                        <p className="text-emerald-600 text-sm">
                                            • Total: {stats.total} items<br/>
                                            • IRs: {stats.irs}, CPRs: {stats.cpr}<br/>
                                            • Revisions: {stats.revisions}<br/>
                                            • Completed: {stats.completed}, Pending: {stats.pending}
                                        </p>
                                    </div>
                                    <div className="bg-white/80 backdrop-blur p-4 rounded-xl">
                                        <p className="text-purple-700 text-sm font-medium mb-2 flex items-center gap-2">⚡ Quick Tips</p>
                                        <p className="text-purple-600 text-sm">
                                            • Use filters to find specific items<br/>
                                            • Search by number or description<br/>
                                            • Restore items when needed<br/>
                                            • Permanent delete is irreversible
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Invisible element for intersection observer */}
            <div ref={lastItemRef} style={{ height: '10px' }} />

            {/* Footer */}
            <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm border-t mt-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <p>DC Archive • Total Archived: {items.length} • Showing: {items.length}</p>
                    <p className="flex items-center gap-2 mt-2 md:mt-0">🕒 Last Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>
        </div>
    );
}