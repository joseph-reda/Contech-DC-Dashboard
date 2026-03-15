// src/pages/DCShopDrawingsPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";

export default function DCShopDrawingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shopDrawings, setShopDrawings] = useState([]);
  const [filteredSD, setFilteredSD] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projects, setProjects] = useState([]);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [actionLoading, setActionLoading] = useState(false);

  // التحقق من صلاحية المستخدم
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    if (!storedUser) {
      navigate("/login");
      return;
    }
    if (storedUser.role !== "dc" && storedUser.role !== "admin") {
      if (storedUser.role === "engineer") navigate("/engineer");
      else navigate("/");
      return;
    }
    setUser(storedUser);
    loadData();
  }, [navigate]);

  // تحميل البيانات
  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadShopDrawings(), loadProjects()]);
    } catch (error) {
      console.error("Error loading data:", error);
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadShopDrawings = async () => {
    try {
      const res = await fetch(`${API_URL}/shopdrawings/all`);
      if (res.ok) {
        const data = await res.json();
        setShopDrawings(data.shopdrawings || []);
        setFilteredSD(data.shopdrawings || []);
      }
    } catch (error) {
      console.error("Error loading shop drawings:", error);
      showToast("Failed to load shop drawings", "error");
    }
  };

  const loadProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(Object.keys(data.projects || {}).sort());
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  // فلترة البيانات
  useEffect(() => {
    let filtered = [...shopDrawings];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(sd =>
        sd.sdNo?.toLowerCase().includes(term) ||
        sd.subject?.toLowerCase().includes(term) ||
        sd.project?.toLowerCase().includes(term) ||
        sd.user?.toLowerCase().includes(term)
      );
    }
    
    if (projectFilter !== "all") {
      filtered = filtered.filter(sd => sd.project === projectFilter);
    }
    
    if (deptFilter !== "all") {
      filtered = filtered.filter(sd =>
        sd.department === deptFilter || sd.deptAbbr === deptFilter
      );
    }
    
    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        filtered = filtered.filter(sd => !sd.isDone && !sd.isArchived);
      } else if (statusFilter === "completed") {
        filtered = filtered.filter(sd => sd.isDone && !sd.isArchived);
      } else if (statusFilter === "archived") {
        filtered = filtered.filter(sd => sd.isArchived);
      }
    }
    
    setFilteredSD(filtered);
  }, [searchTerm, projectFilter, deptFilter, statusFilter, shopDrawings]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Copied: ${text}`, "success");
    }).catch(() => {
      showToast("Failed to copy", "error");
    });
  };

  const handleDownloadWord = async (sd) => {
    try {
      const res = await fetch(`${API_URL}/shopdrawings/generate-word`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uniqueId: sd.uniqueId || sd.id,
          downloadedBy: user?.username || "dc"
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sd.sdNo || 'shopdrawing'}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast("Document downloaded", "success");
        
        if (!sd.isDone && !sd.isArchived) {
          await markAsDone(sd);
        } else {
          loadShopDrawings();
        }
      } else {
        throw new Error("Failed to generate word document");
      }
    } catch (error) {
      console.error("Download error:", error);
      showToast("Failed to download document", "error");
    }
  };

  const markAsDone = async (sd) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/shopdrawings/mark-done`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uniqueId: sd.uniqueId || sd.id,
          downloadedBy: user?.username
        })
      });
      if (res.ok) {
        showToast("Marked as done", "success");
        await loadShopDrawings();
      } else {
        throw new Error("Failed to mark as done");
      }
    } catch (error) {
      console.error("Mark done error:", error);
      showToast("Failed to mark as done", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async (sd) => {
    if (!window.confirm(`Archive ${sd.sdNo}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uniqueId: sd.uniqueId || sd.id,
          role: "dc",
          collection: "shopdrawings"
        })
      });
      if (res.ok) {
        showToast("Archived successfully", "success");
        await loadShopDrawings();
      } else {
        throw new Error("Archive failed");
      }
    } catch (error) {
      console.error("Archive error:", error);
      showToast("Archive failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnarchive = async (sd) => {
    if (!window.confirm(`Restore ${sd.sdNo}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/unarchive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uniqueId: sd.uniqueId || sd.id,
          collection: "shopdrawings"
        })
      });
      if (res.ok) {
        showToast("Restored successfully", "success");
        await loadShopDrawings();
      } else {
        throw new Error("Restore failed");
      }
    } catch (error) {
      console.error("Unarchive error:", error);
      showToast("Restore failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (sd) => {
    if (!window.confirm(`Permanently delete ${sd.sdNo}?\nThis cannot be undone.`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/shopdrawings/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uniqueId: sd.uniqueId || sd.id
        })
      });
      if (res.ok) {
        showToast("Deleted successfully", "success");
        await loadShopDrawings();
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Delete failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateAction = async (sd, newAction) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/update-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uniqueId: sd.uniqueId || sd.id,
          collection: "shopdrawings",
          action: newAction,
          updatedBy: user?.username
        })
      });
      if (res.ok) {
        showToast(`Action updated to ${newAction}`, "success");
        await loadShopDrawings();
      } else {
        throw new Error("Update action failed");
      }
    } catch (error) {
      console.error("Update action error:", error);
      showToast("Failed to update action", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const departments = [
    { value: "ARCH", label: "Architectural" },
    { value: "ST", label: "Structural" },
    { value: "ELECT", label: "Electrical" },
    { value: "MECH", label: "Mechanical" },
    { value: "SURV", label: "Survey" }
  ];

  const getStatusInfo = (sd) => {
    if (sd.isArchived) return { label: "Archived", color: "bg-gray-100 text-gray-800", icon: "🗄️" };
    if (sd.isDone) return { label: "Completed", color: "bg-green-100 text-green-800", icon: "✅" };
    return { label: "Pending", color: "bg-amber-100 text-amber-800", icon: "⏳" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading shop drawings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium ${
          toast.type === "error" ? "bg-red-600" : "bg-green-600"
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === "error" ? "❌" : "✅"} {toast.message}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-purple-600 mb-2">📐 Shop Drawings Management</h1>
            <p className="text-gray-600">View, download, archive, and manage all shop drawing requests</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={actionLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <span className={actionLoading ? "animate-spin" : ""}>🔄</span>
              Refresh
            </button>
            <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-lg">
              Total: {shopDrawings.length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">🔍 Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by number, subject, project..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">📁 Project</label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">All Projects</option>
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">🏗️ Department</label>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">All Departments</option>
                {departments.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">📊 Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          {(searchTerm || projectFilter !== "all" || deptFilter !== "all" || statusFilter !== "all") && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchTerm && <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Search: {searchTerm} <button onClick={() => setSearchTerm("")}>×</button></span>}
              {projectFilter !== "all" && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Project: {projectFilter} <button onClick={() => setProjectFilter("all")}>×</button></span>}
              {deptFilter !== "all" && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Dept: {deptFilter} <button onClick={() => setDeptFilter("all")}>×</button></span>}
              {statusFilter !== "all" && <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">Status: {statusFilter} <button onClick={() => setStatusFilter("all")}>×</button></span>}
              <button onClick={() => { setSearchTerm(""); setProjectFilter("all"); setDeptFilter("all"); setStatusFilter("all"); }} className="text-sm text-purple-600 hover:text-purple-800">Clear All</button>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-800">{shopDrawings.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-amber-800">{shopDrawings.filter(sd => !sd.isDone && !sd.isArchived).length}</div>
            <div className="text-sm text-amber-600">Pending</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-800">{shopDrawings.filter(sd => sd.isDone && !sd.isArchived).length}</div>
            <div className="text-sm text-green-600">Completed</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-800">{shopDrawings.filter(sd => sd.isArchived).length}</div>
            <div className="text-sm text-gray-600">Archived</div>
          </div>
        </div>

        {/* Shop Drawings Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredSD.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No shop drawings found</h3>
              <button onClick={loadData} className="px-4 py-2 bg-purple-600 text-white rounded-lg">Refresh</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4 text-left font-semibold">SD No.</th>
                    <th className="p-4 text-left font-semibold">Project</th>
                    <th className="p-4 text-left font-semibold">Dept</th>
                    <th className="p-4 text-left font-semibold">Subject</th>
                    <th className="p-4 text-left font-semibold">Type</th>
                    <th className="p-4 text-left font-semibold">Level</th> {/* ← Level column added */}
                    <th className="p-4 text-left font-semibold">Sheets</th>
                    <th className="p-4 text-left font-semibold">User</th>
                    <th className="p-4 text-left font-semibold">Date</th>
                    <th className="p-4 text-left font-semibold">Status</th>
                    <th className="p-4 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSD.map((sd) => {
                    const status = getStatusInfo(sd);
                    return (
                      <tr key={sd.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-mono font-bold">{sd.sdNo}</td>
                        <td className="p-4">{sd.project}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            sd.deptAbbr === "ARCH" ? "bg-blue-100 text-blue-800" :
                            sd.deptAbbr === "ST" ? "bg-green-100 text-green-800" :
                            sd.deptAbbr === "ELECT" ? "bg-purple-100 text-purple-800" :
                            sd.deptAbbr === "MECH" ? "bg-amber-100 text-amber-800" :
                            "bg-indigo-100 text-indigo-800"
                          }`}>
                            {sd.deptAbbr}
                          </span>
                        </td>
                        <td className="p-4 max-w-xs truncate">{sd.subject}</td>
                        <td className="p-4">{sd.type || "—"}</td>
                        <td className="p-4">{sd.level || "—"}</td> {/* ← Level data displayed */}
                        <td className="p-4">{sd.sheets?.length || 0}</td>
                        <td className="p-4">{sd.user}</td>
                        <td className="p-4 text-sm">
                          {new Date(sd.sentAt || sd.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.icon} {status.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => handleDownloadWord(sd)}
                              disabled={actionLoading}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded"
                              title="Download Word"
                            >
                              📄
                            </button>
                            <button
                              onClick={() => copyToClipboard(sd.sdNo)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                              title="Copy SD Number"
                            >
                              📋
                            </button>
                            {!sd.isArchived ? (
                              <button
                                onClick={() => handleArchive(sd)}
                                disabled={actionLoading}
                                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                                title="Archive"
                              >
                                🗄️
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnarchive(sd)}
                                disabled={actionLoading}
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                                title="Restore"
                              >
                                ↩️
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(sd)}
                              disabled={actionLoading}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                              title="Delete"
                            >
                              🗑️
                            </button>
                            {!sd.isArchived && (
                              <select
                                onChange={(e) => handleUpdateAction(sd, e.target.value)}
                                defaultValue=""
                                className="text-xs border rounded p-1"
                              >
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
          {filteredSD.length > 0 && (
            <div className="bg-gray-50 px-4 py-3 border-t">
              <div className="text-sm text-gray-600">
                Showing {filteredSD.length} of {shopDrawings.length} items
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}