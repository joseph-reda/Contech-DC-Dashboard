// src/components/admin/DataManagementTab.jsx
import { useEffect, useState } from "react";
import { API_URL } from "../../config";

export default function DataManagementTab() {
    const [loading, setLoading] = useState(true);
    const [refreshingData, setRefreshingData] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "" });
    const [activeSection, setActiveSection] = useState("location_rules");

    // Location Rules States
    const [locationRules, setLocationRules] = useState({});
    const [projects, setProjects] = useState({});
    const [selectedProject, setSelectedProject] = useState("");
    const [editingProjectRules, setEditingProjectRules] = useState({
        project: "",
        rules: []
    });
    const [newRule, setNewRule] = useState({
        pattern: "",
        type: "",
        floors: []
    });

    // General Descriptions States
    const [generalDescriptions, setGeneralDescriptions] = useState({});
    const [cprDescriptions, setCprDescriptions] = useState({});
    const [selectedDepartment, setSelectedDepartment] = useState("Architectural");
    const [descriptionType, setDescriptionType] = useState("regular");
    const [editingDescriptions, setEditingDescriptions] = useState({
        department: "Architectural",
        base: [],
        floors: [],
        type: "regular"
    });
    const [newDescription, setNewDescription] = useState({
        text: "",
        type: "base", // base or floor
        floor: ""
    });

    // Sheet Titles (Shop Drawing) States
    const [sheetTitles, setSheetTitles] = useState({});
    const [selectedSheetDept, setSelectedSheetDept] = useState("Architectural");
    const [editingSheets, setEditingSheets] = useState({
        department: "Architectural",
        sheets: []
    });
    const [newSheet, setNewSheet] = useState("");

    // Available departments
    const departments = [
        { value: "Architectural", label: "Architectural", color: "bg-blue-100 text-blue-800", icon: "🏛️" },
        { value: "Civil", label: "Civil", color: "bg-green-100 text-green-800", icon: "🏗️" },
        { value: "Electrical", label: "Electrical", color: "bg-purple-100 text-purple-800", icon: "⚡" },
        { value: "Mechanical", label: "Mechanical", color: "bg-amber-100 text-amber-800", icon: "🔧" },
        { value: "Survey", label: "Survey", color: "bg-indigo-100 text-indigo-800", icon: "📐" }
    ];

    // Common floors (fallback)
    const commonFloors = [
        "SOG",
        "1st Floor",
        "2nd Floor",
        "3rd Floor",
        "4th Floor",
        "Penthouse Floor",
        "Upper Roof",
        "Common area",
        "Common area walls",
        "Common area ceiling",
        "Stairs",
        "Services court",
        "Elevation",
        "Front Elevation",
        "Back Elevation",
        "Side Elevation",
        "Parapet of upper roof",
        "Public entrance"
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
        if (refreshingData) return;
        
        setLoading(true);
        setRefreshingData(true);
        try {
            await Promise.all([
                loadProjects(),
                loadLocationRules(),
                loadAllDescriptions(),
                loadAllSheetTitles()
            ]);
        } catch (error) {
            console.error("Failed to load data:", error);
            showToast("Failed to load data", "error");
        } finally {
            setLoading(false);
            setRefreshingData(false);
        }
    };

    const loadProjects = async () => {
        try {
            const res = await fetch(`${API_URL}/projects`);
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects || {});

                const projectNames = Object.keys(data.projects || {});
                if (projectNames.length > 0 && !selectedProject) {
                    setSelectedProject(projectNames[0]);
                }
            }
        } catch (error) {
            console.error("Failed to load projects:", error);
        }
    };

    const loadLocationRules = async () => {
        try {
            const res = await fetch(`${API_URL}/location-rules`);
            if (res.ok) {
                const data = await res.json();
                setLocationRules(data.location_rules || {});
            }
        } catch (error) {
            console.error("Failed to load location rules:", error);
        }
    };

    const loadAllDescriptions = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/general-descriptions`);
            if (res.ok) {
                const data = await res.json();
                console.log("📥 Loaded all descriptions:", data);

                setGeneralDescriptions(data.general_descriptions || {});
                setCprDescriptions(data.general_descriptions_cpr || {});

                const firstDept = departments[0].value;
                const deptData = data.general_descriptions?.[firstDept] || {};
                setEditingDescriptions({
                    department: firstDept,
                    base: deptData.base || [],
                    floors: deptData.floors || [],
                    type: "regular"
                });
                setSelectedDepartment(firstDept);
            }
        } catch (error) {
            console.error("Failed to load descriptions:", error);
            showToast("Failed to load descriptions", "error");
        }
    };

    const loadAllSheetTitles = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/sheet-titles`);
            if (res.ok) {
                const data = await res.json();
                setSheetTitles(data.sheet_titles || {});
                const firstDept = departments[0].value;
                const deptSheets = data.sheet_titles?.[firstDept] || [];
                setEditingSheets({
                    department: firstDept,
                    sheets: deptSheets
                });
                setSelectedSheetDept(firstDept);
            } else {
                // Mock data for development if endpoint not available
                const mock = {
                    Architectural: ["SUNSCREEN ELEVATION 1", "SUNSCREEN ELEVATION 2", "DETAILS"],
                    Civil: ["Foundation Plan", "Column Layout", "Beam Details"],
                    Electrical: ["Lighting Layout", "Power Layout"],
                    Mechanical: ["HVAC Layout", "Plumbing Layout"],
                    Survey: ["Topography", "Grid Lines"]
                };
                setSheetTitles(mock);
                setEditingSheets({ department: "Architectural", sheets: mock.Architectural });
            }
        } catch (error) {
            console.error("Failed to load sheet titles:", error);
            showToast("Failed to load sheet titles", "error");
        }
    };

    // Location Rules Functions
    const handleEditProjectRules = (projectName) => {
        const projectData = locationRules[projectName] || { rules: [] };
        setEditingProjectRules({
            project: projectName,
            rules: projectData.rules || []
        });
        showToast(`Loading rules for ${projectName}`, "info");
    };

    const handleAddNewRule = () => {
        if (!newRule.pattern.trim()) {
            showToast("Location pattern is required", "error");
            return;
        }
        const updatedRules = [...editingProjectRules.rules, { ...newRule }];
        setEditingProjectRules(prev => ({ ...prev, rules: updatedRules }));
        setNewRule({ pattern: "", type: "", floors: [] });
        showToast("Rule added", "success");
    };

    const handleRemoveRule = (index) => {
        const updatedRules = editingProjectRules.rules.filter((_, i) => i !== index);
        setEditingProjectRules(prev => ({ ...prev, rules: updatedRules }));
        showToast("Rule removed", "info");
    };

    const handleUpdateRule = (index, field, value) => {
        const updatedRules = [...editingProjectRules.rules];
        updatedRules[index] = { ...updatedRules[index], [field]: value };
        setEditingProjectRules(prev => ({ ...prev, rules: updatedRules }));
    };

    const handleSaveProjectRules = async () => {
        if (!editingProjectRules.project) {
            showToast("Project name is required", "error");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/location-rules`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project: editingProjectRules.project,
                    rules: editingProjectRules.rules
                })
            });
            if (res.ok) {
                showToast(`Rules for ${editingProjectRules.project} saved`, "success");
                await Promise.all([loadLocationRules(), loadProjects()]);
            } else {
                throw new Error("Failed to save location rules");
            }
        } catch (error) {
            console.error("Save location rules error:", error);
            showToast("Failed to save rules", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProjectRules = async (projectName) => {
        if (!window.confirm(`Are you sure you want to delete all rules for "${projectName}"?\nThis action cannot be undone.`)) {
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/location-rules`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ project: projectName, rules: [] })
            });
            if (res.ok) {
                showToast(`Rules for ${projectName} deleted`, "success");
                await loadLocationRules();
                if (editingProjectRules.project === projectName) {
                    setEditingProjectRules({ project: "", rules: [] });
                }
            }
        } catch (error) {
            console.error("Delete location rules error:", error);
            showToast("Failed to delete rules", "error");
        } finally {
            setSaving(false);
        }
    };

    // General Descriptions Functions
    const handleSelectDepartment = async (dept, type = "regular") => {
        setSelectedDepartment(dept);
        setDescriptionType(type);

        let descriptionsData = { base: [], floors: [] };
        if (type === "cpr") {
            descriptionsData = cprDescriptions.Civil || {};
        } else {
            descriptionsData = generalDescriptions[dept] || {};
        }

        setEditingDescriptions({
            department: dept,
            base: descriptionsData.base || [],
            floors: descriptionsData.floors || [],
            type: type
        });
        showToast(`Loaded descriptions for ${dept}`, "info");
    };

    const handleAddDescription = () => {
        if (!newDescription.text.trim()) {
            showToast("Description text is required", "error");
            return;
        }
        const updated = { ...editingDescriptions };
        if (newDescription.type === "base") {
            updated.base = [...updated.base, newDescription.text.trim()];
            showToast("Description added", "success");
        } else {
            if (!newDescription.floor.trim()) {
                showToast("Please select a floor", "error");
                return;
            }
            if (!updated.floors.includes(newDescription.floor)) {
                updated.floors = [...updated.floors, newDescription.floor];
                showToast("Floor added", "success");
            } else {
                showToast("Floor already exists", "info");
            }
        }
        setEditingDescriptions(updated);
        setNewDescription({ text: "", type: "base", floor: "" });
    };

    const handleRemoveBaseDescription = (index) => {
        const updated = editingDescriptions.base.filter((_, i) => i !== index);
        setEditingDescriptions(prev => ({ ...prev, base: updated }));
        showToast("Description removed", "info");
    };

    const handleRemoveFloor = (index) => {
        const updated = editingDescriptions.floors.filter((_, i) => i !== index);
        setEditingDescriptions(prev => ({ ...prev, floors: updated }));
        showToast("Floor removed", "info");
    };

    const handleUpdateBaseDescription = (index, newText) => {
        const updated = [...editingDescriptions.base];
        updated[index] = newText;
        setEditingDescriptions(prev => ({ ...prev, base: updated }));
    };

    const handleUpdateFloor = (index, newFloor) => {
        const updated = [...editingDescriptions.floors];
        updated[index] = newFloor;
        setEditingDescriptions(prev => ({ ...prev, floors: updated }));
    };

    const handleSaveDescriptions = async () => {
        if (!editingDescriptions.department) {
            showToast("Department is required", "error");
            return;
        }
        setSaving(true);
        try {
            const requestData = {
                department: editingDescriptions.department,
                descriptions: {
                    base: editingDescriptions.base.filter(item => item.trim() !== ""),
                    floors: editingDescriptions.floors.filter(item => item.trim() !== ""),
                },
                type: editingDescriptions.type
            };
            const res = await fetch(`${API_URL}/admin/general-descriptions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData)
            });
            if (res.ok) {
                showToast(`Descriptions for ${editingDescriptions.department} saved`, "success");
                await loadAllDescriptions();
            } else {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to save descriptions");
            }
        } catch (error) {
            console.error("Save descriptions error:", error);
            showToast(`Failed to save descriptions: ${error.message}`, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDepartmentDescriptions = async () => {
        if (!window.confirm(`Are you sure you want to delete all descriptions for "${editingDescriptions.department}"?\nThis action cannot be undone.`)) {
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/admin/general-descriptions/${editingDescriptions.department}`, {
                method: "DELETE"
            });
            if (res.ok) {
                showToast(`Descriptions for ${editingDescriptions.department} deleted`, "success");
                setEditingDescriptions(prev => ({ ...prev, base: [], floors: [] }));
                await loadAllDescriptions();
            }
        } catch (error) {
            console.error("Delete descriptions error:", error);
            showToast("Failed to delete descriptions", "error");
        } finally {
            setSaving(false);
        }
    };

    // Sheet Titles Functions
    const handleSelectSheetDept = (dept) => {
        setSelectedSheetDept(dept);
        const deptSheets = sheetTitles[dept] || [];
        setEditingSheets({ department: dept, sheets: deptSheets });
        showToast(`Loaded sheets for ${dept}`, "info");
    };

    const handleAddSheet = () => {
        if (!newSheet.trim()) {
            showToast("Sheet title is required", "error");
            return;
        }
        const updated = { ...editingSheets, sheets: [...editingSheets.sheets, newSheet.trim()] };
        setEditingSheets(updated);
        setNewSheet("");
        showToast("Sheet added", "success");
    };

    const handleRemoveSheet = (index) => {
        const updated = editingSheets.sheets.filter((_, i) => i !== index);
        setEditingSheets(prev => ({ ...prev, sheets: updated }));
        showToast("Sheet removed", "info");
    };

    const handleUpdateSheet = (index, newValue) => {
        const updated = [...editingSheets.sheets];
        updated[index] = newValue;
        setEditingSheets(prev => ({ ...prev, sheets: updated }));
    };

    const handleSaveSheets = async () => {
        if (!editingSheets.department) {
            showToast("Department is required", "error");
            return;
        }
        setSaving(true);
        try {
            // Assuming endpoint exists: POST /admin/sheet-titles
            const res = await fetch(`${API_URL}/admin/sheet-titles`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    department: editingSheets.department,
                    sheets: editingSheets.sheets.filter(s => s.trim() !== "")
                })
            });
            if (res.ok) {
                showToast(`Sheet titles for ${editingSheets.department} saved`, "success");
                await loadAllSheetTitles();
            } else {
                // Fallback to local update
                setSheetTitles(prev => ({
                    ...prev,
                    [editingSheets.department]: editingSheets.sheets
                }));
                showToast(`Sheet titles saved locally`, "success");
            }
        } catch (error) {
            console.error("Save sheets error:", error);
            showToast("Failed to save sheets", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDepartmentSheets = async () => {
        if (!window.confirm(`Are you sure you want to delete all sheets for "${editingSheets.department}"?\nThis action cannot be undone.`)) {
            return;
        }
        setSaving(true);
        try {
            // Assuming DELETE endpoint exists
            const res = await fetch(`${API_URL}/admin/sheet-titles/${editingSheets.department}`, {
                method: "DELETE"
            });
            if (res.ok) {
                showToast(`Sheets for ${editingSheets.department} deleted`, "success");
                setEditingSheets(prev => ({ ...prev, sheets: [] }));
                await loadAllSheetTitles();
            } else {
                // Local deletion
                setSheetTitles(prev => {
                    const newSheets = { ...prev };
                    delete newSheets[editingSheets.department];
                    return newSheets;
                });
                setEditingSheets(prev => ({ ...prev, sheets: [] }));
                showToast("Sheets deleted locally", "success");
            }
        } catch (error) {
            console.error("Delete sheets error:", error);
            showToast("Failed to delete sheets", "error");
        } finally {
            setSaving(false);
        }
    };

    // Export/Import Functions
    const exportLocationRules = () => {
        const dataStr = JSON.stringify(locationRules, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `location-rules-${new Date().toISOString().split('T')[0]}.json`);
        linkElement.click();
        showToast("Location rules exported", "success");
    };

    const exportDescriptions = () => {
        const data = {
            general_descriptions: generalDescriptions,
            general_descriptions_cpr: cprDescriptions,
            exported_at: new Date().toISOString()
        };
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `general-descriptions-${new Date().toISOString().split('T')[0]}.json`);
        linkElement.click();
        showToast("General descriptions exported", "success");
    };

    const exportSheets = () => {
        const dataStr = JSON.stringify(sheetTitles, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `sheet-titles-${new Date().toISOString().split('T')[0]}.json`);
        linkElement.click();
        showToast("Sheet titles exported", "success");
    };

    const handleImportData = (event, type) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (type === "location_rules") {
                    // TODO: implement import
                    showToast("Import not implemented yet", "info");
                } else if (type === "descriptions") {
                    showToast("Import not implemented yet", "info");
                } else if (type === "sheets") {
                    showToast("Import not implemented yet", "info");
                }
            } catch (error) {
                showToast("Invalid file", "error");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-top-5 ${toast.type === "error" ? "bg-red-600" : toast.type === "warning" ? "bg-amber-600" : "bg-green-600"}`}>
                    <div className="flex items-center gap-2">
                        {toast.type === "error" ? "❌" : toast.type === "warning" ? "⚠️" : "✅"}
                        {toast.message}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">🗃️ Data Management</h2>
                <p className="text-gray-600">Manage location rules, general descriptions, and sheet titles</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveSection("location_rules")}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${activeSection === "location_rules" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}
                >
                    📍 Location Rules
                </button>
                <button
                    onClick={() => setActiveSection("descriptions")}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${activeSection === "descriptions" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}
                >
                    📝 General Descriptions
                </button>
                <button
                    onClick={() => setActiveSection("sheets")}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${activeSection === "sheets" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}
                >
                    📄 Sheet Titles (Shop Drawing)
                </button>
                <button
                    onClick={() => setActiveSection("tools")}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${activeSection === "tools" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}
                >
                    🛠️ Data Tools
                </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
                {/* Location Rules Section */}
                {activeSection === "location_rules" && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-800">📋 Available Projects</h3>
                                <span className="text-sm text-gray-500">{Object.keys(locationRules).length} projects with rules</span>
                            </div>
                            {Object.keys(projects).length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No projects</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(projects).map(([projectName, projectData]) => {
                                        const rules = locationRules[projectName]?.rules || [];
                                        const hasRules = rules.length > 0;
                                        return (
                                            <div key={projectName} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${editingProjectRules.project === projectName ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h4 className="font-bold text-gray-800">{projectName}</h4>
                                                        {projectData.description && <p className="text-sm text-gray-600 mt-1">{projectData.description}</p>}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleEditProjectRules(projectName)} className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded" title="Edit rules">✏️</button>
                                                        {hasRules && <button onClick={() => handleDeleteProjectRules(projectName)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded" title="Delete all rules">🗑️</button>}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    <span>Rules: {rules.length}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {editingProjectRules.project && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-gray-800">✏️ Edit rules for: {editingProjectRules.project}</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingProjectRules({ project: "", rules: [] })} className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded">Cancel</button>
                                        <button onClick={handleSaveProjectRules} disabled={saving} className="px-4 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50">{saving ? "Saving..." : "💾 Save"}</button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                    <h4 className="font-medium text-gray-700 mb-3">➕ Add New Rule</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <input type="text" value={newRule.pattern} onChange={(e) => setNewRule(prev => ({ ...prev, pattern: e.target.value }))} className="px-3 py-2 border rounded-lg" placeholder="Pattern (e.g., A2-02-01)" />
                                        <input type="text" value={newRule.type} onChange={(e) => setNewRule(prev => ({ ...prev, type: e.target.value }))} className="px-3 py-2 border rounded-lg" placeholder="Type (e.g., Park-D)" />
                                        <button onClick={handleAddNewRule} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg">Add Rule</button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">You can add floors later by editing the rule.</p>
                                </div>

                                <div>
                                    <h4 className="font-medium text-gray-700 mb-3">📋 Rules ({editingProjectRules.rules.length})</h4>
                                    {editingProjectRules.rules.length === 0 ? (
                                        <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">No rules yet</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {editingProjectRules.rules.map((rule, index) => (
                                                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <input type="text" value={rule.pattern} onChange={(e) => handleUpdateRule(index, "pattern", e.target.value)} className="px-3 py-2 border rounded-lg" />
                                                            <input type="text" value={rule.type} onChange={(e) => handleUpdateRule(index, "type", e.target.value)} className="px-3 py-2 border rounded-lg" />
                                                        </div>
                                                        <button onClick={() => handleRemoveRule(index)} className="ml-3 p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded">🗑️</button>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-500 mb-1">Floors (comma separated)</label>
                                                        <input type="text" value={rule.floors?.join(", ") || ""} onChange={(e) => handleUpdateRule(index, "floors", e.target.value.split(",").map(f => f.trim()))} className="w-full px-3 py-2 border rounded-lg" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* General Descriptions Section */}
                {activeSection === "descriptions" && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">🏗️ Select Department</h3>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {departments.map((dept) => (
                                    <div key={dept.value} className="flex gap-2">
                                        <button onClick={() => handleSelectDepartment(dept.value, "regular")} className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${selectedDepartment === dept.value && descriptionType === "regular" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                                            <span>{dept.icon}</span> {dept.label}
                                        </button>
                                        {dept.value === "Civil" && (
                                            <button onClick={() => handleSelectDepartment(dept.value, "cpr")} className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${selectedDepartment === dept.value && descriptionType === "cpr" ? "bg-teal-600 text-white" : "bg-teal-100 text-teal-700 hover:bg-teal-200"}`} title="CPR descriptions">
                                                <span>🏗️</span> CPR
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">Department: <span className="font-medium">{selectedDepartment}</span> {descriptionType === "cpr" && "(CPR descriptions)"}</p>
                                <div className="flex gap-2">
                                    <button onClick={handleDeleteDepartmentDescriptions} disabled={saving || (!editingDescriptions.base.length && !editingDescriptions.floors.length)} className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg disabled:opacity-50">🗑️ Delete All</button>
                                    <button onClick={handleSaveDescriptions} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">{saving ? "Saving..." : "💾 Save"}</button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h4 className="font-medium text-gray-700 mb-4">➕ Add New Description</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <select value={newDescription.type} onChange={(e) => setNewDescription(prev => ({ ...prev, type: e.target.value }))} className="px-3 py-2 border rounded-lg">
                                    <option value="base">General (Base)</option>
                                    <option value="floor">Floor</option>
                                </select>
                                {newDescription.type === "floor" && (
                                    <select value={newDescription.floor} onChange={(e) => setNewDescription(prev => ({ ...prev, floor: e.target.value }))} className="px-3 py-2 border rounded-lg">
                                        <option value="">Select floor</option>
                                        {commonFloors.map(floor => <option key={floor} value={floor}>{floor}</option>)}
                                    </select>
                                )}
                                <div className="flex gap-2">
                                    <input type="text" value={newDescription.text} onChange={(e) => setNewDescription(prev => ({ ...prev, text: e.target.value }))} className="flex-1 px-3 py-2 border rounded-lg" placeholder="Description text" />
                                    <button onClick={handleAddDescription} disabled={!newDescription.text.trim() || (newDescription.type === "floor" && !newDescription.floor)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50">Add</button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h4 className="font-medium text-gray-700 mb-4">📝 General Descriptions ({editingDescriptions.base.length})</h4>
                            {editingDescriptions.base.length === 0 ? (
                                <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">No descriptions</div>
                            ) : (
                                <div className="space-y-3">
                                    {editingDescriptions.base.map((desc, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                                            <span className="text-gray-500">{index + 1}.</span>
                                            <input type="text" value={desc} onChange={(e) => handleUpdateBaseDescription(index, e.target.value)} className="flex-1 px-3 py-1 border rounded" />
                                            <button onClick={() => handleRemoveBaseDescription(index)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded">🗑️</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h4 className="font-medium text-gray-700 mb-4">🏢 Floors ({editingDescriptions.floors.length})</h4>
                            {editingDescriptions.floors.length === 0 ? (
                                <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">No floors</div>
                            ) : (
                                <div className="space-y-3">
                                    {editingDescriptions.floors.map((floor, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                                            <span className="text-gray-500">🏢</span>
                                            <input type="text" value={floor} onChange={(e) => handleUpdateFloor(index, e.target.value)} className="flex-1 px-3 py-1 border rounded" />
                                            <button onClick={() => handleRemoveFloor(index)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded">🗑️</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Sheet Titles Section */}
                {activeSection === "sheets" && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">📄 Sheet Titles for Shop Drawing</h3>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {departments.map(dept => (
                                    <button key={dept.value} onClick={() => handleSelectSheetDept(dept.value)} className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${selectedSheetDept === dept.value ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                                        <span>{dept.icon}</span> {dept.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-600">Department: <span className="font-medium">{selectedSheetDept}</span></p>
                                <div className="flex gap-2">
                                    <button onClick={handleDeleteDepartmentSheets} disabled={saving || editingSheets.sheets.length === 0} className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg disabled:opacity-50">🗑️ Delete All</button>
                                    <button onClick={handleSaveSheets} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">{saving ? "Saving..." : "💾 Save"}</button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h4 className="font-medium text-gray-700 mb-4">➕ Add New Sheet Title</h4>
                            <div className="flex gap-2">
                                <input type="text" value={newSheet} onChange={(e) => setNewSheet(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" placeholder="Enter sheet title (e.g., SUNSCREEN ELEVATION 1)" />
                                <button onClick={handleAddSheet} disabled={!newSheet.trim()} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50">Add</button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h4 className="font-medium text-gray-700 mb-4">📋 Sheet Titles ({editingSheets.sheets.length})</h4>
                            {editingSheets.sheets.length === 0 ? (
                                <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">No sheet titles</div>
                            ) : (
                                <div className="space-y-3">
                                    {editingSheets.sheets.map((sheet, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                                            <span className="text-gray-500">{index + 1}.</span>
                                            <input type="text" value={sheet} onChange={(e) => handleUpdateSheet(index, e.target.value)} className="flex-1 px-3 py-1 border rounded" />
                                            <button onClick={() => handleRemoveSheet(index)} className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded">🗑️</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tools Section */}
                {activeSection === "tools" && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">🛠️ Data Tools</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border rounded-lg p-4">
                                    <h4 className="font-medium text-gray-700 mb-3">📤 Export Data</h4>
                                    <div className="space-y-3">
                                        <button onClick={exportLocationRules} className="w-full px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium flex items-center justify-between">Export Location Rules <span>⬇️</span></button>
                                        <button onClick={exportDescriptions} className="w-full px-4 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium flex items-center justify-between">Export General Descriptions <span>⬇️</span></button>
                                        <button onClick={exportSheets} className="w-full px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium flex items-center justify-between">Export Sheet Titles <span>⬇️</span></button>
                                        <button onClick={() => {
                                            const allData = {
                                                location_rules: locationRules,
                                                general_descriptions: generalDescriptions,
                                                general_descriptions_cpr: cprDescriptions,
                                                sheet_titles: sheetTitles,
                                                exported_at: new Date().toISOString()
                                            };
                                            const dataStr = JSON.stringify(allData, null, 2);
                                            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
                                            const linkElement = document.createElement('a');
                                            linkElement.setAttribute('href', dataUri);
                                            linkElement.setAttribute('download', `full-data-backup-${new Date().toISOString().split('T')[0]}.json`);
                                            linkElement.click();
                                            showToast("Full backup exported", "success");
                                        }} className="w-full px-4 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium flex items-center justify-between">Export Full Backup <span>💾</span></button>
                                    </div>
                                </div>
                                <div className="border rounded-lg p-4">
                                    <h4 className="font-medium text-gray-700 mb-3">📥 Import Data</h4>
                                    <div className="space-y-3">
                                        <label className="block">
                                            <div className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium flex items-center justify-between cursor-pointer">Import Location Rules <span>⬆️</span></div>
                                            <input type="file" accept=".json" onChange={(e) => handleImportData(e, "location_rules")} className="hidden" />
                                        </label>
                                        <label className="block">
                                            <div className="px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium flex items-center justify-between cursor-pointer">Import General Descriptions <span>⬆️</span></div>
                                            <input type="file" accept=".json" onChange={(e) => handleImportData(e, "descriptions")} className="hidden" />
                                        </label>
                                        <label className="block">
                                            <div className="px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium flex items-center justify-between cursor-pointer">Import Sheet Titles <span>⬆️</span></div>
                                            <input type="file" accept=".json" onChange={(e) => handleImportData(e, "sheets")} className="hidden" />
                                        </label>
                                        <button onClick={loadAllData} className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-between">Reload Data <span>🔄</span></button>
                                    </div>
                                </div>
                            </div>

                            {/* Data Statistics */}
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <h4 className="font-medium text-gray-700 mb-4">📊 Data Statistics</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">{Object.keys(locationRules).length}</div>
                                        <div className="text-sm text-gray-600">Projects with rules</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">{Object.keys(generalDescriptions).length}</div>
                                        <div className="text-sm text-gray-600">Depts with descriptions</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600">{Object.keys(sheetTitles).length}</div>
                                        <div className="text-sm text-gray-600">Depts with sheet titles</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-amber-600">{Object.keys(projects).length}</div>
                                        <div className="text-sm text-gray-600">Total projects</div>
                                    </div>
                                </div>
                            </div>

                            {/* Data Cleanup */}
                            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">⚠️ Data Cleanup</h4>
                                <p className="text-sm text-red-600 mb-3">Dangerous actions that may lead to data loss. Use with caution.</p>
                                <div className="space-x-2">
                                    <button onClick={() => { if(window.confirm("Delete all location rules?")) showToast("Feature under development", "info"); }} className="px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded">Delete All Location Rules</button>
                                    <button onClick={() => { if(window.confirm("Delete all descriptions?")) showToast("Feature under development", "info"); }} className="px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded">Delete All Descriptions</button>
                                    <button onClick={() => { if(window.confirm("Delete all sheet titles?")) showToast("Feature under development", "info"); }} className="px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded">Delete All Sheet Titles</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}   