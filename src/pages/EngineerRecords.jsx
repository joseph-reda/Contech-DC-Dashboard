// src/pages/EngineerRecords.jsx - نسخة نهائية بدون عناصر مؤرشفة وبدون زر أرشفة
import { useEffect, useState, useCallback, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import {
  formatDate,
  formatShortDate,
  getDepartmentAbbr,
  getItemTypeText,
} from "../utils/formatters";

// ==================== المكونات المساعدة ====================

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
    <div
      className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-top-5 ${
        toast.type === "error"
          ? "bg-red-600"
          : toast.type === "warning"
            ? "bg-amber-600"
            : "bg-green-600"
      }`}
    >
      <div className="flex items-center gap-2">
        {toast.type === "error" ? "❌" : toast.type === "warning" ? "⚠️" : "✅"}
        {toast.message}
      </div>
    </div>
  );
});

// مكون Loading Screen
const LoadingScreen = memo(() => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600 font-medium">Loading Records...</p>
      <p className="text-gray-400 text-sm mt-2">Please wait a moment</p>
    </div>
  </div>
));

// مكون Stats Cards (بدون archived)
const StatsCards = memo(({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
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
));

// مكون Search And Filters (بدون خيار Archived في حالة Status)
const SearchAndFilters = memo(
  ({
    searchTerm,
    onSearchChange,
    onClearSearch,
    filters,
    onFilterChange,
    projects,
    users,
    onResetFilters,
    dateRange,
    onDateRangeChange,
    selectedUser,
    onUserChange,
    actionFilter,
    onActionChange,
    actionOptions,
  }) => {
    const hasActiveFilters =
      filters.project !== "all" ||
      filters.type !== "all" ||
      filters.status !== "all" ||
      searchTerm ||
      dateRange !== "all" ||
      selectedUser !== "all" ||
      actionFilter !== "all";

    return (
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🔍 Search Records
            </label>
            <input
              type="text"
              placeholder="Search by number, description, project, location..."
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              autoComplete="off"
            />
          </div>
          <button
            onClick={onClearSearch}
            className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
          >
            Clear Search
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              value={filters.project}
              onChange={(e) => onFilterChange("project", e.target.value)}
              className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => onFilterChange("type", e.target.value)}
              className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="ir">IR Only</option>
              <option value="cpr">CPR Only</option>
              <option value="revision">Revisions Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange("status", e.target.value)}
              className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => onUserChange(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              {users.map((user) => (
                <option key={user.username} value={user.username}>
                  {user.fullname || user.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => onActionChange(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  Action {action}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm text-gray-600 flex flex-wrap gap-2">
                <span className="font-medium">Active filters:</span>
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
                {dateRange !== "all" && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                    Date: {dateRange}
                  </span>
                )}
                {selectedUser !== "all" && (
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                    User: {selectedUser}
                  </span>
                )}
                {actionFilter !== "all" && (
                  <span className="px-2 py-1 bg-rose-100 text-rose-800 rounded text-xs">
                    Action: {actionFilter}
                  </span>
                )}
                {searchTerm && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                    Search: "{searchTerm}"
                  </span>
                )}
              </div>
              <button
                onClick={onResetFilters}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition"
              >
                🗑️ Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

// مكون Empty State
const EmptyState = memo(({ isFiltered, onReset, onNavigate, department }) => (
  <div className="bg-white rounded-2xl shadow-lg border p-12 text-center">
    <div className="text-gray-400 text-6xl mb-4">📭</div>
    <h3 className="text-xl font-semibold text-gray-700 mb-2">
      {isFiltered ? "No Matching Records" : "No Records Found"}
    </h3>
    <p className="text-gray-500 mb-6">
      {isFiltered
        ? "No records match your current filters. Try adjusting your search criteria."
        : `No records found for ${department} department.`}
    </p>
    {isFiltered ? (
      <button
        onClick={onReset}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
      >
        Reset Filters
      </button>
    ) : (
      <button
        onClick={onNavigate}
        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
      >
        Create New Request
      </button>
    )}
  </div>
));

// مكون صف الجدول - بدون زر أرشيف
const RecordRow = memo(
  ({ item, getStatusColor, getTypeColor, getStatusText, getItemTypeText }) => {
    const statusColor = getStatusColor(item);
    const typeColor = getTypeColor(item);
    const statusText = getStatusText(item);
    const typeText = getItemTypeText(item);

    // دمج IrAttach و SdAttach في مصفوفة واحدة
    const allAttachments = [
      ...(item.tags?.engineer || item.irAttach || []).map((tag) => ({
        type: "ir",
        value: tag,
      })),
      ...(item.tags?.sd || item.sdAttach || []).map((tag) => ({
        type: "sd",
        value: tag,
      })),
    ];

    // قيمة Action (تعامل مع القيم الفارغة)
    const getActionDisplay = (action) => {
      if (!action || action === "") {
        return { bg: "bg-gray-400", text: "⏳" };
      }
      switch (action) {
        case "A":
          return { bg: "bg-green-600", text: "A" };
        case "B":
          return { bg: "bg-blue-600", text: "B" };
        case "C":
          return { bg: "bg-amber-600", text: "C" };
        default:
          return { bg: "bg-red-600", text: action };
      }
    };

    const actionValue = item.action || "";
    const { bg: actionBg, text: actionText } = getActionDisplay(actionValue);

    return (
      <tr className="border-b hover:bg-gray-50 transition-colors">
        <td className="p-4">
          <div className="font-mono font-semibold text-gray-800">
            {item.displayNumber}
          </div>
          <div className="flex gap-1 mt-1">
            {item.isRevision && (
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                Revision
              </span>
            )}
          </div>
        </td>

        <td className="p-4">
          <div className="text-gray-700 font-medium line-clamp-2">
            {item.desc || item.revNote || "No description"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {item.location && <span>📍 {item.location}</span>}
            {item.floor && item.location && " • "}
            {item.floor && <span>🏢 {item.floor}</span>}
          </div>
        </td>

        <td className="p-4">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${typeColor}`}
          >
            {typeText}
          </span>
          <div className="text-xs text-gray-500 mt-1">
            👤 {item.user || "—"}
          </div>
        </td>

        <td className="p-4">
          <div className="font-medium text-gray-800">{item.project}</div>
        </td>

        {/* عمود Action */}
        <td className="p-4">
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${actionBg}`}
          >
            {actionText}
          </span>
        </td>

        {/* عمود Attachments الموحد */}
        <td className="p-4">
          {allAttachments.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {allAttachments.map((attach, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-1 text-xs rounded-full ${
                    attach.type === "ir"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}
                  title={
                    attach.type === "ir" ? "IR Attachment" : "SD Attachment"
                  }
                >
                  {attach.type === "ir" ? "📎" : "📌"} {attach.value}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>

        <td className="p-4">
          <div className="text-gray-600 whitespace-pre-line">
            {item.formattedDate}
          </div>
        </td>

        <td className="p-4">
          <div className="space-y-2">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${statusColor}`}
            >
              {item.isDone ? "✅" : "⏳"} {statusText}
            </span>

            {item.downloadedBy && (
              <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <span className="font-medium">📄 Downloaded by:</span>{" "}
                {item.downloadedBy}
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  },
);

