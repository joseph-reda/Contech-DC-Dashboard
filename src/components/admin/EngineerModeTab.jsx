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
    const [requestType, setRequestType] = useState("IR"); // IR, CPR, SD
    const [department, setDepartment] = useState(user?.department || "ST");

    // Data States
    const [generalDescriptions, setGeneralDescriptions] = useState([]);
    const [locationRules, setLocationRules] = useState({});
    const [locations, setLocations] = useState([]);
    const [floors, setFloors] = useState([]);
    const [descriptions, setDescriptions] = useState([]);
    const [sheetTitles, setSheetTitles] = useState([]); // for Shop Drawing

    // CPR Specific States
    const [concreteGrade, setConcreteGrade] = useState("");
    const [pouringElement, setPouringElement] = useState("");
    const [cprDescriptions, setCprDescriptions] = useState([]);
    const [cprGrades, setCprGrades] = useState([]);
    const [cprElements, setCprElements] = useState([]);

    // Shop Drawing Specific States
    const [sdSubject, setSdSubject] = useState("");
    const [isRevision, setIsRevision] = useState(false);
    const [parentSdNo, setParentSdNo] = useState("");
    const [sheets, setSheets] = useState([
        { sheetTitle: "", sheetNumber: "", sheetRevision: "0" }
    ]);

    // User History
    const [userIRs, setUserIRs] = useState([]);
    const [userRevisions, setUserRevisions] = useState([]);
    const [userSDs, setUserSDs] = useState([]);

    // Statistics
    const [stats, setStats] = useState({
        totalIRs: 0,
        totalCPRs: 0,
        totalRevisions: 0,
        totalSDs: 0,
        pendingIRs: 0,
        completedIRs: 0,
        pendingSDs: 0,
        completedSDs: 0
    });

    // Next Number Preview
    const [nextNumberPreview, setNextNumberPreview] = useState("");

    // Departments
    const departments = [
        { value: "ARCH", label: "Architectural", color: "bg-blue-100 text-blue-800", icon: "🏛️" },
        { value: "ST", label: "Structural", color: "bg-green-100 text-green-800", icon: "🏗️" },
        { value: "ELECT", label: "Electrical", color: "bg-purple-100 text-purple-800", icon: "⚡" },
        { value: "MECH", label: "Mechanical", color: "bg-amber-100 text-amber-800", icon: "🔧" },
        { value: "SURV", label: "Survey", color: "bg-indigo-100 text-indigo-800", icon: "📐" }
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
        setLoading(true);
        try {
            await Promise.all([
                loadProjects(),
                loadLocationRules(),
                loadUserHistory(),
                loadStatistics(),
                loadSheetTitles()
            ]);
        } catch (error) {
            console.error("Failed to load engineer data:", error);
            showToast("Failed to load data", "error");
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
                const projectsArray = Object.entries(data.projects || {}).map(([name, data]) => ({
                    name,
                    ...data
                }));
                setProjectsList(projectsArray);
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

    const loadSheetTitles = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/sheet-titles`);
            if (res.ok) {
                const data = await res.json();
                setSheetTitles(data.sheet_titles?.[department] || []);
            }
        } catch (error) {
            console.error("Failed to load sheet titles:", error);
            setSheetTitles([]);
        }
    };

    const loadGeneralDescriptions = async (dept) => {
        try {
            const deptForAPI = dept === "ST" ? "Civil" :
                dept === "ARCH" ? "Architectural" :
                dept === "ELECT" ? "Electrical" :
                dept === "MECH" ? "Mechanical" :
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
                } else if (requestType === "IR") {
                    setGeneralDescriptions(data.base || []);
                    setFloors(data.floors || commonFloors);
                    setDescriptions(data.base || []);
                }
            }
        } catch (error) {
            console.error("Failed to load descriptions:", error);
            setFloors(commonFloors);
            setDescriptions([]);
        }
    };

    const loadUserHistory = async () => {
        if (!user || !department) return;
        try {
            const [irsRes, revsRes, sdRes] = await Promise.all([
                fetch(`${API_URL}/irs?user=${user.username}&dept=${department}`),
                fetch(`${API_URL}/revs?user=${user.username}&dept=${department}`),
                fetch(`${API_URL}/shopdrawings?user=${user.username}&dept=${department}`)
            ]);

            if (irsRes.ok) {
                const data = await irsRes.json();
                setUserIRs(data.irs || []);
            }
            if (revsRes.ok) {
                const data = await revsRes.json();
                setUserRevisions(data.revs || []);
            }
            if (sdRes.ok) {
                const data = await sdRes.json();
                setUserSDs(data.shopdrawings || []);
            }
        } catch (error) {
            console.error("Failed to load user history:", error);
        }
    };

    const loadStatistics = async () => {
        try {
            const irsRes = await fetch(`${API_URL}/irs`);
            const sdRes = await fetch(`${API_URL}/shopdrawings`);
            if (irsRes.ok && sdRes.ok) {
                const irsData = await irsRes.json();
                const sdData = await sdRes.json();
                const userIRsList = (irsData.irs || []).filter(ir => ir.user === user?.username && ir.department === department);
                const userSDsList = (sdData.shopdrawings || []).filter(sd => sd.user === user?.username && sd.department === department);

                setStats({
                    totalIRs: userIRsList.filter(ir => ir.requestType !== "CPR").length,
                    totalCPRs: userIRsList.filter(ir => ir.requestType === "CPR").length,
                    totalRevisions: userRevisions.length,
                    totalSDs: userSDsList.length,
                    pendingIRs: userIRsList.filter(ir => !ir.isDone).length,
                    completedIRs: userIRsList.filter(ir => ir.isDone).length,
                    pendingSDs: userSDsList.filter(sd => !sd.isDone).length,
                    completedSDs: userSDsList.filter(sd => sd.isDone).length
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

        const projectLocations = proj.locations || [projectName];
        setLocations(projectLocations);

        if (projectLocations.length > 0) {
            const firstLocation = projectLocations[0];
            setSelectedLocation(firstLocation);

            const locationRule = locationRules[projectName]?.[firstLocation];
            if (locationRule && locationRule.floors && locationRule.floors.length > 0) {
                setFloors(locationRule.floors);
                setSelectedFloor(locationRule.floors[0]);
            } else {
                setFloors(commonFloors);
                setSelectedFloor(commonFloors[0]);
            }
        }

        await loadGeneralDescriptions(department);
        generateNextNumber(projectName);
    };

    // Generate next number preview
    const generateNextNumber = (projectName) => {
        if (!projectName || !department) return;
        const proj = projects[projectName];
        if (!proj || !proj.counters) return;

        const counterKey = requestType === "CPR" ? "CPR" : (requestType === "SD" ? `SD_${department}` : department);
        const counter = proj.counters[counterKey] || 0;
        const nextCounter = parseInt(counter) + 1;
        const cleanProject = projectName.replace(/\s+/g, '-').toUpperCase();

        let number = "";
        if (requestType === "CPR") {
            number = `BADYA-CON-${cleanProject}-CPR-${nextCounter.toString().padStart(3, '0')}`;
        } else if (requestType === "SD") {
            const year = new Date().getFullYear().toString().slice(-2);
            number = `BADYA-SD-CON-${cleanProject}-${year}-${department}-${nextCounter.toString().padStart(3, '0')}`;
        } else {
            number = `BADYA-CON-${cleanProject}-IR-${department}-${nextCounter.toString().padStart(3, '0')}`;
        }
        setNextNumberPreview(number);
    };

    // Handlers
    const handleProjectChange = async (e) => {
        const projectName = e.target.value;
        setSelectedProject(projectName);
        await updateLocationsAndFloors(projectName);
    };

    const handleLocationChange = (e) => {
        const location = e.target.value;
        setSelectedLocation(location);
        const locationRule = locationRules[selectedProject]?.[location];
        if (locationRule && locationRule.floors && locationRule.floors.length > 0) {
            setFloors(locationRule.floors);
            setSelectedFloor(locationRule.floors[0]);
        } else {
            setFloors(commonFloors);
            setSelectedFloor(commonFloors[0]);
        }
    };

    const handleDepartmentChange = async (e) => {
        const dept = e.target.value;
        setDepartment(dept);
        await loadGeneralDescriptions(dept);
        if (selectedProject) generateNextNumber(selectedProject);
        if (user) {
            await loadUserHistory();
            await loadStatistics();
        }
    };

    const handleRequestTypeChange = async (e) => {
        const type = e.target.value;
        setRequestType(type);
        setConcreteGrade("");
        setPouringElement("");
        setSdSubject("");
        setIsRevision(false);
        setParentSdNo("");
        setSheets([{ sheetTitle: "", sheetNumber: "", sheetRevision: "0" }]);

        await loadGeneralDescriptions(department);
        if (selectedProject) generateNextNumber(selectedProject);
    };

    const handleDescriptionSelect = (desc) => setSelectedDesc(desc);
    const handleGradeSelect = (grade) => setConcreteGrade(grade);
    const handleElementSelect = (element) => setPouringElement(element);

    // Sheet handlers
    const handleAddSheet = () => {
        setSheets([...sheets, { sheetTitle: "", sheetNumber: "", sheetRevision: "0" }]);
    };
    const handleRemoveSheet = (index) => {
        if (sheets.length > 1) setSheets(sheets.filter((_, i) => i !== index));
    };
    const handleSheetChange = (index, field, value) => {
        const newSheets = [...sheets];
        newSheets[index][field] = value;
        setSheets(newSheets);
    };

    // Validate form
    const validateForm = () => {
        if (!selectedProject) {
            showToast("Please select a project", "error");
            return false;
        }
        if (requestType !== "SD") {
            if (!selectedLocation) {
                showToast("Please select a location", "error");
                return false;
            }
            if (!selectedFloor) {
                showToast("Please select a floor", "error");
                return false;
            }
            if (!selectedDesc) {
                showToast("Please select a description", "error");
                return false;
            }
            if (requestType === "CPR") {
                if (!concreteGrade) {
                    showToast("Please select concrete grade", "error");
                    return false;
                }
                if (!pouringElement) {
                    showToast("Please select pouring element", "error");
                    return false;
                }
            }
        } else {
            if (!sdSubject.trim()) {
                showToast("Subject is required", "error");
                return false;
            }
            if (isRevision && !parentSdNo.trim()) {
                showToast("Original SD number is required", "error");
                return false;
            }
            for (let i = 0; i < sheets.length; i++) {
                if (!sheets[i].sheetTitle.trim() || !sheets[i].sheetNumber.trim()) {
                    showToast(`Sheet ${i+1}: Title and Number are required`, "error");
                    return false;
                }
            }
        }
        return true;
    };

    // Submit request
    const handleSubmitRequest = async () => {
        if (!validateForm()) return;
        if (!user) {
            showToast("Please log in first", "error");
            return;
        }

        setSubmitting(true);
        try {
            let payload = {};
            let endpoint = "";

            if (requestType === "SD") {
                endpoint = "shopdrawings";
                payload = {
                    project: selectedProject,
                    department: department,
                    user: user.username,
                    subject: sdSubject,
                    isRevision,
                    parentSdNo: isRevision ? parentSdNo : undefined,
                    sheets: sheets.map(s => ({
                        sheetTitle: s.sheetTitle,
                        sheetNumber: s.sheetNumber,
                        sheetRevision: s.sheetRevision
                    }))
                };
            } else {
                endpoint = "irs";
                payload = {
                    project: selectedProject,
                    department: department,
                    user: user.username,
                    desc: selectedDesc,
                    location: selectedLocation,
                    floor: selectedFloor,
                    requestType: requestType,
                    tags: { engineer: [], sd: [] }
                };
                if (requestType === "CPR") {
                    payload.concreteGrade = concreteGrade;
                    payload.pouringElement = pouringElement;
                }
            }

            const res = await fetch(`${API_URL}/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                showToast(`${requestType} created successfully!`, "success");

                // Reset form
                if (requestType === "SD") {
                    setSdSubject("");
                    setIsRevision(false);
                    setParentSdNo("");
                    setSheets([{ sheetTitle: "", sheetNumber: "", sheetRevision: "0" }]);
                } else {
                    setSelectedDesc("");
                    setConcreteGrade("");
                    setPouringElement("");
                }

                await Promise.all([loadProjects(), loadUserHistory(), loadStatistics()]);
                if (selectedProject) generateNextNumber(selectedProject);
            } else {
                throw new Error(data.error || `Failed to create ${requestType}`);
            }
        } catch (error) {
            console.error("Submit error:", error);
            showToast(error.message, "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Create revision (for IR/CPR)
    const handleCreateRevision = async (ir) => {
        const revText = prompt("Enter revision number (e.g., REV-001):");
        if (!revText) return;
        const revNote = prompt("Enter revision note (optional):");

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
                showToast("Revision created successfully!", "success");
                await loadUserHistory();
            } else {
                throw new Error("Failed to create revision");
            }
        } catch (error) {
            console.error("Create revision error:", error);
            showToast("Failed to create revision", "error");
        } finally {
            setSubmitting(false);
        }
    };

    // Archive item (for engineer)
    const handleArchiveItem = async (item) => {
        if (!window.confirm(`Archive ${item.isRevision ? 'revision' : item.sdNo ? 'shop drawing' : 'IR'} ${item.irNo || item.revNo || item.sdNo}?`)) return;
        setSubmitting(true);
        try {
            const collection = item.isRevision ? "revs" : item.sdNo ? "shopdrawings" : "irs";
            const res = await fetch(`${API_URL}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uniqueId: item.uniqueId || item.id,
                    role: "engineer",
                    collection: collection
                })
            });
            if (res.ok) {
                showToast("Item archived", "success");
                await loadUserHistory();
            } else {
                throw new Error("Failed to archive");
            }
        } catch (error) {
            console.error("Archive error:", error);
            showToast("Failed to archive", "error");
        } finally {
            setSubmitting(false);
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
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch {
            return dateString;
        }
    };

    // Get department info
    const getDeptInfo = (dept) => {
        return departments.find(d => d.value === dept) || { label: dept, color: "bg-gray-100 text-gray-800", icon: "👤" };
    };

    // Get status info
    const getStatusInfo = (item) => {
        if (item.isArchived) return { label: "Archived", color: "bg-gray-100 text-gray-800", icon: "🗄️" };
        if (item.isDone) return { label: "Completed", color: "bg-green-100 text-green-800", icon: "✅" };
        return { label: "Pending", color: "bg-amber-100 text-amber-800", icon: "⏳" };
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading engineer data...</p>
                </div>
            </div>
        );
    }

    const deptInfo = getDeptInfo(department);

    return (
        <div className="p-6">
            {toast.show && (
                <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-top-5 ${
                    toast.type === "error" ? "bg-red-600" : toast.type === "warning" ? "bg-amber-600" : "bg-green-600"
                }`}>
                    <div className="flex items-center gap-2">
                        {toast.type === "error" ? "❌" : toast.type === "warning" ? "⚠️" : "✅"} {toast.message}
                    </div>
                </div>
            )}

            <div className="mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">👷 Engineer Mode</h2>
                        <p className="text-gray-600">Create IR, CPR, and Shop Drawing requests</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${deptInfo.color}`}>{deptInfo.icon} {deptInfo.label}</span>
                            <span className="text-sm text-gray-600">{user?.fullname || user?.username}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={loadAllData} disabled={submitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
                            <span className={submitting ? "animate-spin" : ""}>🔄</span> {submitting ? "Updating..." : "Refresh"}
                        </button>
                        <div className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                            {nextNumberPreview ? `Next: ${nextNumberPreview}` : "Select project"}
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div><p className="text-xs text-blue-700">IR</p><p className="text-lg font-bold text-blue-800">{stats.totalIRs}</p></div><div className="text-xl">📝</div>
                        </div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div><p className="text-xs text-green-700">CPR</p><p className="text-lg font-bold text-green-800">{stats.totalCPRs}</p></div><div className="text-xl">🏗️</div>
                        </div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div><p className="text-xs text-purple-700">Revisions</p><p className="text-lg font-bold text-purple-800">{stats.totalRevisions}</p></div><div className="text-xl">🔄</div>
                        </div>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div><p className="text-xs text-indigo-700">Shop Drawings</p><p className="text-lg font-bold text-indigo-800">{stats.totalSDs}</p></div><div className="text-xl">📐</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Request Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                            {requestType === "CPR" ? "🏗️ Create CPR Request" : requestType === "SD" ? "📐 Create Shop Drawing" : "📝 Create IR"}
                        </h3>

                        {/* Request Type & Department */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
                                <div className="flex gap-2">
                                    <button onClick={() => handleRequestTypeChange({ target: { value: "IR" } })}
                                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                            requestType === "IR" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}><span>📝</span> IR</button>
                                    <button onClick={() => handleRequestTypeChange({ target: { value: "CPR" } })}
                                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                            requestType === "CPR" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`} disabled={department !== "ST"} title={department !== "ST" ? "CPR only for Structural" : ""}><span>🏗️</span> CPR</button>
                                    <button onClick={() => handleRequestTypeChange({ target: { value: "SD" } })}
                                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                            requestType === "SD" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }`}><span>📐</span> SD</button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                                <select value={department} onChange={handleDepartmentChange} className="w-full px-4 py-3 border rounded-lg bg-white">
                                    {departments.map(d => <option key={d.value} value={d.value}>{d.icon} {d.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Project */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Project *</label>
                            <select value={selectedProject} onChange={handleProjectChange} className="w-full px-4 py-3 border rounded-lg bg-white">
                                <option value="">Select project</option>
                                {projectsList.map(p => <option key={p.name} value={p.name}>{p.name} {p.description ? `- ${p.description}` : ''}</option>)}
                            </select>
                        </div>

                        {/* IR/CPR Fields */}
                        {requestType !== "SD" && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                                        <select value={selectedLocation} onChange={handleLocationChange} className="w-full px-4 py-3 border rounded-lg bg-white" disabled={!selectedProject}>
                                            <option value="">Select location</option>
                                            {locations.map((loc, i) => <option key={i} value={loc}>{loc}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Floor *</label>
                                        <select value={selectedFloor} onChange={(e) => setSelectedFloor(e.target.value)} className="w-full px-4 py-3 border rounded-lg bg-white" disabled={!selectedLocation}>
                                            <option value="">Select floor</option>
                                            {floors.map((f, i) => <option key={i} value={f}>{f}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {requestType === "CPR" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Concrete Grade *</label>
                                            <div className="flex flex-wrap gap-2">
                                                {cprGrades.map((grade, i) => (
                                                    <button key={i} type="button" onClick={() => handleGradeSelect(grade)}
                                                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${concreteGrade === grade ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{grade}</button>
                                                ))}
                                            </div>
                                            {concreteGrade && <p className="text-sm text-green-600 mt-2">Selected: {concreteGrade}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Pouring Element *</label>
                                            <div className="flex flex-wrap gap-2">
                                                {cprElements.map((el, i) => (
                                                    <button key={i} type="button" onClick={() => handleElementSelect(el)}
                                                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${pouringElement === el ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{el}</button>
                                                ))}
                                            </div>
                                            {pouringElement && <p className="text-sm text-green-600 mt-2">Selected: {pouringElement}</p>}
                                        </div>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="block text-sm font-medium text-gray-700">Description *</label>
                                        <span className="text-xs text-gray-500">{descriptions.length} options</span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto border rounded-lg p-2">
                                        {descriptions.length === 0 ? (
                                            <div className="text-center py-6 text-gray-500">No descriptions available</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {descriptions.map((desc, i) => (
                                                    <button key={i} type="button" onClick={() => handleDescriptionSelect(desc)}
                                                        className={`w-full text-left p-3 rounded-lg transition-colors ${selectedDesc === desc ? "bg-blue-100 border border-blue-300" : "hover:bg-gray-50"}`}>
                                                        <div className="flex items-start gap-2">
                                                            <div className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center ${selectedDesc === desc ? "bg-blue-600 border-blue-600 text-white text-xs" : "border-gray-300"}`}>
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
                                            <p className="text-sm font-medium text-blue-700 mb-1">Selected:</p>
                                            <p className="text-blue-800">{selectedDesc}</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Shop Drawing Fields */}
                        {requestType === "SD" && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                                    <input type="text" value={sdSubject} onChange={(e) => setSdSubject(e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="e.g., SUN SCREEN FOR A6 PARK-D" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={isRevision} onChange={(e) => setIsRevision(e.target.checked)} className="rounded" id="isRevision" />
                                    <label htmlFor="isRevision" className="text-sm text-gray-700">This is a revision of an existing shop drawing</label>
                                </div>
                                {isRevision && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Original SD Number *</label>
                                        <input type="text" value={parentSdNo} onChange={(e) => setParentSdNo(e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="e.g., BADYA-SD-CON-A6-24-ARCH-155" />
                                    </div>
                                )}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-medium text-gray-700">Sheets</h4>
                                        <button type="button" onClick={handleAddSheet} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">+ Add Sheet</button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full border">
                                            <thead className="bg-gray-50">
                                                <tr><th className="p-2 text-left text-sm">Title</th><th className="p-2 text-left text-sm">Number</th><th className="p-2 text-left text-sm">Revision</th><th className="p-2"></th></tr>
                                            </thead>
                                            <tbody>
                                                {sheets.map((sheet, index) => (
                                                    <tr key={index} className="border-t">
                                                        <td className="p-2"><input type="text" value={sheet.sheetTitle} onChange={(e) => handleSheetChange(index, "sheetTitle", e.target.value)} className="w-full p-2 border rounded" placeholder="e.g., SUNSCREEN ELEVATION 1" /></td>
                                                        <td className="p-2"><input type="text" value={sheet.sheetNumber} onChange={(e) => handleSheetChange(index, "sheetNumber", e.target.value)} className="w-full p-2 border rounded" placeholder="e.g., BA-CON-ARC-A6-PARK-D-ELEV-01" /></td>
                                                        <td className="p-2"><select value={sheet.sheetRevision} onChange={(e) => handleSheetChange(index, "sheetRevision", e.target.value)} className="w-full p-2 border rounded"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></td>
                                                        <td className="p-2">{sheets.length > 1 && <button onClick={() => handleRemoveSheet(index)} className="text-red-600 hover:text-red-800">✕</button>}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Next Number Preview */}
                        {nextNumberPreview && (
                            <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-300 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 mb-1">Expected number:</p>
                                <p className="font-mono font-bold text-lg text-gray-800">{nextNumberPreview}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button onClick={handleSubmitRequest} disabled={submitting || !selectedProject} className={`w-full py-4 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-3 ${
                            submitting || !selectedProject ? "bg-gray-400 cursor-not-allowed" :
                            requestType === "CPR" ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" :
                            requestType === "SD" ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700" :
                            "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        }`}>
                            {submitting ? <><span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span> Submitting...</> : <><span>{requestType === "CPR" ? "🏗️" : requestType === "SD" ? "📐" : "📝"}</span> Submit {requestType}</>}
                        </button>
                    </div>

                    {/* Quick Tips */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                        <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">💡 Quick Tips</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white/50 p-3 rounded-lg">
                                <p className="text-blue-700 text-sm font-medium mb-1">IR</p>
                                <ul className="text-blue-600 text-xs space-y-1"><li>• Select project, location, floor</li><li>• Choose description</li><li>• Number auto-generated</li></ul>
                            </div>
                            <div className="bg-white/50 p-3 rounded-lg">
                                <p className="text-green-700 text-sm font-medium mb-1">CPR</p>
                                <ul className="text-green-600 text-xs space-y-1"><li>• Only for Structural</li><li>• Select grade & element</li><li>• Special descriptions</li></ul>
                            </div>
                            <div className="bg-white/50 p-3 rounded-lg">
                                <p className="text-purple-700 text-sm font-medium mb-1">Shop Drawing</p>
                                <ul className="text-purple-600 text-xs space-y-1"><li>• Enter subject</li><li>• Add sheets</li><li>• Mark as revision if needed</li></ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: User History */}
                <div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800">📋 Previous Requests</h3>
                            <span className="text-sm text-gray-500">{userIRs.length + userRevisions.length + userSDs.length} total</span>
                        </div>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {userIRs.length === 0 && userRevisions.length === 0 && userSDs.length === 0 ? (
                                <div className="text-center py-6 text-gray-500">No previous requests</div>
                            ) : (
                                <>
                                    {userSDs.slice(0, 5).map((sd, idx) => (
                                        <div key={idx} className="border rounded-lg p-3 hover:bg-gray-50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div><div className="font-medium text-gray-800 text-sm">{sd.sdNo}</div><div className="text-xs text-gray-500">{sd.project} • {formatDate(sd.sentAt)}</div></div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusInfo(sd).color}`}>{getStatusInfo(sd).icon}</span>
                                            </div>
                                            <div className="text-xs text-gray-600 line-clamp-2 mb-2">{sd.subject}</div>
                                            <div className="flex justify-between items-center">
                                                <div className="text-xs text-gray-500">📐 {sd.sheets?.length || 0} sheets</div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleArchiveItem(sd)} className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded text-xs" title="Archive">🗄️</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {userIRs.slice(0, 5).map((ir, idx) => (
                                        <div key={idx} className="border rounded-lg p-3 hover:bg-gray-50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div><div className="font-medium text-gray-800 text-sm">{ir.irNo}</div><div className="text-xs text-gray-500">{ir.project} • {formatDate(ir.sentAt)}</div></div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusInfo(ir).color}`}>{getStatusInfo(ir).icon}</span>
                                            </div>
                                            <div className="text-xs text-gray-600 line-clamp-2 mb-2">{ir.desc}</div>
                                            <div className="flex justify-between items-center">
                                                <div className="text-xs text-gray-500">{ir.requestType === "CPR" ? "🏗️ CPR" : "📝 IR"}</div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleCreateRevision(ir)} className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded text-xs" title="Create revision">🔄</button>
                                                    <button onClick={() => handleArchiveItem(ir)} className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded text-xs" title="Archive">🗄️</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {userRevisions.slice(0, 3).map((rev, idx) => (
                                        <div key={idx} className="border rounded-lg p-3 hover:bg-gray-50 bg-amber-50/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div><div className="font-medium text-amber-800 text-sm">{rev.revNo || rev.irNo}</div><div className="text-xs text-amber-600">Revision • {formatDate(rev.sentAt)}</div></div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusInfo(rev).color}`}>{getStatusInfo(rev).icon}</span>
                                            </div>
                                            <div className="text-xs text-gray-600 mb-2">{rev.revNote || rev.desc}</div>
                                            <div className="text-xs text-amber-500">{rev.project}</div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Department Stats */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Department Stats</h3>
                        <div className="space-y-4">
                            <div><div className="flex justify-between text-sm text-gray-600 mb-1"><span>IRs</span><span>{stats.totalIRs}</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stats.totalIRs + stats.totalCPRs > 0 ? (stats.totalIRs / (stats.totalIRs + stats.totalCPRs)) * 100 : 0}%` }}></div></div></div>
                            <div><div className="flex justify-between text-sm text-gray-600 mb-1"><span>CPRs</span><span>{stats.totalCPRs}</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.totalIRs + stats.totalCPRs > 0 ? (stats.totalCPRs / (stats.totalIRs + stats.totalCPRs)) * 100 : 0}%` }}></div></div></div>
                            <div><div className="flex justify-between text-sm text-gray-600 mb-1"><span>Shop Drawings</span><span>{stats.totalSDs}</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full" style={{ width: `${stats.totalSDs > 0 ? (stats.completedSDs / stats.totalSDs) * 100 : 0}%` }}></div></div></div>
                            <div><div className="flex justify-between text-sm text-gray-600 mb-1"><span>Completion Rate</span><span>{stats.totalIRs + stats.totalCPRs > 0 ? Math.round((stats.completedIRs / (stats.totalIRs + stats.totalCPRs)) * 100) : 0}%</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${stats.totalIRs + stats.totalCPRs > 0 ? (stats.completedIRs / (stats.totalIRs + stats.totalCPRs)) * 100 : 0}%` }}></div></div></div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-200"><div className="text-center"><div className="text-2xl font-bold text-gray-800">{stats.totalIRs + stats.totalCPRs + stats.totalRevisions + stats.totalSDs}</div><div className="text-sm text-gray-600">Total Requests</div></div></div>
                    </div>
                </div>
            </div>

            {/* Project Info */}
            {selectedProject && projects[selectedProject] && (
                <div className="mt-6 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3"><div className="text-emerald-600 text-2xl">📁</div><div><h4 className="font-bold text-emerald-800">Project: {selectedProject}</h4><p className="text-emerald-600 text-sm">{projects[selectedProject].description || "No description"}</p></div></div>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        {["ARCH","ST","ELECT","MECH","SURV","CPR"].map(dept => (
                            <div key={dept} className="text-center p-3 bg-white/50 rounded-lg"><div className="text-xl font-bold text-emerald-700">{projects[selectedProject].counters?.[dept] || 0}</div><div className="text-xs text-emerald-600">{dept}</div></div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}