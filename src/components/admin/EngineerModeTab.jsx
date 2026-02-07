// src/components/admin/EngineerModeTab.jsx
import { useEffect, useState } from "react";
import { API_URL } from "../../config";

export default function EngineerModeTab({ user }) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: "", type: "" });
    
    // Form States
    const [projects, setProjects] = useState({});
    const [projectsList, setProjectsList] = useState([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedLocation, setSelectedLocation] = useState("");
    const [selectedFloor, setSelectedFloor] = useState("");
    const [selectedDesc, setSelectedDesc] = useState("");
    
    // Request Type
    const [requestType, setRequestType] = useState("IR"); // IR or CPR
    const [department, setDepartment] = useState(user?.department || "ST");
    
    // Data States
    const [generalDescriptions, setGeneralDescriptions] = useState([]);
    const [locationRules, setLocationRules] = useState({});
    const [locations, setLocations] = useState([]);
    const [floors, setFloors] = useState([]);
    const [descriptions, setDescriptions] = useState([]);
    
    // CPR Specific States
    const [concreteGrade, setConcreteGrade] = useState("");
    const [pouringElement, setPouringElement] = useState("");
    const [cprDescriptions, setCprDescriptions] = useState([]);
    const [cprGrades, setCprGrades] = useState([]);
    const [cprElements, setCprElements] = useState([]);
    
    // User History
    const [userIRs, setUserIRs] = useState([]);
    const [userRevisions, setUserRevisions] = useState([]);
    
    // Statistics
    const [stats, setStats] = useState({
        totalIRs: 0,
        totalCPRs: 0,
        totalRevisions: 0,
        pendingIRs: 0,
        completedIRs: 0
    });
    
    // Next IR Number
    const [nextIRNumber, setNextIRNumber] = useState("");
    
    // Departments
    const departments = [
        { value: "ARCH", label: "معماري", color: "bg-blue-100 text-blue-800", icon: "🏛️" },
        { value: "ST", label: "إنشائي", color: "bg-green-100 text-green-800", icon: "🏗️" },
        { value: "ELECT", label: "كهرباء", color: "bg-purple-100 text-purple-800", icon: "⚡" },
        { value: "MEP", label: "ميكانيكا", color: "bg-amber-100 text-amber-800", icon: "🔧" },
        { value: "SURV", label: "مساحة", color: "bg-indigo-100 text-indigo-800", icon: "📐" }
    ];
    
    // Common Floors (fallback)
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
        setLoading(true);
        try {
            await Promise.all([
                loadProjects(),
                loadLocationRules(),
                loadUserHistory(),
                loadStatistics()
            ]);
        } catch (error) {
            console.error("Failed to load engineer data:", error);
            showToast("فشل في تحميل البيانات", "error");
        } finally {
            setLoading(false);
        }
    };
    
    const loadProjects = async () => {
        try {
            const res = await fetch(`${API_URL}/projects`);
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects || {});
                
                // Create projects list for dropdown
                const projectsArray = Object.entries(data.projects || {}).map(([name, data]) => ({
                    name,
                    ...data
                }));
                setProjectsList(projectsArray);
                
                // Auto-select first project
                if (projectsArray.length > 0 && !selectedProject) {
                    setSelectedProject(projectsArray[0].name);
                    await updateLocationsAndFloors(projectsArray[0].name, projectsArray[0]);
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
    
    const loadGeneralDescriptions = async (dept) => {
        try {
            const deptForAPI = dept === "ST" ? "Civil" : 
                              dept === "ARCH" ? "Architectural" :
                              dept === "ELECT" ? "Electrical" :
                              dept === "MEP" ? "Mechanical" :
                              dept === "SURV" ? "Survey" : "Civil";
            
            const res = await fetch(
                `${API_URL}/general-descriptions?dept=${deptForAPI}&requestType=${requestType}`
            );
            
            if (res.ok) {
                const data = await res.json();
                
                if (requestType === "CPR") {
                    setCprDescriptions(data.base || []);
                    setCprGrades(data.grades || []);
                    setCprElements(data.elements || []);
                    setDescriptions(data.base || []);
                } else {
                    setGeneralDescriptions(data.base || []);
                    setFloors(data.floors || commonFloors);
                    setDescriptions(data.base || []);
                }
            }
        } catch (error) {
            console.error("Failed to load descriptions:", error);
            // Fallback to common floors
            setFloors(commonFloors);
            setDescriptions([]);
        }
    };
    
    const loadUserHistory = async () => {
        if (!user || !department) return;
        
        try {
            const res = await fetch(
                `${API_URL}/irs-by-user-and-dept?user=${user.username}&dept=${department}`
            );
            
            if (res.ok) {
                const data = await res.json();
                setUserIRs(data.irs || []);
                setUserRevisions(data.revs || []);
            }
        } catch (error) {
            console.error("Failed to load user history:", error);
        }
    };
    
    const loadStatistics = async () => {
        try {
            const irsRes = await fetch(`${API_URL}/irs`);
            if (irsRes.ok) {
                const data = await irsRes.json();
                const irsList = data.irs || [];
                
                const userIRsList = irsList.filter(ir => 
                    ir.user === user?.username && ir.department === department
                );
                
                setStats({
                    totalIRs: userIRsList.filter(ir => ir.requestType !== "CPR").length,
                    totalCPRs: userIRsList.filter(ir => ir.requestType === "CPR").length,
                    totalRevisions: userRevisions.length,
                    pendingIRs: userIRsList.filter(ir => !ir.isDone).length,
                    completedIRs: userIRsList.filter(ir => ir.isDone).length
                });
            }
        } catch (error) {
            console.error("Failed to load statistics:", error);
        }
    };
    
    // Update locations and floors based on selected project
    const updateLocationsAndFloors = async (projectName, projectData = null) => {
        const proj = projectData || projects[projectName];
        if (!proj) return;

        // Set locations from project
        const projectLocations = proj.locations || [projectName];
        setLocations(projectLocations);
        
        if (projectLocations.length > 0) {
            const firstLocation = projectLocations[0];
            setSelectedLocation(firstLocation);
            
            // Get floors from location rules
            const locationRule = locationRules[projectName]?.[firstLocation];
            if (locationRule && locationRule.floors && locationRule.floors.length > 0) {
                setFloors(locationRule.floors);
                if (locationRule.floors.length > 0) {
                    setSelectedFloor(locationRule.floors[0]);
                }
            } else {
                // Fallback to common floors
                setFloors(commonFloors);
                if (commonFloors.length > 0) {
                    setSelectedFloor(commonFloors[0]);
                }
            }
        }

        // Load general descriptions for current department
        await loadGeneralDescriptions(department);
        
        // Generate next IR number
        generateNextIRNumber(projectName);
    };
    
    // Generate next IR number
    const generateNextIRNumber = (projectName) => {
        if (!projectName || !department) return;
        
        const proj = projects[projectName];
        if (!proj || !proj.counters) return;

        const counter = proj.counters[department] || 0;
        const nextCounter = parseInt(counter) + 1;
        
        let irNumber = "";
        if (requestType === "CPR") {
            irNumber = `BADYA-CON-${projectName.replace(/\s+/g, '-').toUpperCase()}-CPR-${nextCounter.toString().padStart(3, '0')}`;
        } else {
            irNumber = `BADYA-CON-${projectName.replace(/\s+/g, '-').toUpperCase()}-IR-${department}-${nextCounter.toString().padStart(3, '0')}`;
        }
        
        setNextIRNumber(irNumber);
    };
    
    // Handle project change
    const handleProjectChange = async (e) => {
        const projectName = e.target.value;
        setSelectedProject(projectName);
        await updateLocationsAndFloors(projectName);
    };
    
    // Handle location change
    const handleLocationChange = (e) => {
        const location = e.target.value;
        setSelectedLocation(location);
        
        // Update floors for this location
        const locationRule = locationRules[selectedProject]?.[location];
        if (locationRule && locationRule.floors && locationRule.floors.length > 0) {
            setFloors(locationRule.floors);
            if (locationRule.floors.length > 0) {
                setSelectedFloor(locationRule.floors[0]);
            }
        } else {
            // Fallback to common floors
            setFloors(commonFloors);
            if (commonFloors.length > 0) {
                setSelectedFloor(commonFloors[0]);
            }
        }
    };
    
    // Handle department change
    const handleDepartmentChange = async (e) => {
        const dept = e.target.value;
        setDepartment(dept);
        
        // Load descriptions for new department
        await loadGeneralDescriptions(dept);
        
        // Regenerate IR number
        if (selectedProject) {
            generateNextIRNumber(selectedProject);
        }
        
        // Reload user history for new department
        if (user) {
            await loadUserHistory();
            await loadStatistics();
        }
    };
    
    // Handle request type change
    const handleRequestTypeChange = async (e) => {
        const type = e.target.value;
        setRequestType(type);
        
        // Reset CPR specific fields
        if (type !== "CPR") {
            setConcreteGrade("");
            setPouringElement("");
        }
        
        // Load appropriate descriptions
        await loadGeneralDescriptions(department);
        
        // Regenerate IR number
        if (selectedProject) {
            generateNextIRNumber(selectedProject);
        }
    };
    
    // Handle description selection
    const handleDescriptionSelect = (desc) => {
        setSelectedDesc(desc);
    };
    
    // Handle CPR grade selection
    const handleGradeSelect = (grade) => {
        setConcreteGrade(grade);
    };
    
    // Handle CPR element selection
    const handleElementSelect = (element) => {
        setPouringElement(element);
    };
    
    // Validate form
    const validateForm = () => {
        if (!selectedProject) {
            showToast("يرجى اختيار المشروع", "error");
            return false;
        }
        
        if (!selectedLocation) {
            showToast("يرجى اختيار الموقع", "error");
            return false;
        }
        
        if (!selectedFloor) {
            showToast("يرجى اختيار الطابق", "error");
            return false;
        }
        
        if (!selectedDesc) {
            showToast("يرجى اختيار الوصف", "error");
            return false;
        }
        
        if (requestType === "CPR") {
            if (!concreteGrade) {
                showToast("يرجى اختيار درجة الخرسانة", "error");
                return false;
            }
            
            if (!pouringElement) {
                showToast("يرجى اختيار عنصر الصب", "error");
                return false;
            }
        }
        
        return true;
    };
    
    // Submit request
    const handleSubmitRequest = async () => {
        if (!validateForm()) return;
        
        if (!user) {
            showToast("يرجى تسجيل الدخول أولاً", "error");
            return;
        }
        
        setSubmitting(true);
        try {
            const requestData = {
                project: selectedProject,
                department: department,
                user: user.username,
                desc: selectedDesc,
                location: selectedLocation,
                floor: selectedFloor,
                requestType: requestType
            };
            
            // Add CPR specific fields
            if (requestType === "CPR") {
                requestData.concreteGrade = concreteGrade;
                requestData.pouringElement = pouringElement;
            }
            
            console.log("Submitting request:", requestData);
            
            const res = await fetch(`${API_URL}/irs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData)
            });
            
            const data = await res.json();
            
            if (res.ok) {
                showToast(
                    `تم إنشاء ${requestType === "CPR" ? "طلب CPR" : "طلب التفتيش"} بنجاح!`,
                    "success"
                );
                
                // Reset form
                setSelectedDesc("");
                setConcreteGrade("");
                setPouringElement("");
                
                // Reload data
                await Promise.all([
                    loadProjects(),
                    loadUserHistory(),
                    loadStatistics()
                ]);
                
                // Generate next IR number
                if (selectedProject) {
                    generateNextIRNumber(selectedProject);
                }
            } else {
                throw new Error(data.error || "فشل في إنشاء الطلب");
            }
        } catch (error) {
            console.error("Submit request error:", error);
            showToast(error.message || "فشل في إنشاء الطلب", "error");
        } finally {
            setSubmitting(false);
        }
    };
    
    // Create revision
    const handleCreateRevision = async (ir) => {
        const revText = prompt("أدخل رقم المراجعة (مثال: REV-001):");
        if (!revText) return;
        
        const revNote = prompt("أدخل ملاحظة المراجعة (اختياري):");
        
        setSubmitting(true);
        try {
            const revisionData = {
                project: ir.project,
                revText: revText,
                revNote: revNote || "",
                revisionType: ir.requestType === "CPR" ? "CPR_REVISION" : "IR_REVISION",
                parentRequestType: ir.requestType || "IR",
                department: ir.department,
                user: user.username
            };
            
            const res = await fetch(`${API_URL}/revs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(revisionData)
            });
            
            if (res.ok) {
                showToast("تم إنشاء المراجعة بنجاح!", "success");
                await loadUserHistory();
            } else {
                throw new Error("فشل في إنشاء المراجعة");
            }
        } catch (error) {
            console.error("Create revision error:", error);
            showToast("فشل في إنشاء المراجعة", "error");
        } finally {
            setSubmitting(false);
        }
    };
    
    // Archive item (for engineer)
    const handleArchiveItem = async (item) => {
        if (!window.confirm(`هل تريد أرشفة ${item.isRevision ? 'المراجعة' : 'طلب التفتيش'} ${item.irNo || item.revNo}؟`)) {
            return;
        }
        
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo: item.irNo || item.revNo,
                    role: "engineer",
                    isRevision: item.isRevision
                })
            });
            
            if (res.ok) {
                showToast(`تم أرشفة ${item.isRevision ? 'المراجعة' : 'طلب التفتيش'}`, "success");
                await loadUserHistory();
            } else {
                throw new Error("Failed to archive");
            }
        } catch (error) {
            console.error("Archive error:", error);
            showToast("فشل في الأرشيف", "error");
        } finally {
            setSubmitting(false);
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
                    <p className="text-gray-600 font-medium">جاري تحميل بيانات المهندس...</p>
                </div>
            </div>
        );
    }
    
    const deptInfo = getDeptInfo(department);
    
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
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">👷 وضع المهندس</h2>
                        <p className="text-gray-600">
                            إنشاء طلبات التفتيش (IR) وطلبات CPR وطلبات المراجعة
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${deptInfo.color}`}>
                                {deptInfo.icon} {deptInfo.label}
                            </span>
                            <span className="text-sm text-gray-600">{user?.fullname || user?.username}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadAllData}
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                        >
                            <span className={submitting ? "animate-spin" : ""}>🔄</span>
                            {submitting ? "جار التحديث..." : "تحديث البيانات"}
                        </button>
                        <div className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                            {nextIRNumber ? `التالي: ${nextIRNumber}` : "اختر مشروع"}
                        </div>
                    </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-blue-700">طلبات IR</p>
                                <p className="text-lg font-bold text-blue-800">{stats.totalIRs}</p>
                            </div>
                            <div className="text-xl">📝</div>
                        </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-green-700">طلبات CPR</p>
                                <p className="text-lg font-bold text-green-800">{stats.totalCPRs}</p>
                            </div>
                            <div className="text-xl">🏗️</div>
                        </div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-purple-700">مراجعات</p>
                                <p className="text-lg font-bold text-purple-800">{stats.totalRevisions}</p>
                            </div>
                            <div className="text-xl">🔄</div>
                        </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-amber-700">قيد الانتظار</p>
                                <p className="text-lg font-bold text-amber-800">{stats.pendingIRs}</p>
                            </div>
                            <div className="text-xl">⏳</div>
                        </div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-emerald-700">مكتمل</p>
                                <p className="text-lg font-bold text-emerald-800">{stats.completedIRs}</p>
                            </div>
                            <div className="text-xl">✅</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Request Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                            {requestType === "CPR" ? "🏗️ إنشاء طلب CPR" : "📝 إنشاء طلب تفتيش"}
                        </h3>
                        
                        {/* Request Type & Department */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    نوع الطلب
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRequestTypeChange({ target: { value: "IR" } })}
                                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                            requestType === "IR"
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                    >
                                        <span>📝</span>
                                        طلب تفتيش (IR)
                                    </button>
                                    <button
                                        onClick={() => handleRequestTypeChange({ target: { value: "CPR" } })}
                                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                            requestType === "CPR"
                                                ? "bg-green-600 text-white"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}
                                        disabled={department !== "ST"}
                                        title={department !== "ST" ? "طلبات CPR متاحة فقط للقسم الإنشائي" : ""}
                                    >
                                        <span>🏗️</span>
                                        طلب CPR
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    القسم
                                </label>
                                <select
                                    value={department}
                                    onChange={handleDepartmentChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                >
                                    {departments.map(dept => (
                                        <option key={dept.value} value={dept.value}>
                                            {dept.icon} {dept.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        {/* Project Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                المشروع *
                            </label>
                            <select
                                value={selectedProject}
                                onChange={handleProjectChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                            >
                                <option value="">اختر مشروع</option>
                                {projectsList.map(project => (
                                    <option key={project.name} value={project.name}>
                                        {project.name} {project.description ? `- ${project.description}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Location & Floor */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    الموقع *
                                </label>
                                <select
                                    value={selectedLocation}
                                    onChange={handleLocationChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                    disabled={!selectedProject}
                                >
                                    <option value="">اختر موقع</option>
                                    {locations.map((location, index) => (
                                        <option key={index} value={location}>
                                            {location}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    الطابق *
                                </label>
                                <select
                                    value={selectedFloor}
                                    onChange={(e) => setSelectedFloor(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                    disabled={!selectedLocation}
                                >
                                    <option value="">اختر طابق</option>
                                    {floors.map((floor, index) => (
                                        <option key={index} value={floor}>
                                            {floor}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        {/* CPR Specific Fields */}
                        {requestType === "CPR" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        درجة الخرسانة *
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {cprGrades.map((grade, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleGradeSelect(grade)}
                                                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                                                    concreteGrade === grade
                                                        ? "bg-green-600 text-white"
                                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                }`}
                                            >
                                                {grade}
                                            </button>
                                        ))}
                                    </div>
                                    {concreteGrade && (
                                        <p className="text-sm text-green-600 mt-2">
                                            المحددة: <span className="font-medium">{concreteGrade}</span>
                                        </p>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        عنصر الصب *
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {cprElements.map((element, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleElementSelect(element)}
                                                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                                                    pouringElement === element
                                                        ? "bg-green-600 text-white"
                                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                }`}
                                            >
                                                {element}
                                            </button>
                                        ))}
                                    </div>
                                    {pouringElement && (
                                        <p className="text-sm text-green-600 mt-2">
                                            المحدد: <span className="font-medium">{pouringElement}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Description Selection */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-gray-700">
                                    الوصف *
                                </label>
                                <span className="text-xs text-gray-500">
                                    {descriptions.length} خيار متاح
                                </span>
                            </div>
                            
                            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-2">
                                {descriptions.length === 0 ? (
                                    <div className="text-center py-6 text-gray-500">
                                        <div className="text-2xl mb-2">📭</div>
                                        <p>لا توجد أوصاف متاحة</p>
                                        <p className="text-sm mt-1">يرجى اختيار قسم ومشروع مختلف</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {descriptions.map((desc, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleDescriptionSelect(desc)}
                                                className={`w-full text-left p-3 rounded-lg transition-colors ${
                                                    selectedDesc === desc
                                                        ? "bg-blue-100 border border-blue-300"
                                                        : "hover:bg-gray-50 border border-transparent"
                                                }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center ${
                                                        selectedDesc === desc
                                                            ? "bg-blue-600 border-blue-600 text-white text-xs"
                                                            : "border-gray-300"
                                                    }`}>
                                                        {selectedDesc === desc ? "✓" : ""}
                                                    </div>
                                                    <span className="text-sm text-gray-700">{desc}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {selectedDesc && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm font-medium text-blue-700 mb-1">الوصف المحدد:</p>
                                    <p className="text-blue-800">{selectedDesc}</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Next IR Number Preview */}
                        {nextIRNumber && (
                            <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-300 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 mb-1">الرقم المتوقع:</p>
                                <p className="font-mono font-bold text-lg text-gray-800">{nextIRNumber}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    سيتم تعيين هذا الرقم تلقائياً عند إنشاء الطلب
                                </p>
                            </div>
                        )}
                        
                        {/* Submit Button */}
                        <button
                            onClick={handleSubmitRequest}
                            disabled={submitting || !selectedProject || !selectedDesc}
                            className={`w-full py-4 rounded-lg font-bold text-white transition-all duration-200 flex items-center justify-center gap-3 ${
                                submitting || !selectedProject || !selectedDesc
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : requestType === "CPR"
                                        ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            }`}
                        >
                            {submitting ? (
                                <>
                                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                    جاري الإرسال...
                                </>
                            ) : (
                                <>
                                    <span>{requestType === "CPR" ? "🏗️" : "📝"}</span>
                                    {requestType === "CPR" ? "إنشاء طلب CPR" : "إنشاء طلب تفتيش"}
                                </>
                            )}
                        </button>
                    </div>
                    
                    {/* Quick Tips */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                        <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                            <span>💡</span> نصائح سريعة
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/50 p-3 rounded-lg">
                                <p className="text-blue-700 text-sm font-medium mb-1">طلبات التفتيش (IR)</p>
                                <ul className="text-blue-600 text-xs space-y-1">
                                    <li>• اختر المشروع والموقع والطابق</li>
                                    <li>• اختر الوصف المناسب من القائمة</li>
                                    <li>• سيتم توليد رقم IR تلقائياً</li>
                                </ul>
                            </div>
                            <div className="bg-white/50 p-3 rounded-lg">
                                <p className="text-green-700 text-sm font-medium mb-1">طلبات CPR</p>
                                <ul className="text-green-600 text-xs space-y-1">
                                    <li>• متاحة فقط للقسم الإنشائي</li>
                                    <li>• اختر درجة الخرسانة وعنصر الصب</li>
                                    <li>• استخدم الأوصاف المخصصة للخرسانة</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Right Column: User History */}
                <div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800">📋 الطلبات السابقة</h3>
                            <span className="text-sm text-gray-500">
                                {userIRs.length + userRevisions.length} طلب
                            </span>
                        </div>
                        
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {userIRs.length === 0 && userRevisions.length === 0 ? (
                                <div className="text-center py-6 text-gray-500">
                                    <div className="text-3xl mb-2">📭</div>
                                    <p>لا توجد طلبات سابقة</p>
                                    <p className="text-sm mt-1">ابدأ بإنشاء طلبك الأول</p>
                                </div>
                            ) : (
                                <>
                                    {/* Recent IRs */}
                                    {userIRs.slice(0, 10).map((ir, index) => (
                                        <div key={index} className="border rounded-lg p-3 hover:bg-gray-50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="font-medium text-gray-800 text-sm">
                                                        {ir.irNo}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {ir.project} • {formatDate(ir.sentAt)}
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    getStatusInfo(ir).color
                                                }`}>
                                                    {getStatusInfo(ir).icon}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-600 line-clamp-2 mb-2">
                                                {ir.desc}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="text-xs text-gray-500">
                                                    {ir.requestType === "CPR" ? "🏗️ CPR" : "📝 IR"}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleCreateRevision(ir)}
                                                        className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded text-xs"
                                                        title="إنشاء مراجعة"
                                                    >
                                                        🔄
                                                    </button>
                                                    <button
                                                        onClick={() => handleArchiveItem(ir)}
                                                        className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded text-xs"
                                                        title="أرشفة"
                                                    >
                                                        🗄️
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Recent Revisions */}
                                    {userRevisions.slice(0, 5).map((rev, index) => (
                                        <div key={index} className="border rounded-lg p-3 hover:bg-gray-50 bg-amber-50/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="font-medium text-amber-800 text-sm">
                                                        {rev.revNo || rev.irNo}
                                                    </div>
                                                    <div className="text-xs text-amber-600">
                                                        مراجعة • {formatDate(rev.sentAt)}
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    getStatusInfo(rev).color
                                                }`}>
                                                    {getStatusInfo(rev).icon}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-600 mb-2">
                                                {rev.revNote || rev.desc}
                                            </div>
                                            <div className="text-xs text-amber-500">
                                                {rev.project}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                        
                        {userIRs.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>عرض {Math.min(10, userIRs.length)} من {userIRs.length} طلب IR</span>
                                    <span>{Math.min(5, userRevisions.length)} مراجعة</span>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Department Stats */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">📊 إحصائيات القسم</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>طلبات IR</span>
                                    <span>{stats.totalIRs}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-500 h-2 rounded-full" 
                                        style={{ 
                                            width: `${stats.totalIRs + stats.totalCPRs > 0 ? 
                                                Math.round((stats.totalIRs / (stats.totalIRs + stats.totalCPRs)) * 100) : 0}%` 
                                        }}
                                    ></div>
                                </div>
                            </div>
                            
                            <div>
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>طلبات CPR</span>
                                    <span>{stats.totalCPRs}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-green-500 h-2 rounded-full" 
                                        style={{ 
                                            width: `${stats.totalIRs + stats.totalCPRs > 0 ? 
                                                Math.round((stats.totalCPRs / (stats.totalIRs + stats.totalCPRs)) * 100) : 0}%` 
                                        }}
                                    ></div>
                                </div>
                            </div>
                            
                            <div>
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>معدل الإنجاز</span>
                                    <span>{stats.totalIRs + stats.totalCPRs > 0 ? 
                                        Math.round((stats.completedIRs / (stats.totalIRs + stats.totalCPRs)) * 100) : 0}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-emerald-500 h-2 rounded-full" 
                                        style={{ 
                                            width: `${stats.totalIRs + stats.totalCPRs > 0 ? 
                                                Math.round((stats.completedIRs / (stats.totalIRs + stats.totalCPRs)) * 100) : 0}%` 
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-800">
                                    {stats.totalIRs + stats.totalCPRs + stats.totalRevisions}
                                </div>
                                <div className="text-sm text-gray-600">إجمالي الطلبات</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="mt-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl p-5">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <span>⚡</span> إجراءات سريعة
                        </h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    if (userIRs.length > 0) {
                                        const lastIR = userIRs[0];
                                        handleCreateRevision(lastIR);
                                    } else {
                                        showToast("لا توجد طلبات سابقة لإنشاء مراجعة", "info");
                                    }
                                }}
                                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-left flex items-center justify-between transition-colors"
                            >
                                <div>
                                    <p className="font-medium">إنشاء مراجعة</p>
                                    <p className="text-sm text-slate-300">لآخر طلب IR</p>
                                </div>
                                <span>🔄</span>
                            </button>
                            
                            <button
                                onClick={() => setRequestType(requestType === "IR" ? "CPR" : "IR")}
                                disabled={department !== "ST" && requestType === "CPR"}
                                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-left flex items-center justify-between transition-colors disabled:opacity-50"
                            >
                                <div>
                                    <p className="font-medium">تبديل النوع</p>
                                    <p className="text-sm text-slate-300">
                                        {requestType === "IR" ? "التبديل إلى CPR" : "التبديل إلى IR"}
                                    </p>
                                </div>
                                <span>{requestType === "IR" ? "🏗️" : "📝"}</span>
                            </button>
                            
                            <button
                                onClick={() => {
                                    setSelectedDesc("");
                                    setConcreteGrade("");
                                    setPouringElement("");
                                    showToast("تم مسح النموذج", "info");
                                }}
                                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-left flex items-center justify-between transition-colors"
                            >
                                <div>
                                    <p className="font-medium">مسح النموذج</p>
                                    <p className="text-sm text-slate-300">إعادة تعيين الحقول</p>
                                </div>
                                <span>🗑️</span>
                            </button>
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <div className="text-center text-sm text-slate-300">
                                <p>وقت الخادم: {new Date().toLocaleTimeString('ar-EG')}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Project Information */}
            {selectedProject && projects[selectedProject] && (
                <div className="mt-6 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="text-emerald-600 text-2xl">📁</div>
                        <div>
                            <h4 className="font-bold text-emerald-800">معلومات المشروع: {selectedProject}</h4>
                            <p className="text-emerald-600 text-sm">
                                {projects[selectedProject].description || "لا يوجد وصف"}
                            </p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="text-center p-3 bg-white/50 rounded-lg">
                            <div className="text-xl font-bold text-emerald-700">
                                {projects[selectedProject].counters?.ARCH || 0}
                            </div>
                            <div className="text-xs text-emerald-600">معماري</div>
                        </div>
                        <div className="text-center p-3 bg-white/50 rounded-lg">
                            <div className="text-xl font-bold text-emerald-700">
                                {projects[selectedProject].counters?.ST || 0}
                            </div>
                            <div className="text-xs text-emerald-600">إنشائي</div>
                        </div>
                        <div className="text-center p-3 bg-white/50 rounded-lg">
                            <div className="text-xl font-bold text-emerald-700">
                                {projects[selectedProject].counters?.ELECT || 0}
                            </div>
                            <div className="text-xs text-emerald-600">كهرباء</div>
                        </div>
                        <div className="text-center p-3 bg-white/50 rounded-lg">
                            <div className="text-xl font-bold text-emerald-700">
                                {projects[selectedProject].counters?.MEP || 0}
                            </div>
                            <div className="text-xs text-emerald-600">ميكانيكا</div>
                        </div>
                        <div className="text-center p-3 bg-white/50 rounded-lg">
                            <div className="text-xl font-bold text-emerald-700">
                                {projects[selectedProject].counters?.SURV || 0}
                            </div>
                            <div className="text-xs text-emerald-600">مساحة</div>
                        </div>
                        <div className="text-center p-3 bg-white/50 rounded-lg">
                            <div className="text-xl font-bold text-emerald-700">
                                {projects[selectedProject].counters?.CPR || 0}
                            </div>
                            <div className="text-xs text-emerald-600">CPR</div>
                        </div>
                    </div>
                    
                    <div className="mt-4 text-sm text-emerald-700">
                        <span className="font-medium">المواقع: </span>
                        <span className="text-emerald-600">
                            {(projects[selectedProject].locations || [selectedProject]).join(', ')}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}