// مكون الجدول الرئيسي
const RecordsTable = memo(
  ({
    records,
    filteredRecords,
    department,
    user,
    getStatusColor,
    getTypeColor,
    getStatusText,
    getItemTypeText,
    onResetFilters,
    onNavigate,
  }) => {
    if (filteredRecords.length === 0) {
      return (
        <EmptyState
          isFiltered={records.length > 0}
          onReset={onResetFilters}
          onNavigate={onNavigate}
          department={department}
        />
      );
    }

    return (
      <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {department} Department - All Records
              </h2>
              <p className="text-blue-100">
                Showing {filteredRecords.length} of {records.length} total
                records
              </p>
            </div>
            <div className="text-sm bg-white/20 px-3 py-1 rounded-full">
              {user?.username}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-gray-700 border-b">
                <th className="p-4 text-left font-semibold">ID / Number</th>
                <th className="p-4 text-left font-semibold">Description</th>
                <th className="p-4 text-left font-semibold">Type / User</th>
                <th className="p-4 text-left font-semibold">Project</th>
                <th className="p-4 text-left font-semibold">Action</th>
                <th className="p-4 text-left font-semibold">Attachments</th>
                <th className="p-4 text-left font-semibold">Date & Time</th>
                <th className="p-4 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((item) => (
                <RecordRow
                  key={
                    item.uniqueId ||
                    item.id ||
                    `${item.irNo || item.revNo}-${Math.random()}`
                  }
                  item={item}
                  getStatusColor={getStatusColor}
                  getTypeColor={getTypeColor}
                  getStatusText={getStatusText}
                  getItemTypeText={getItemTypeText}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-medium">{filteredRecords.length}</span> of{" "}
              <span className="font-medium">{records.length}</span> total
              records
            </div>
            <div className="text-sm text-gray-500">
              Last updated:{" "}
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

// ==================== المكون الرئيسي ====================
export default function EngineerRecords() {
  const navigate = useNavigate();

  // User info
  const [user, setUser] = useState(null);
  const [department, setDepartment] = useState("");
  const [departmentAbbr, setDepartmentAbbr] = useState("");

  // Data states
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    project: "all",
    type: "all",
    status: "all",
  });
  const [dateRange, setDateRange] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  // Filter options
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [actionOptions, setActionOptions] = useState(["", "A", "B", "C", "D"]);

  // Statistics (بدون archived)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    revisions: 0,
    cpr: 0,
    ir: 0,
  });

  // Refs
  const searchTimeoutRef = useRef(null);

  // ===================== Initial Load =====================
  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user") || "null");
    if (!savedUser || !savedUser.username) {
      navigate("/login");
      return;
    }

    setUser(savedUser);
    setDepartment(savedUser.department || "");
    setDepartmentAbbr(getDepartmentAbbr(savedUser.department || ""));
  }, [navigate]);

  // Load filter options when department is set
  useEffect(() => {
    if (department) {
      loadFilterOptions();
    }
  }, [department]);

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Load records when filters change
  useEffect(() => {
    if (department) {
      loadRecords();
    }
  }, [department, filters, debouncedSearch, dateRange, selectedUser, actionFilter]);

  // ===================== Toast Helper =====================
  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast({ show: false, message: "", type: "" });
  }, []);

  // ===================== Load Filter Options =====================
  const loadFilterOptions = async () => {
    try {
      const res = await fetch(
        `${API_URL}/engineer/filter-options?department=${encodeURIComponent(department)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error loading filter options:", error);
    }
  };

  // ===================== Load Records (غير مؤرشفة فقط) =====================
  const loadRecords = async () => {
    if (!department) return;

    setLoading(true);
    setError("");

    try {
      console.log("📡 Loading records for department:", department);

      const [irsRes, revsRes] = await Promise.all([
        fetch(`${API_URL}/irs`), // ملاحظة: /irs يجلب غير المؤرشف فقط (isArchived == false)
        fetch(`${API_URL}/revs`), // ملاحظة: /revs يجلب غير المؤرشف فقط
      ]);

      let irsList = [];
      if (irsRes.ok) {
        const data = await irsRes.json();
        irsList = (data.irs || []).filter(
          (ir) =>
            ir.department === department ||
            getDepartmentAbbr(ir.department) === departmentAbbr,
        );
        console.log(`✅ Loaded ${irsList.length} IRs`);
      }

      let revsList = [];
      if (revsRes.ok) {
        const data = await revsRes.json();
        revsList = (data.revs || []).filter(
          (rev) =>
            rev.department === department ||
            getDepartmentAbbr(rev.department) === departmentAbbr,
        );
        console.log(`✅ Loaded ${revsList.length} Revisions`);
      }

      const allRecords = [
        ...irsList.map((ir) => ({
          ...ir,
          uniqueId: ir.uniqueId || ir.id,
          isRevision: false,
          source: "irs",
          displayNumber: ir.irNo,
          itemType: ir.requestType === "CPR" ? "CPR" : "IR",
          formattedDate: formatDate(ir.sentAt || ir.createdAt),
          shortDate: formatShortDate(ir.sentAt || ir.createdAt),
          irAttach: ir.tags?.engineer || [],
          sdAttach: ir.tags?.sd || [],
          user: ir.user || "Unknown",
          date: new Date(ir.sentAt || ir.createdAt || 0),
          action: ir.action || "",
        })),
        ...revsList.map((rev) => ({
          ...rev,
          uniqueId: rev.uniqueId || rev.id,
          isRevision: true,
          source: "revs",
          displayNumber: rev.displayNumber || rev.revNo || rev.irNo,
          itemType: "REV",
          formattedDate: formatDate(rev.sentAt || rev.createdAt),
          shortDate: formatShortDate(rev.sentAt || rev.createdAt),
          irAttach: rev.tags?.engineer || [],
          sdAttach: rev.tags?.sd || [],
          user: rev.user || "Unknown",
          date: new Date(rev.sentAt || rev.createdAt || 0),
          action: rev.action || "",
        })),
      ];

      console.log(`📊 Total records: ${allRecords.length}`);

      allRecords.sort((a, b) => b.date - a.date);

      setRecords(allRecords);

      calculateStats(allRecords);

      const uniqueProjects = [
        ...new Set(allRecords.map((r) => r.project).filter(Boolean)),
      ].sort();
      setProjects(uniqueProjects);

      const uniqueUsers = [
        ...new Set(allRecords.map((r) => r.user).filter(Boolean)),
      ]
        .map((username) => ({
          username,
          fullname: username,
        }))
        .sort((a, b) => a.username.localeCompare(b.username));
      setUsers(uniqueUsers);

      showToast(`✅ Loaded ${allRecords.length} records`, "success");
    } catch (err) {
      console.error("Error loading records:", err);
      setError(err.message);
      showToast("❌ Failed to load records", "error");
    } finally {
      setLoading(false);
    }
  };

  // ===================== Calculate Statistics (بدون archived) =====================
  const calculateStats = (recordsList) => {
    const pending = recordsList.filter((r) => !r.isDone).length;
    const completed = recordsList.filter((r) => r.isDone).length;
    const revisions = recordsList.filter((r) => r.isRevision).length;
    const cpr = recordsList.filter(
      (r) => !r.isRevision && r.requestType === "CPR",
    ).length;
    const ir = recordsList.filter(
      (r) => !r.isRevision && r.requestType !== "CPR",
    ).length;

    setStats({
      total: recordsList.length,
      pending,
      completed,
      revisions,
      cpr,
      ir,
    });
  };

  // ===================== Filter Logic =====================
  const filteredRecords = useCallback(() => {
    if (!records || records.length === 0) {
      return [];
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(today.getMonth() - 1);
    const yearAgo = new Date(today);
    yearAgo.setFullYear(today.getFullYear() - 1);

    return records.filter((record) => {
      if (filters.project !== "all" && record.project !== filters.project)
        return false;

      if (filters.type !== "all") {
        if (
          filters.type === "ir" &&
          (record.isRevision || record.requestType === "CPR")
        )
          return false;
        if (
          filters.type === "cpr" &&
          !record.isCPR &&
          record.requestType !== "CPR"
        )
          return false;
        if (filters.type === "revision" && !record.isRevision) return false;
      }

      if (filters.status !== "all") {
        if (filters.status === "pending" && record.isDone) return false;
        if (filters.status === "completed" && !record.isDone) return false;
      }

      if (selectedUser !== "all" && record.user !== selectedUser) return false;

      if (actionFilter !== "all") {
        const val = record.action || "";
        if (val !== actionFilter) return false;
      }

      if (dateRange !== "all") {
        const recordDate = record.date;
        switch (dateRange) {
          case "today":
            if (recordDate < today) return false;
            break;
          case "week":
            if (recordDate < weekAgo) return false;
            break;
          case "month":
            if (recordDate < monthAgo) return false;
            break;
          case "year":
            if (recordDate < yearAgo) return false;
            break;
        }
      }

      if (debouncedSearch && debouncedSearch.trim() !== "") {
        const term = debouncedSearch.toLowerCase();
        const displayNumber = (record.displayNumber || "").toLowerCase();
        const desc = (record.desc || record.revNote || "").toLowerCase();
        const project = (record.project || "").toLowerCase();
        const location = (record.location || "").toLowerCase();
        const user = (record.user || "").toLowerCase();

        if (
          !displayNumber.includes(term) &&
          !desc.includes(term) &&
          !project.includes(term) &&
          !location.includes(term) &&
          !user.includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    records,
    filters,
    debouncedSearch,
    dateRange,
    selectedUser,
    actionFilter,
  ]);

  // ===================== Style Helper Functions =====================
  const getStatusColor = useCallback((item) => {
    if (item.isDone)
      return "bg-emerald-100 text-emerald-800 border border-emerald-300";
    return "bg-yellow-100 text-yellow-800 border border-yellow-300";
  }, []);

  const getTypeColor = useCallback((item) => {
    if (item.isRevision) {
      return item.revisionType === "CPR_REVISION"
        ? "bg-green-100 text-green-800 border border-green-300"
        : "bg-purple-100 text-purple-800 border border-purple-300";
    }
    return item.requestType === "CPR"
      ? "bg-green-100 text-green-800 border border-green-300"
      : "bg-blue-100 text-blue-800 border border-blue-300";
  }, []);

  const getStatusText = useCallback((item) => {
    return item.isDone ? "Done" : "Pending";
  }, []);

  // ===================== Event Handlers =====================
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleDateRangeChange = useCallback((value) => {
    setDateRange(value);
  }, []);

  const handleUserChange = useCallback((value) => {
    setSelectedUser(value);
  }, []);

  const handleActionChange = useCallback((value) => {
    setActionFilter(value);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      project: "all",
      type: "all",
      status: "all",
    });
    setDateRange("all");
    setSelectedUser("all");
    setActionFilter("all");
    setSearchTerm("");
    showToast("Filters cleared", "info");
  }, [showToast]);

  const handleRefresh = useCallback(() => {
    loadRecords();
    showToast("Data refreshed", "success");
  }, [loadRecords, showToast]);

  const handleNavigateToCreate = useCallback(() => {
    navigate("/engineer");
  }, [navigate]);

  // Main render
  if (!user) {
    return <LoadingScreen />;
  }

  if (loading && records.length === 0) {
    return <LoadingScreen />;
  }

  const filteredList = filteredRecords();

  console.log("📊 Render stats:", {
    totalRecords: records.length,
    filteredCount: filteredList.length,
    stats,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <ToastNotification toast={toast} onClose={hideToast} />

      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
              📋 Department Records
            </h1>
            <p className="text-gray-600 mt-2">
              Department:{" "}
              <span className="font-semibold text-blue-600">{department}</span>
              <span className="mx-2">•</span>
              User:{" "}
              <span className="font-semibold text-blue-600">
                {user?.username}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              <span className={loading ? "animate-spin" : ""}>🔄</span>
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={handleNavigateToCreate}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition flex items-center gap-2"
            >
              ← Back to Create
            </button>
          </div>
        </div>

        {/* Error Message */}
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

        <StatsCards stats={stats} />

        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          onClearSearch={handleClearSearch}
          filters={filters}
          onFilterChange={handleFilterChange}
          projects={projects}
          users={users}
          onResetFilters={handleResetFilters}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          selectedUser={selectedUser}
          onUserChange={handleUserChange}
          actionFilter={actionFilter}
          onActionChange={handleActionChange}
          actionOptions={actionOptions}
        />

        <RecordsTable
          records={records}
          filteredRecords={filteredList}
          department={department}
          user={user}
          getStatusColor={getStatusColor}
          getTypeColor={getTypeColor}
          getStatusText={getStatusText}
          getItemTypeText={getItemTypeText}
          onResetFilters={handleResetFilters}
          onNavigate={handleNavigateToCreate}
        />

        {/* Information Footer */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 text-center text-blue-700">
          <p>
            Showing all records for {department} department • Active only
          </p>
        </div>
      </div>
    </div>
  );
}