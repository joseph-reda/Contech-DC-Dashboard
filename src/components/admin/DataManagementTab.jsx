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

    // Available departments
    const departments = [
        { value: "Architectural", label: "معماري", color: "bg-blue-100 text-blue-800", icon: "🏛️" },
        { value: "Civil", label: "إنشائي", color: "bg-green-100 text-green-800", icon: "🏗️" },
        { value: "Electrical", label: "كهرباء", color: "bg-purple-100 text-purple-800", icon: "⚡" },
        { value: "Mechanical", label: "ميكانيكا", color: "bg-amber-100 text-amber-800", icon: "🔧" },
        { value: "Survey", label: "مساحة", color: "bg-indigo-100 text-indigo-800", icon: "📐" }
    ];

    // Common floors
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
        if (refreshingData) return; // منع التحميل المزدوج
        
        setLoading(true);
        setRefreshingData(true);
        try {
            await Promise.all([
                loadProjects(),
                loadLocationRules(),
                loadAllDescriptions()
            ]);
        } catch (error) {
            console.error("Failed to load data:", error);
            showToast("فشل في تحميل البيانات", "error");
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

                // Select first project if none selected
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

                // Initialize editing descriptions for first department
                const departments = ["Architectural", "Civil", "Electrical", "Mechanical", "Survey"];
                const firstDept = departments[0];
                
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
            showToast("فشل في تحميل الأوصاف", "error");
        }
    };

    // Location Rules Functions
    const handleEditProjectRules = (projectName) => {
        const projectData = locationRules[projectName] || { rules: [] };
        setEditingProjectRules({
            project: projectName,
            rules: projectData.rules || []
        });
        showToast(`جار تحميل قواعد موقع ${projectName}`, "info");
    };

    const handleAddNewRule = () => {
        if (!newRule.pattern.trim()) {
            showToast("نمط الموقع مطلوب", "error");
            return;
        }

        const updatedRules = [...editingProjectRules.rules, { ...newRule }];
        setEditingProjectRules(prev => ({ ...prev, rules: updatedRules }));
        setNewRule({ pattern: "", type: "", floors: [] });
        showToast("تمت إضافة القاعدة الجديدة", "success");
    };

    const handleRemoveRule = (index) => {
        const updatedRules = editingProjectRules.rules.filter((_, i) => i !== index);
        setEditingProjectRules(prev => ({ ...prev, rules: updatedRules }));
        showToast("تمت إزالة القاعدة", "info");
    };

    const handleUpdateRule = (index, field, value) => {
        const updatedRules = [...editingProjectRules.rules];
        updatedRules[index] = { ...updatedRules[index], [field]: value };
        setEditingProjectRules(prev => ({ ...prev, rules: updatedRules }));
    };

    const handleSaveProjectRules = async () => {
        if (!editingProjectRules.project) {
            showToast("اسم المشروع مطلوب", "error");
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
                showToast(`تم حفظ قواعد موقع ${editingProjectRules.project}`, "success");
                
                // ✅ إعادة تحميل كل من location rules والمشاريع
                await Promise.all([
                    loadLocationRules(),
                    loadProjects()
                ]);
            } else {
                throw new Error("Failed to save location rules");
            }
        } catch (error) {
            console.error("Save location rules error:", error);
            showToast("فشل في حفظ القواعد", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProjectRules = async (projectName) => {
        if (!window.confirm(`هل أنت متأكد من حذف جميع قواعد موقع "${projectName}"؟\n\nهذا الإجراء لا يمكن التراجع عنه.`)) {
            return;
        }

        setSaving(true);
        try {
            // In a real implementation, you would call a DELETE endpoint
            // For now, we'll update with empty rules
            const res = await fetch(`${API_URL}/location-rules`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project: projectName,
                    rules: []
                })
            });

            if (res.ok) {
                showToast(`تم حذف قواعد موقع ${projectName}`, "success");
                await loadLocationRules();

                // Reset editing if it's the current project
                if (editingProjectRules.project === projectName) {
                    setEditingProjectRules({ project: "", rules: [] });
                }
            }
        } catch (error) {
            console.error("Delete location rules error:", error);
            showToast("فشل في حذف القواعد", "error");
        } finally {
            setSaving(false);
        }
    };

    // General Descriptions Functions
    const handleSelectDepartment = async (dept, type = "regular") => {
        console.log(`🔄 Selecting department: ${dept}, type: ${type}`);

        setSelectedDepartment(dept);
        setDescriptionType(type);

        let descriptionsData = { base: [], floors: [] };

        if (type === "cpr") {
            // Load CPR descriptions for Civil department
            descriptionsData = cprDescriptions.Civil || {};
        } else {
            // Load regular descriptions
            descriptionsData = generalDescriptions[dept] || {};
            
            // إذا لم تكن البيانات متوفرة محلياً، جلبها من الخادم
            if (!descriptionsData.base && !descriptionsData.floors) {
                try {
                    const res = await fetch(`${API_URL}/admin/general-descriptions/${dept}`);
                    if (res.ok) {
                        const data = await res.json();
                        descriptionsData = data.regular_descriptions || {};
                    }
                } catch (error) {
                    console.error("Failed to fetch department descriptions:", error);
                }
            }
        }

        setEditingDescriptions({
            department: dept,
            base: descriptionsData.base || [],
            floors: descriptionsData.floors || [],
            type: type
        });

        showToast(`تم تحميل أوصاف قسم ${dept}`, "info");
    };

    const handleAddDescription = () => {
        if (!newDescription.text.trim()) {
            showToast("نص الوصف مطلوب", "error");
            return;
        }

        const updatedDescriptions = { ...editingDescriptions };

        if (newDescription.type === "base") {
            // Add to base descriptions
            updatedDescriptions.base = [...updatedDescriptions.base, newDescription.text.trim()];
            showToast(`تمت إضافة وصف جديد: ${newDescription.text.trim().substring(0, 30)}...`, "success");
        } else {
            // Add to floor descriptions
            if (!newDescription.floor.trim()) {
                showToast("يرجى تحديد الطابق", "error");
                return;
            }

            // Check if floor exists, otherwise add it
            if (!updatedDescriptions.floors.includes(newDescription.floor)) {
                updatedDescriptions.floors = [...updatedDescriptions.floors, newDescription.floor];
                showToast(`تمت إضافة طابق جديد: ${newDescription.floor}`, "success");
            } else {
                showToast("هذا الطابق موجود بالفعل", "info");
            }
        }

        setEditingDescriptions(updatedDescriptions);
        setNewDescription({ text: "", type: "base", floor: "" });
    };

    const handleRemoveBaseDescription = (index) => {
        const updatedBase = editingDescriptions.base.filter((_, i) => i !== index);
        setEditingDescriptions(prev => ({ ...prev, base: updatedBase }));
        showToast("تمت إزالة الوصف", "info");
    };

    const handleRemoveFloor = (index) => {
        const updatedFloors = editingDescriptions.floors.filter((_, i) => i !== index);
        setEditingDescriptions(prev => ({ ...prev, floors: updatedFloors }));
        showToast("تمت إزالة الطابق", "info");
    };

    const handleUpdateBaseDescription = (index, newText) => {
        const updatedBase = [...editingDescriptions.base];
        updatedBase[index] = newText;
        setEditingDescriptions(prev => ({ ...prev, base: updatedBase }));
    };

    const handleUpdateFloor = (index, newFloor) => {
        const updatedFloors = [...editingDescriptions.floors];
        updatedFloors[index] = newFloor;
        setEditingDescriptions(prev => ({ ...prev, floors: updatedFloors }));
    };

    const handleSaveDescriptions = async () => {
        if (!editingDescriptions.department) {
            showToast("القسم مطلوب", "error");
            return;
        }

        setSaving(true);
        try {
            // ✅ تصحيح بنية البيانات لتتوافق مع الخادم
            const requestData = {
                department: editingDescriptions.department,
                descriptions: {
                    base: editingDescriptions.base.filter(item => item.trim() !== ""),
                    floors: editingDescriptions.floors.filter(item => item.trim() !== ""),
                },
                type: editingDescriptions.type
            };

            console.log("📤 Saving descriptions:", requestData);

            const res = await fetch(`${API_URL}/admin/general-descriptions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData)
            });

            if (res.ok) {
                const result = await res.json();
                console.log("✅ Save response:", result);

                showToast(`تم حفظ أوصاف قسم ${editingDescriptions.department}`, "success");

                // إعادة تحميل جميع البيانات
                await loadAllDescriptions();
            } else {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to save descriptions");
            }
        } catch (error) {
            console.error("Save descriptions error:", error);
            showToast(`فشل في حفظ الأوصاف: ${error.message}`, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDepartmentDescriptions = async () => {
        if (!window.confirm(`هل أنت متأكد من حذف جميع أوصاف قسم "${editingDescriptions.department}"؟\n\nهذا الإجراء لا يمكن التراجع عنه.`)) {
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/admin/general-descriptions/${editingDescriptions.department}`, {
                method: "DELETE"
            });

            if (res.ok) {
                showToast(`تم حذف أوصاف قسم ${editingDescriptions.department}`, "success");

                // Reset current editing
                setEditingDescriptions({
                    department: editingDescriptions.department,
                    base: [],
                    floors: [],
                    type: editingDescriptions.type
                });

                // Reload data
                await loadAllDescriptions();
            }
        } catch (error) {
            console.error("Delete descriptions error:", error);
            showToast("فشل في حذف الأوصاف", "error");
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

        showToast("تم تصدير قواعد المواقع", "success");
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

        showToast("تم تصدير الأوصاف العامة", "success");
    };

    const handleImportData = (event, type) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);

                if (type === "location_rules") {
                    // Import location rules
                    showToast("استيراد قواعد المواقع يتطلب تطوير نقطة طرفية مخصصة", "info");
                } else if (type === "descriptions") {
                    // Import descriptions
                    showToast("استيراد الأوصاف يتطلب تطوير نقطة طرفية مخصصة", "info");
                }
            } catch (error) {
                showToast("ملف غير صالح", "error");
            }
        };
        reader.readAsText(file);

        // Reset file input
        event.target.value = '';
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 font-medium">جاري تحميل بيانات الإدارة...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-top-5 ${toast.type === "error" ? "bg-red-600" :
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
                <h2 className="text-2xl font-bold text-gray-800 mb-2">🗃️ إدارة البيانات</h2>
                <p className="text-gray-600">التحكم الكامل في قواعد المواقع والأوصاف العامة للنظام</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveSection("location_rules")}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${activeSection === "location_rules"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-800"
                        }`}
                >
                    📍 قواعد المواقع
                </button>
                <button
                    onClick={() => setActiveSection("descriptions")}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${activeSection === "descriptions"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-800"
                        }`}
                >
                    📝 الأوصاف العامة
                </button>
                <button
                    onClick={() => setActiveSection("tools")}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${activeSection === "tools"
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-800"
                        }`}
                >
                    🛠️ أدوات البيانات
                </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
                {/* Location Rules Section */}
                {activeSection === "location_rules" && (
                    <div className="space-y-6">
                        {/* Projects List */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-800">📋 المشاريع المتاحة</h3>
                                <span className="text-sm text-gray-500">
                                    {Object.keys(locationRules).length} مشروع
                                </span>
                            </div>

                            {Object.keys(projects).length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="text-4xl mb-2">📭</div>
                                    <p>لا توجد مشاريع</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(projects).map(([projectName, projectData]) => {
                                        const rules = locationRules[projectName]?.rules || [];
                                        const hasRules = rules.length > 0;

                                        return (
                                            <div
                                                key={projectName}
                                                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${editingProjectRules.project === projectName
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-gray-200"
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h4 className="font-bold text-gray-800">{projectName}</h4>
                                                        {projectData.description && (
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                {projectData.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleEditProjectRules(projectName)}
                                                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                                                            title="تحرير القواعد"
                                                        >
                                                            ✏️
                                                        </button>
                                                        {hasRules && (
                                                            <button
                                                                onClick={() => handleDeleteProjectRules(projectName)}
                                                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                                                                title="حذف جميع القواعد"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-sm text-gray-600">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span>القواعد: {rules.length}</span>
                                                        {hasRules && (
                                                            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                                                ⚙️ مكون
                                                            </span>
                                                        )}
                                                    </div>
                                                    {hasRules && (
                                                        <div className="mt-2">
                                                            <p className="text-xs text-gray-500 mb-1">أمثلة على القواعد:</p>
                                                            <div className="space-y-1">
                                                                {rules.slice(0, 2).map((rule, idx) => (
                                                                    <div key={idx} className="text-xs bg-gray-100 p-2 rounded">
                                                                        {rule.pattern} - {rule.type}
                                                                    </div>
                                                                ))}
                                                                {rules.length > 2 && (
                                                                    <div className="text-xs text-gray-500">
                                                                        +{rules.length - 2} قواعد أخرى
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Edit Rules Form */}
                        {editingProjectRules.project && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-gray-800">
                                        ✏️ تحرير قواعد موقع: {editingProjectRules.project}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setEditingProjectRules({ project: "", rules: [] })}
                                            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                                        >
                                            إلغاء
                                        </button>
                                        <button
                                            onClick={handleSaveProjectRules}
                                            disabled={saving}
                                            className="px-4 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                                        >
                                            {saving ? "جار الحفظ..." : "💾 حفظ القواعد"}
                                        </button>
                                    </div>
                                </div>

                                {/* Add New Rule */}
                                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                    <h4 className="font-medium text-gray-700 mb-3">➕ إضافة قاعدة جديدة</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">نمط الموقع</label>
                                            <input
                                                type="text"
                                                value={newRule.pattern}
                                                onChange={(e) => setNewRule(prev => ({ ...prev, pattern: e.target.value }))}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                placeholder="مثال: A2-02-01"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">النوع</label>
                                            <input
                                                type="text"
                                                value={newRule.type}
                                                onChange={(e) => setNewRule(prev => ({ ...prev, type: e.target.value }))}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                placeholder="مثال: Park-D"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={handleAddNewRule}
                                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                                            >
                                                إضافة القاعدة
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        يمكنك إضافة طوابق لاحقاً عن طريق تحرير القاعدة
                                    </p>
                                </div>

                                {/* Rules List */}
                                <div>
                                    <h4 className="font-medium text-gray-700 mb-3">
                                        📋 قواعد الموقع ({editingProjectRules.rules.length})
                                    </h4>

                                    {editingProjectRules.rules.length === 0 ? (
                                        <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                                            <div className="text-3xl mb-2">📭</div>
                                            <p>لا توجد قواعد لهذا المشروع</p>
                                            <p className="text-sm mt-1">أضف أول قاعدة باستخدام النموذج أعلاه</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {editingProjectRules.rules.map((rule, index) => (
                                                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs text-gray-500 mb-1">نمط الموقع</label>
                                                                <input
                                                                    type="text"
                                                                    value={rule.pattern}
                                                                    onChange={(e) => handleUpdateRule(index, "pattern", e.target.value)}
                                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-gray-500 mb-1">النوع</label>
                                                                <input
                                                                    type="text"
                                                                    value={rule.type}
                                                                    onChange={(e) => handleUpdateRule(index, "type", e.target.value)}
                                                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveRule(index)}
                                                            className="ml-3 p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-500 mb-1">الطوابق (اختياري)</label>
                                                        <input
                                                            type="text"
                                                            value={rule.floors?.join(", ") || ""}
                                                            onChange={(e) => handleUpdateRule(index, "floors", e.target.value.split(",").map(f => f.trim()))}
                                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                            placeholder="أدخل الطوابق مفصولة بفواصل"
                                                        />
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

                {/* Descriptions Section */}
                {activeSection === "descriptions" && (
                    <div className="space-y-6">
                        {/* Department Selection */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">🏗️ اختيار القسم</h3>

                            {/* Department Tabs */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {departments.map((dept) => (
                                    <div key={dept.value} className="flex gap-2">
                                        <button
                                            onClick={() => handleSelectDepartment(dept.value, "regular")}
                                            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${selectedDepartment === dept.value && descriptionType === "regular"
                                                ? `${dept.color.replace('bg-', 'bg-').replace('-100', '-600')} text-white`
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                }`}
                                        >
                                            <span>{dept.icon}</span>
                                            {dept.label}
                                        </button>
                                        {dept.value === "Civil" && (
                                            <button
                                                onClick={() => handleSelectDepartment(dept.value, "cpr")}
                                                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${selectedDepartment === dept.value && descriptionType === "cpr"
                                                    ? "bg-teal-600 text-white"
                                                    : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                                                    }`}
                                                title="أوصاف CPR"
                                            >
                                                <span>🏗️</span>
                                                CPR
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">
                                        القسم المحدد: <span className="font-medium">{selectedDepartment}</span>
                                        {descriptionType === "cpr" && " (أوصاف CPR)"}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        قاعدة البيانات: {descriptionType === "cpr" 
                                            ? (cprDescriptions.Civil ? "✅ موجود" : "❌ غير موجود")
                                            : (generalDescriptions[selectedDepartment] ? "✅ موجود" : "❌ غير موجود")}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleDeleteDepartmentDescriptions}
                                        disabled={saving || (!editingDescriptions.base.length && !editingDescriptions.floors.length)}
                                        className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg disabled:opacity-50"
                                    >
                                        🗑️ حذف القسم
                                    </button>
                                    <button
                                        onClick={handleSaveDescriptions}
                                        disabled={saving}
                                        className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                                    >
                                        {saving ? "جار الحفظ..." : "💾 حفظ الأوصاف"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Add Description Form */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h4 className="font-medium text-gray-700 mb-4">➕ إضافة وصف جديد</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">نوع الوصف</label>
                                    <select
                                        value={newDescription.type}
                                        onChange={(e) => setNewDescription(prev => ({ ...prev, type: e.target.value }))}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    >
                                        <option value="base">وصف عام (Base)</option>
                                        <option value="floor">وصف للطابق</option>
                                    </select>
                                </div>

                                {newDescription.type === "floor" && (
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1">الطابق</label>
                                        <select
                                            value={newDescription.floor}
                                            onChange={(e) => setNewDescription(prev => ({ ...prev, floor: e.target.value }))}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        >
                                            <option value="">اختر طابق</option>
                                            {commonFloors.map((floor) => (
                                                <option key={floor} value={floor}>{floor}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className={newDescription.type === "floor" ? "md:col-span-1" : "md:col-span-2"}>
                                    <label className="block text-sm text-gray-600 mb-1">نص الوصف</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newDescription.text}
                                            onChange={(e) => setNewDescription(prev => ({ ...prev, text: e.target.value }))}
                                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            placeholder="أدخل نص الوصف..."
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddDescription();
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={handleAddDescription}
                                            disabled={!newDescription.text.trim() || (newDescription.type === "floor" && !newDescription.floor)}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 transition-all"
                                        >
                                            <span className="text-lg">+</span>
                                            <span>إضافة</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Base Descriptions List */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium text-gray-700">
                                    📝 الأوصاف العامة ({editingDescriptions.base.length})
                                </h4>
                                <span className="text-sm text-gray-500">
                                    تظهر للمهندسين عند إنشاء IR
                                </span>
                            </div>

                            {editingDescriptions.base.length === 0 ? (
                                <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                                    <div className="text-3xl mb-2">📭</div>
                                    <p>لا توجد أوصاف عامة</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {editingDescriptions.base.map((desc, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                                            <div className="text-gray-500">{index + 1}.</div>
                                            <input
                                                type="text"
                                                value={desc}
                                                onChange={(e) => handleUpdateBaseDescription(index, e.target.value)}
                                                className="flex-1 px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            />
                                            <button
                                                onClick={() => handleRemoveBaseDescription(index)}
                                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Floors List */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium text-gray-700">
                                    🏢 الطوابق ({editingDescriptions.floors.length})
                                </h4>
                                <span className="text-sm text-gray-500">
                                    قائمة الطوابق المتاحة
                                </span>
                            </div>

                            {editingDescriptions.floors.length === 0 ? (
                                <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                                    <div className="text-3xl mb-2">🏢</div>
                                    <p>لا توجد طوابق محددة</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {editingDescriptions.floors.map((floor, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                                            <div className="text-gray-500">🏢</div>
                                            <input
                                                type="text"
                                                value={floor}
                                                onChange={(e) => handleUpdateFloor(index, e.target.value)}
                                                className="flex-1 px-3 py-1 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            />
                                            <button
                                                onClick={() => handleRemoveFloor(index)}
                                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                                            >
                                                🗑️
                                            </button>
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
                            <h3 className="text-lg font-bold text-gray-800 mb-4">🛠️ أدوات إدارة البيانات</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Export Tools */}
                                <div className="border rounded-lg p-4">
                                    <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <span>📤</span> تصدير البيانات
                                    </h4>
                                    <div className="space-y-3">
                                        <button
                                            onClick={exportLocationRules}
                                            className="w-full px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium flex items-center justify-between"
                                        >
                                            <span>تصدير قواعد المواقع</span>
                                            <span>⬇️</span>
                                        </button>
                                        <button
                                            onClick={exportDescriptions}
                                            className="w-full px-4 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium flex items-center justify-between"
                                        >
                                            <span>تصدير الأوصاف العامة</span>
                                            <span>⬇️</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                const allData = {
                                                    location_rules: locationRules,
                                                    general_descriptions: generalDescriptions,
                                                    general_descriptions_cpr: cprDescriptions,
                                                    exported_at: new Date().toISOString()
                                                };
                                                const dataStr = JSON.stringify(allData, null, 2);
                                                const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
                                                const linkElement = document.createElement('a');
                                                linkElement.setAttribute('href', dataUri);
                                                linkElement.setAttribute('download', `system-data-backup-${new Date().toISOString().split('T')[0]}.json`);
                                                linkElement.click();
                                                showToast("تم تصدير نسخة احتياطية كاملة", "success");
                                            }}
                                            className="w-full px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium flex items-center justify-between"
                                        >
                                            <span>تصدير نسخة احتياطية كاملة</span>
                                            <span>💾</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Import Tools */}
                                <div className="border rounded-lg p-4">
                                    <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <span>📥</span> استيراد البيانات
                                    </h4>
                                    <div className="space-y-3">
                                        <label className="block">
                                            <div className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium flex items-center justify-between cursor-pointer">
                                                <span>استيراد قواعد المواقع</span>
                                                <span>⬆️</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".json"
                                                onChange={(e) => handleImportData(e, "location_rules")}
                                                className="hidden"
                                            />
                                        </label>
                                        <label className="block">
                                            <div className="px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg font-medium flex items-center justify-between cursor-pointer">
                                                <span>استيراد الأوصاف العامة</span>
                                                <span>⬆️</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".json"
                                                onChange={(e) => handleImportData(e, "descriptions")}
                                                className="hidden"
                                            />
                                        </label>
                                        <button
                                            onClick={() => {
                                                if (window.confirm("هل تريد إعادة تحميل جميع البيانات من الخادم؟\nسيتم فقدان أي تغييرات غير محفوظة.")) {
                                                    loadAllData();
                                                    showToast("جار إعادة تحميل البيانات...", "info");
                                                }
                                            }}
                                            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-between"
                                        >
                                            <span>إعادة تحميل البيانات</span>
                                            <span>🔄</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Data Statistics */}
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <h4 className="font-medium text-gray-700 mb-4">📊 إحصائيات البيانات</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {Object.keys(locationRules).length}
                                        </div>
                                        <div className="text-sm text-gray-600">مشروع بقواعد</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">
                                            {Object.keys(generalDescriptions).length}
                                        </div>
                                        <div className="text-sm text-gray-600">قسم بأوصاف</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {Object.keys(cprDescriptions).length}
                                        </div>
                                        <div className="text-sm text-gray-600">أوصاف CPR</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                                        <div className="text-2xl font-bold text-amber-600">
                                            {Object.keys(projects).length}
                                        </div>
                                        <div className="text-sm text-gray-600">مشروع في النظام</div>
                                    </div>
                                </div>
                            </div>

                            {/* Data Cleanup */}
                            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                                    ⚠️ تنظيف البيانات
                                </h4>
                                <p className="text-sm text-red-600 mb-3">
                                    إجراءات خطرة قد تؤدي إلى فقدان البيانات. استخدم بحذر.
                                </p>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => {
                                            if (window.confirm("هل أنت متأكد من حذف جميع قواعد المواقع؟\n\nهذا الإجراء لا يمكن التراجع عنه.")) {
                                                showToast("هذه الخاصية قيد التطوير", "info");
                                            }
                                        }}
                                        className="px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded"
                                    >
                                        حذف جميع قواعد المواقع
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm("هل أنت متأكد من حذف جميع الأوصاف؟\n\nهذا الإجراء لا يمكن التراجع عنه.")) {
                                                showToast("هذه الخاصية قيد التطوير", "info");
                                            }
                                        }}
                                        className="px-3 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded"
                                    >
                                        حذف جميع الأوصاف
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}