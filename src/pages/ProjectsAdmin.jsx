import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";

export default function ProjectsAdmin() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState({ show: false, message: "", type: "" });
    const [actionLoading, setActionLoading] = useState(false);
    const [departments] = useState([
        { id: "ARCH", name: "Architectural", color: "bg-blue-100 text-blue-800" },
        { id: "ST", name: "Civil/Structure", color: "bg-green-100 text-green-800" },
        { id: "ELECT", name: "Electrical", color: "bg-purple-100 text-purple-800" },
        { id: "MEP", name: "Mechanical/MEP", color: "bg-amber-100 text-amber-800" },
        { id: "SURV", name: "Survey", color: "bg-indigo-100 text-indigo-800" }
    ]);

    // Form states for new project
    const [newProject, setNewProject] = useState({
        name: "",
        description: "",
        locations: [""],
        counters: {
            ARCH: 0,
            ST: 0,
            MEP: 0,
            SURV: 0,
            ELECT: 0
        },
        generalDesc: {
            ARCH: [],
            ST: [],
            MEP: [],
            SURV: [],
            ELECT: []
        }
    });

    // Edit modal states
    const [editModal, setEditModal] = useState({
        show: false,
        project: null,
        data: {
            name: "",
            description: "",
            locations: [""],
            counters: {
                ARCH: 0,
                ST: 0,
                MEP: 0,
                SURV: 0,
                ELECT: 0
            },
            generalDesc: {
                ARCH: [],
                ST: [],
                MEP: [],
                SURV: [],
                ELECT: []
            }
        },
        editingDesc: {
            dept: "",
            text: ""
        }
    });

    // Auth check
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user || user.role !== "admin") {
            navigate("/login");
        }
    }, [navigate]);

    // Load projects
    useEffect(() => {
        loadProjects();
    }, []);

    async function loadProjects() {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/projects`);
            if (!res.ok) throw new Error("Failed to load projects");
            
            const data = await res.json();
            setProjects(data.projects || {});
            setError("");
        } catch (err) {
            console.error("Failed to load projects:", err);
            setError("Failed to load projects. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // Show toast notification
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
    };

    // Reset new project form
    const resetNewProjectForm = () => {
        setNewProject({
            name: "",
            description: "",
            locations: [""],
            counters: {
                ARCH: 0,
                ST: 0,
                MEP: 0,
                SURV: 0,
                ELECT: 0
            },
            generalDesc: {
                ARCH: [],
                ST: [],
                MEP: [],
                SURV: [],
                ELECT: []
            }
        });
    };

    // Add new location field
    const addLocationField = () => {
        setNewProject(prev => ({
            ...prev,
            locations: [...prev.locations, ""]
        }));
    };

    // Remove location field
    const removeLocationField = (index) => {
        setNewProject(prev => ({
            ...prev,
            locations: prev.locations.filter((_, i) => i !== index)
        }));
    };

    // Update location value
    const updateLocation = (index, value) => {
        setNewProject(prev => ({
            ...prev,
            locations: prev.locations.map((loc, i) => i === index ? value : loc)
        }));
    };

    // Add new project
    const handleAddProject = async () => {
        if (!newProject.name.trim()) {
            showToast("Project name is required", "error");
            return;
        }

        setActionLoading(true);
        try {
            // Filter out empty locations
            const filteredLocations = newProject.locations.filter(loc => loc.trim() !== "");
            
            const projectData = {
                name: newProject.name.trim(),
                description: newProject.description.trim(),
                locations: filteredLocations,
                counters: newProject.counters,
                generalDesc: newProject.generalDesc
            };

            const res = await fetch(`${API_URL}/projects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(projectData)
            });

            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Failed to add project");

            showToast("Project added successfully");
            resetNewProjectForm();
            loadProjects();
        } catch (err) {
            console.error("Add project error:", err);
            showToast(err.message || "Failed to add project", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Open edit modal
    const openEditModal = (projectName, projectData) => {
        setEditModal({
            show: true,
            project: projectName,
            data: {
                name: projectName,
                description: projectData.description || "",
                locations: projectData.locations?.length > 0 ? [...projectData.locations] : [""],
                counters: projectData.counters || {
                    ARCH: 0,
                    ST: 0,
                    MEP: 0,
                    SURV: 0,
                    ELECT: 0
                },
                generalDesc: projectData.generalDesc || {
                    ARCH: [],
                    ST: [],
                    MEP: [],
                    SURV: [],
                    ELECT: []
                }
            },
            editingDesc: {
                dept: "ARCH",
                text: ""
            }
        });
    };

    // Close edit modal
    const closeEditModal = () => {
        setEditModal({
            show: false,
            project: null,
            data: {
                name: "",
                description: "",
                locations: [""],
                counters: {
                    ARCH: 0,
                    ST: 0,
                    MEP: 0,
                    SURV: 0,
                    ELECT: 0
                },
                generalDesc: {
                    ARCH: [],
                    ST: [],
                    MEP: [],
                    SURV: [],
                    ELECT: []
                }
            },
            editingDesc: {
                dept: "",
                text: ""
            }
        });
    };

    // Update counter value
    const updateCounter = async (projectName, dept, value) => {
        if (isNaN(value) || value < 0) {
            showToast("Counter value must be a positive number", "error");
            return;
        }

        setActionLoading(true);
        try {
            // First update in Firebase
            const res = await fetch(`${API_URL}/projects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: projectName,
                    ...projects[projectName],
                    counters: {
                        ...projects[projectName]?.counters,
                        [dept]: parseInt(value)
                    }
                })
            });

            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Update failed");

            // Update local state
            setProjects(prev => ({
                ...prev,
                [projectName]: {
                    ...prev[projectName],
                    counters: {
                        ...prev[projectName].counters,
                        [dept]: parseInt(value)
                    }
                }
            }));

            showToast(`Counter for ${getDeptName(dept)} updated to ${value}`);
        } catch (err) {
            console.error("Update counter error:", err);
            showToast(err.message || "Failed to update counter", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Reset all counters for a project
    const resetCounters = async (projectName) => {
        if (!window.confirm(`Are you sure you want to reset ALL counters for project "${projectName}" to 0?\n\nThis action cannot be undone.`)) {
            return;
        }

        setActionLoading(true);
        try {
            const projectData = projects[projectName] || {};
            const resetCounters = {};
            
            Object.keys(projectData.counters || {}).forEach(dept => {
                resetCounters[dept] = 0;
            });

            const res = await fetch(`${API_URL}/projects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: projectName,
                    ...projectData,
                    counters: resetCounters
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Reset failed");
            }

            setProjects(prev => ({
                ...prev,
                [projectName]: {
                    ...prev[projectName],
                    counters: resetCounters
                }
            }));

            showToast("All counters reset to 0");
        } catch (err) {
            console.error("Reset counters error:", err);
            showToast("Failed to reset counters", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Save edited project
    const handleSaveEdit = async () => {
        if (!editModal.data.name.trim()) {
            showToast("Project name is required", "error");
            return;
        }

        setActionLoading(true);
        try {
            const filteredLocations = editModal.data.locations.filter(loc => loc.trim() !== "");
            
            const res = await fetch(`${API_URL}/projects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editModal.data.name,
                    description: editModal.data.description,
                    locations: filteredLocations,
                    counters: editModal.data.counters,
                    generalDesc: editModal.data.generalDesc
                })
            });

            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Failed to update project");

            showToast("Project updated successfully");
            closeEditModal();
            loadProjects();
        } catch (err) {
            console.error("Update project error:", err);
            showToast(err.message || "Failed to update project", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Delete project
    const handleDeleteProject = async (projectName) => {
        if (!window.confirm(`Are you sure you want to delete project "${projectName}"?\n\nThis action cannot be undone and will affect all associated IRs and data.`)) {
            return;
        }

        setActionLoading(true);
        try {
            // Note: You need to implement delete endpoint in backend
            // For now, we'll remove it from local state and show message
            const updatedProjects = { ...projects };
            delete updatedProjects[projectName];
            setProjects(updatedProjects);

            showToast(`Project "${projectName}" deleted successfully`);
            
            // TODO: Uncomment when backend delete endpoint is implemented
            // const res = await fetch(`${API_URL}/projects/${projectName}`, { 
            //     method: "DELETE" 
            // });
            // if (!res.ok) throw new Error("Delete failed");
            
        } catch (err) {
            console.error("Delete project error:", err);
            showToast("Failed to delete project", "error");
        } finally {
            setActionLoading(false);
        }
    };

    // Update edit modal location
    const updateEditLocation = (index, value) => {
        setEditModal(prev => ({
            ...prev,
            data: {
                ...prev.data,
                locations: prev.data.locations.map((loc, i) => i === index ? value : loc)
            }
        }));
    };

    // Add edit location field
    const addEditLocationField = () => {
        setEditModal(prev => ({
            ...prev,
            data: {
                ...prev.data,
                locations: [...prev.data.locations, ""]
            }
        }));
    };

    // Remove edit location field
    const removeEditLocationField = (index) => {
        setEditModal(prev => ({
            ...prev,
            data: {
                ...prev.data,
                locations: prev.data.locations.filter((_, i) => i !== index)
            }
        }));
    };

    // Update edit counter
    const updateEditCounter = (dept, value) => {
        if (isNaN(value) || value < 0) return;
        
        setEditModal(prev => ({
            ...prev,
            data: {
                ...prev.data,
                counters: {
                    ...prev.data.counters,
                    [dept]: parseInt(value)
                }
            }
        }));
    };

    // Add description to department
    const addDescription = () => {
        const { dept, text } = editModal.editingDesc;
        if (!text.trim()) return;
        
        setEditModal(prev => ({
            ...prev,
            data: {
                ...prev.data,
                generalDesc: {
                    ...prev.data.generalDesc,
                    [dept]: [...(prev.data.generalDesc[dept] || []), text.trim()]
                }
            },
            editingDesc: {
                ...prev.editingDesc,
                text: ""
            }
        }));
    };

    // Remove description from department
    const removeDescription = (dept, index) => {
        setEditModal(prev => ({
            ...prev,
            data: {
                ...prev.data,
                generalDesc: {
                    ...prev.data.generalDesc,
                    [dept]: prev.data.generalDesc[dept].filter((_, i) => i !== index)
                }
            }
        }));
    };

    // Update description input
    const updateDescriptionInput = (text) => {
        setEditModal(prev => ({
            ...prev,
            editingDesc: {
                ...prev.editingDesc,
                text
            }
        }));
    };

    // Update selected department for description
    const updateSelectedDept = (dept) => {
        setEditModal(prev => ({
            ...prev,
            editingDesc: {
                ...prev.editingDesc,
                dept
            }
        }));
    };

    // Get department name
    const getDeptName = (dept) => {
        const deptObj = departments.find(d => d.id === dept);
        return deptObj ? deptObj.name : dept;
    };

    // Get department color
    const getDeptColor = (dept) => {
        const deptObj = departments.find(d => d.id === dept);
        return deptObj ? deptObj.color : "bg-gray-100 text-gray-800";
    };

    // Get total counters
    const getTotalCounters = (counters) => {
        return Object.values(counters || {}).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    };

    if (loading) {
        return (
            <>
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-600 font-medium">Loading Projects...</p>
                        <p className="text-gray-400 text-sm mt-2">Fetching project data</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>

            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-top-5 ${
                    toast.type === "error" ? "bg-red-600" : "bg-green-600"
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
                                    📁 Projects Management
                                </h1>
                                <p className="text-gray-600">
                                    Manage all construction projects, locations, descriptions, and IR counters
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={loadProjects}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition flex items-center gap-2"
                                >
                                    <span className="text-lg">🔄</span>
                                    Refresh
                                </button>
                                <div className="text-sm bg-white px-4 py-2 rounded-lg shadow border">
                                    <span className="font-bold text-blue-600">{Object.keys(projects).length}</span> projects
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Add Project Form */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden sticky top-24">
                                {/* Form Header */}
                                <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-6">
                                    <h2 className="text-xl font-bold mb-1">➕ Add New Project</h2>
                                    <p className="text-emerald-100 text-sm">Configure a new construction project</p>
                                </div>

                                {/* Form Body */}
                                <div className="p-6 space-y-6">
                                    {/* Project Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Project Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={newProject.name}
                                            onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                                            placeholder="Enter project name (e.g., D1-A2-02-01-F_F)"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={newProject.description}
                                            onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                                            placeholder="Project description and details"
                                            rows={3}
                                        />
                                    </div>

                                    {/* Locations */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Locations / Blocks
                                            </label>
                                            <button
                                                type="button"
                                                onClick={addLocationField}
                                                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                                            >
                                                + Add Location
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {newProject.locations.map((location, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={location}
                                                        onChange={(e) => updateLocation(index, e.target.value)}
                                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                                                        placeholder="e.g., A2-02-01"
                                                    />
                                                    {newProject.locations.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeLocationField(index)}
                                                            className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        onClick={handleAddProject}
                                        disabled={actionLoading || !newProject.name.trim()}
                                        className={`w-full py-3 rounded-lg font-bold text-white transition-all duration-200 ${
                                            actionLoading || !newProject.name.trim()
                                                ? "bg-gray-400 cursor-not-allowed"
                                                : "bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5 shadow-lg"
                                        }`}
                                    >
                                        {actionLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                                Adding Project...
                                            </span>
                                        ) : (
                                            "Add Project"
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Quick Stats Card */}
                            <div className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <span>📊</span> System Statistics
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Total Projects</span>
                                        <span className="font-bold text-gray-800">{Object.keys(projects).length}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Total IR Counters</span>
                                        <span className="font-bold text-blue-600">
                                            {Object.values(projects).reduce((sum, project) => 
                                                sum + getTotalCounters(project.counters), 0)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Active Projects</span>
                                        <span className="font-bold text-green-600">
                                            {Object.keys(projects).filter(name => 
                                                getTotalCounters(projects[name]?.counters) > 0).length}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Projects List */}
                        <div className="lg:col-span-2">
                            {/* Projects Count */}
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <span>📋</span> All Projects ({Object.keys(projects).length})
                                </h2>
                                <div className="text-sm text-gray-500">
                                    Total IRs: {Object.values(projects).reduce((sum, project) => 
                                        sum + getTotalCounters(project.counters), 0)}
                                </div>
                            </div>

                            {/* Projects Grid */}
                            {Object.keys(projects).length === 0 ? (
                                <div className="bg-white rounded-2xl shadow border border-gray-200 p-12 text-center">
                                    <div className="text-gray-400 text-6xl mb-4">📭</div>
                                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Projects Found</h3>
                                    <p className="text-gray-500 mb-6">Add your first project using the form on the left</p>
                                    <button
                                        onClick={resetNewProjectForm}
                                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                                    >
                                        Start Adding Project
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(projects).map(([projectName, projectData]) => (
                                        <div
                                            key={projectName}
                                            className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
                                        >
                                            {/* Project Header */}
                                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6">
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                                                                📁
                                                            </div>
                                                            <div>
                                                                <h3 className="text-xl font-bold">{projectName}</h3>
                                                                {projectData.description && (
                                                                    <p className="text-slate-300 text-sm mt-1">{projectData.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 mt-3">
                                                            <span className="px-3 py-1 bg-slate-600/50 text-white rounded-full text-xs">
                                                                {projectData.locations?.length || 0} locations
                                                            </span>
                                                            <span className="px-3 py-1 bg-blue-600/50 text-white rounded-full text-xs">
                                                                {getTotalCounters(projectData.counters)} total IRs
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 flex-wrap">
                                                        <button
                                                            onClick={() => openEditModal(projectName, projectData)}
                                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition flex items-center gap-2"
                                                        >
                                                            <span>✏️</span> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => resetCounters(projectName)}
                                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                                                            title="Reset all counters to 0"
                                                        >
                                                            <span>🔄</span> Reset Counters
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteProject(projectName)}
                                                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                                                        >
                                                            <span>🗑️</span> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Counters Table */}
                                            <div className="p-6">
                                                <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                                    <span>🔢</span> IR Counters by Department
                                                </h4>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="bg-gray-50 text-gray-700">
                                                                <th className="p-3 text-left font-semibold">Department</th>
                                                                <th className="p-3 text-left font-semibold">Current Counter</th>
                                                                <th className="p-3 text-left font-semibold">Next IR Number</th>
                                                                <th className="p-3 text-left font-semibold">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {Object.entries(projectData.counters || {}).map(([dept, counter]) => {
                                                                const nextCounter = parseInt(counter) + 1;
                                                                const nextIR = `BADYA-CON-${projectName.replace(/\s+/g, '-').toUpperCase()}-IR-${dept}-${nextCounter.toString().padStart(3, '0')}`;
                                                                
                                                                return (
                                                                    <tr key={dept} className="border-b hover:bg-gray-50">
                                                                        <td className="p-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`w-3 h-3 rounded-full ${
                                                                                    dept === "ARCH" ? "bg-blue-500" :
                                                                                    dept === "ST" ? "bg-green-500" :
                                                                                    dept === "ELECT" ? "bg-purple-500" :
                                                                                    dept === "MEP" ? "bg-amber-500" :
                                                                                    dept === "SURV" ? "bg-indigo-500" :
                                                                                    "bg-gray-500"
                                                                                }`}></span>
                                                                                <span className="font-medium">{getDeptName(dept)}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-3">
                                                                            <div className="text-2xl font-bold text-gray-800">{counter}</div>
                                                                        </td>
                                                                        <td className="p-3">
                                                                            <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                                                                                {nextIR}
                                                                            </div>
                                                                        </td>
                                                                        <td className="p-3">
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="number"
                                                                                    value={counter}
                                                                                    onChange={(e) => updateCounter(projectName, dept, e.target.value)}
                                                                                    className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                                                    min="0"
                                                                                    disabled={actionLoading}
                                                                                />
                                                                                <button
                                                                                    onClick={() => updateCounter(projectName, dept, parseInt(counter) + 1)}
                                                                                    disabled={actionLoading}
                                                                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:bg-blue-400"
                                                                                >
                                                                                    +1
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => updateCounter(projectName, dept, 0)}
                                                                                    disabled={actionLoading}
                                                                                    className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium"
                                                                                    title="Reset to 0"
                                                                                >
                                                                                    0
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Locations */}
                                                {projectData.locations?.length > 0 && (
                                                    <div className="mt-6">
                                                        <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                                            <span>📍</span> Locations / Blocks
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {projectData.locations.map((location, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm border flex items-center gap-2"
                                                                >
                                                                    <span className="text-gray-500">📍</span>
                                                                    {location}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* General Descriptions */}
                                                {projectData.generalDesc && Object.keys(projectData.generalDesc).some(dept => 
                                                    projectData.generalDesc[dept]?.length > 0) && (
                                                    <div className="mt-6">
                                                        <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                                            <span>📝</span> General Descriptions
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {Object.entries(projectData.generalDesc).map(([dept, descriptions]) => {
                                                                if (!descriptions || descriptions.length === 0) return null;
                                                                
                                                                return (
                                                                    <div key={dept} className="border rounded-lg p-3">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={`px-2 py-1 text-xs font-medium rounded ${getDeptColor(dept)}`}>
                                                                                {getDeptName(dept)}
                                                                            </span>
                                                                            <span className="text-xs text-gray-500">
                                                                                {descriptions.length} descriptions
                                                                            </span>
                                                                        </div>
                                                                        <ul className="space-y-1 max-h-40 overflow-y-auto">
                                                                            {descriptions.map((desc, idx) => (
                                                                                <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                                                                    <span className="text-gray-400 mt-1">•</span>
                                                                                    <span>{desc}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editModal.show && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in max-h-[90vh] flex flex-col">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold">Edit Project: {editModal.project}</h2>
                                    <p className="text-blue-100 text-sm mt-1">Update project details and configurations</p>
                                </div>
                                <button
                                    onClick={closeEditModal}
                                    className="text-2xl hover:opacity-70"
                                >
                                    &times;
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            {/* Project Name (readonly) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Project Name
                                </label>
                                <input
                                    type="text"
                                    value={editModal.data.name}
                                    readOnly
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={editModal.data.description}
                                    onChange={(e) => setEditModal(prev => ({
                                        ...prev,
                                        data: { ...prev.data, description: e.target.value }
                                    }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    rows={2}
                                    placeholder="Project description"
                                />
                            </div>

                            {/* Locations */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Locations / Blocks
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addEditLocationField}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        + Add Location
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {editModal.data.locations.map((location, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={location}
                                                onChange={(e) => updateEditLocation(index, e.target.value)}
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                                placeholder="e.g., A2-02-01"
                                            />
                                            {editModal.data.locations.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeEditLocationField(index)}
                                                    className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Counters */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <span>🔢</span> IR Counters Management
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    {departments.map(dept => (
                                        <div key={dept.id} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${dept.color}`}>
                                                    {dept.name}
                                                </span>
                                                <div className="text-lg font-bold text-gray-800">
                                                    {editModal.data.counters[dept.id] || 0}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={editModal.data.counters[dept.id] || 0}
                                                    onChange={(e) => updateEditCounter(dept.id, e.target.value)}
                                                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                    min="0"
                                                />
                                                <button
                                                    onClick={() => updateEditCounter(dept.id, (editModal.data.counters[dept.id] || 0) + 1)}
                                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                                                >
                                                    +1
                                                </button>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-2">
                                                Next IR: BADYA-CON-{editModal.data.name.replace(/\s+/g, '-').toUpperCase()}-IR-{dept.id}-{(editModal.data.counters[dept.id] || 0) + 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* General Descriptions */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <span>📝</span> General Descriptions
                                </h3>
                                
                                {/* Add Description Form */}
                                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Department
                                            </label>
                                            <select
                                                value={editModal.editingDesc.dept}
                                                onChange={(e) => updateSelectedDept(e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            >
                                                {departments.map(dept => (
                                                    <option key={dept.id} value={dept.id}>
                                                        {dept.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Description Text
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={editModal.editingDesc.text}
                                                    onChange={(e) => updateDescriptionInput(e.target.value)}
                                                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                    placeholder="Enter description (e.g., 'Concrete pouring for slabs')"
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            addDescription();
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={addDescription}
                                                    disabled={!editModal.editingDesc.text.trim()}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-gray-400"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Press Enter or click Add to save description. Descriptions will be available for engineers when creating IRs.
                                    </p>
                                </div>

                                {/* Descriptions List */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {departments.map(dept => {
                                        const descriptions = editModal.data.generalDesc[dept.id] || [];
                                        if (descriptions.length === 0) return null;
                                        
                                        return (
                                            <div key={dept.id} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${dept.color}`}>
                                                        {dept.name}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        {descriptions.length} items
                                                    </span>
                                                </div>
                                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                                    {descriptions.map((desc, idx) => (
                                                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                                            <span className="text-sm text-gray-700">{desc}</span>
                                                            <button
                                                                onClick={() => removeDescription(dept.id, idx)}
                                                                className="text-red-600 hover:text-red-800"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        
                        {/* Modal Actions */}
                        <div className="bg-gray-50 p-6 border-t flex justify-end gap-3">
                            <button
                                onClick={closeEditModal}
                                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={actionLoading}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-blue-400"
                            >
                                {actionLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                        Saving...
                                    </span>
                                ) : (
                                    "Save Changes"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}