// src/pages/EngineerPage.jsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SearchableInput from "../components/SearchableInput";
import { API_URL } from "../config";

export default function EngineerPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // الحصول على النوع من الرابط، الافتراضي هو IR
    const requestType = searchParams.get("type")?.toUpperCase() || "IR";

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const department = user?.department || "";

    // تحقق إذا كان المستخدم مدنياً (يسمح له بإنشاء CPR)
    const isCivilEngineer = department?.toLowerCase().includes("civil") ||
        department?.toLowerCase().includes("structure");

    // Form states
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedLocation, setSelectedLocation] = useState("");
    const [selectedFloor, setSelectedFloor] = useState(""); // ✅ حقل Floor جديد
    const [generalDesc, setGeneralDesc] = useState("");
    const [finalDescription, setFinalDescription] = useState("");

    // حقول CPR الإضافية
    const [pouringElement, setPouringElement] = useState("");

    // حقول Tags
    const [irTags, setIrTags] = useState([]);
    const [sdTags, setSdTags] = useState([]);
    const [irInput, setIrInput] = useState("");
    const [sdInput, setSdInput] = useState("");
    const [saving, setSaving] = useState(false);
    const [baseDescriptions, setBaseDescriptions] = useState([]);
    const [floors, setAvailableFloors] = useState([]);
    const [cprElements, setCprElements] = useState([]);

    // UI / data states
    const [projects, setProjects] = useState([]);
    const [locations, setLocations] = useState([]);
    const [typesMap, setTypesMap] = useState({});
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingData, setLoadingData] = useState(false);

    // REV modal
    const [showRevModal, setShowRevModal] = useState(false);
    const [revProject, setRevProject] = useState("");
    const [revText, setRevText] = useState("");
    const [revNote, setRevNote] = useState("");
    const [revSaving, setRevSaving] = useState(false);

    // 1. تحميل المشاريع والإعدادات
    useEffect(() => {
        fetch(`${API_URL}/projects`)
            .then(r => r.json())
            .then(data => {
                const projectList = Object.keys(data.projects || {}).sort();
                console.log("📋 Projects loaded:", projectList);
                setProjects(projectList);
            })
            .catch((err) => {
                console.error("Projects load failed:", err);
                // قيم افتراضية للمشاريع
                setProjects(["D6-A1", "D6-A2", "D1-A2-02-01-F.F", "D1-V2B"]);
            })
            .finally(() => setLoadingProjects(false));
    }, []);

    // دالة محسنة لتحميل الأوصاف
    const loadDescriptions = (projectName) => {
        console.log(`🔄 Loading descriptions for:`, {
            project: projectName,
            department,
            requestType
        });

        if (!projectName || !department) {
            console.log("⚠️ Missing project or department");
            if (requestType === "CPR") {
                setBaseDescriptions(["Select concrete pouring element..."]);
                setCprElements(["Foundation", "Columns", "Beams", "Slabs", "Walls"]);
            } else {
                setBaseDescriptions(["Please select a project first"]);
                setAvailableFloors(["Basement", "Ground Floor"]);
            }
            return;
        }

        // إذا كان CPR، تأكد من أن المستخدم مدني
        if (requestType === "CPR" && !isCivilEngineer) {
            console.warn("⚠️ Non-civil engineer trying to access CPR descriptions");
            setBaseDescriptions(["CPR is only available for Civil/Structure engineers"]);
            setCprElements([]);
            return;
        }

        console.log(`🔗 Calling API: ${API_URL}/general-descriptions?project=${projectName}&dept=${department}&requestType=${requestType}`);

        fetch(`${API_URL}/general-descriptions?project=${projectName}&dept=${department}&requestType=${requestType}`)
            .then(r => {
                console.log(`📡 Descriptions API Response status: ${r.status}`);
                if (!r.ok) {
                    throw new Error(`HTTP error! status: ${r.status}`);
                }
                return r.json();
            })
            .then(data => {
                console.log("✅ Loaded descriptions data:", data);

                if (requestType === "CPR") {
                    // ✅ لـ CPR: استخدم base و grades و elements
                    const baseElements = data.base || ["Foundation", "Columns", "Beams", "Slabs", "Walls"];
                    const grades = data.grades || ["K-250", "K-300", "K-350", "K-400"];
                    const elements = data.elements || ["Foundation", "Columns", "Beams", "Slabs", "Walls"];

                    setBaseDescriptions(baseElements);
                    setCprElements(elements);

                    console.log("🏗️ CPR data loaded:", {
                        baseElements,
                        grades,
                        elements
                    });
                } else {
                    // IR عادي: استخدام البيانات الأصلية
                    setBaseDescriptions(data.base || ["Inspection request"]);
                    setAvailableFloors(data.floors || ["Basement", "Ground Floor"]);
                }
            })
            .catch((err) => {
                console.error("❌ Descriptions load failed:", err);

                // قيم افتراضية
                if (requestType === "CPR") {
                    const defaultBase = ["Foundation", "Columns", "Beams", "Slabs", "Walls"];
                    setBaseDescriptions(defaultBase);
                    setCprElements(["Foundation", "Columns", "Beams", "Slabs", "Walls"]);
                } else {
                    setBaseDescriptions([
                        "Inspection of structural elements",
                        "Concrete pouring inspection",
                        "Rebar installation inspection",
                        "Formwork inspection"
                    ]);
                    setAvailableFloors(["Basement", "Ground Floor", "1st Floor", "2nd Floor"]);
                }
            });
    };

    // 2. تحميل المواقع عند اختيار المشروع
    useEffect(() => {
        if (!selectedProject) {
            console.log("⚠️ No project selected for locations");
            setLocations([]);
            setTypesMap({});
            return;
        }

        console.log(`🔄 Loading locations for project: ${selectedProject}`);
        setLoadingData(true);

        // إظهار loading state
        setLocations(["Loading locations..."]);

        fetch(`${API_URL}/locations?project=${selectedProject}`)
            .then(r => {
                console.log(`📡 Locations API Response status: ${r.status}`);
                if (!r.ok) {
                    throw new Error(`HTTP error! status: ${r.status}`);
                }
                return r.json();
            })
            .then(data => {
                console.log("✅ Locations API response:", {
                    locationsCount: data.locations?.length,
                    typesMapCount: Object.keys(data.types_map || {}).length,
                    sampleLocations: data.locations?.slice(0, 3)
                });

                if (!data.locations || data.locations.length === 0) {
                    console.warn("⚠️ No locations returned from API");
                    setLocations([`No locations configured for ${selectedProject}`]);
                    setTypesMap({});
                } else {
                    // استخدام البيانات مباشرة
                    setLocations(data.locations);
                    setTypesMap(data.types_map || {});
                    console.log(`📍 Set ${data.locations.length} locations and types map`);
                }

                // ✅ تحميل الأوصاف بعد تحميل المشروع
                loadDescriptions(selectedProject);
            })
            .catch((err) => {
                console.error("❌ Locations load failed:", err);

                setLocations([
                    `Error loading locations for ${selectedProject}`,
                    "Please check API connection"
                ]);
                setTypesMap({});

                // مع ذلك، حاول تحميل الأوصاف
                loadDescriptions(selectedProject);
            })
            .finally(() => {
                setLoadingData(false);
            });
    }, [selectedProject]);

    // 3. تحديث الوصف النهائي تلقائياً
    useEffect(() => {
        let description = generalDesc || "";

        const locStr = selectedLocation ? ` ${selectedLocation}` : "";

        let finalDesc = "";

        if (requestType === "CPR") {
            // ✅ لـ CPR: Concrete Pouring Request for [وصف] [الموقع]
            finalDesc = `Concrete Pouring Request for ${description} At${locStr}`;
        } else {
            // ✅ لـ IR العادي: [وصف] [الموقع] [الطابق] (نوع)
            const floorStr = selectedFloor ? ` ${selectedFloor}` : "";
            const typeStr = typesMap[selectedLocation] ? ` (${typesMap[selectedLocation]})` : "";
            finalDesc = `${description} For${floorStr} AT${locStr}${typeStr}`.trim();
        }

        setFinalDescription(finalDesc);
        console.log("📝 Final description updated:", finalDesc);

    }, [generalDesc, selectedLocation, selectedFloor, typesMap, requestType]);

    // 🛠️ دالة مساعدة لإعادة تحميل البيانات (إذا كنت بحاجة لها)
    const reloadData = () => {
        // يمكنك إضافة أي إعادة تحميل للبيانات هنا إذا لزم الأمر
        console.log("🔄 Reloading data...");
        
        // إعادة تحميل المشاريع
        fetch(`${API_URL}/projects`)
            .then(r => r.json())
            .then(data => {
                const projectList = Object.keys(data.projects || {}).sort();
                setProjects(projectList);
            })
            .catch((err) => {
                console.error("Failed to reload projects:", err);
            });
        
        // إذا كان هناك مشروع محدد، إعادة تحميل مواقعه
        if (selectedProject) {
            loadDescriptions(selectedProject);
        }
    };

    // دالة الإرسال (Submit)
    const handleSave = async () => {
        // ✅ التحقق الإضافي لـ CPR
        if (requestType === "CPR" && !isCivilEngineer) {
            alert("CPR requests are only available for Civil/Structure engineers");
            return;
        }

        // التحقق من الحقول المطلوبة
        if (!selectedProject) {
            alert("Please select a project");
            return;
        }

        if (!selectedLocation) {
            alert("Please select a location");
            return;
        }

        if (!generalDesc) {
            alert("Please select a work description");
            return;
        }

        // ✅ تحقق إضافي لـ IR: يجب اختيار الطابق
        if (requestType === "IR" && !selectedFloor) {
            alert("Please select a floor for IR requests");
            return;
        }

        setSaving(true);

        // ✅ إنشاء payload مختلف لـ CPR و IR
        let payload;

        if (requestType === "CPR") {
            // ✅ لـ CPR: بدون floor
            payload = {
                project: selectedProject,
                location: selectedLocation,
                // ❌ NO FLOOR FOR CPR
                desc: finalDescription,
                user: user.username,
                department: department,
                requestType: "CPR",
                engineerNote: irInput,
                sdNote: sdInput,
                tags: { engineer: irTags, sd: sdTags },
                // ✅ إضافة حقول CPR الإضافية
                pouringElement: generalDesc || ""
            };
        } else {
            // ✅ لـ IR العادي: مع floor
            payload = {
                project: selectedProject,
                location: selectedLocation,
                floor: selectedFloor || "", // ✅ نحتاج الـ floor لـ IR
                desc: finalDescription,
                user: user.username,
                department: department,
                requestType: "IR",
                engineerNote: irInput,
                sdNote: sdInput,
                tags: { engineer: irTags, sd: sdTags }
            };
        }

        console.log("📤 Submitting payload:", payload);

        try {
            const res = await fetch(`${API_URL}/irs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                alert(`${requestType === "CPR" ? "ORC (CPR)" : requestType} Created Successfully!\nNumber: ${data.ir?.irNo || "Generated"}`);

                // ريست للفورم
                resetForm();

                // إذا كان CPR، العودة إلى IR تلقائياً
                if (requestType === "CPR") {
                    setTimeout(() => {
                        navigate("/engineer?type=IR");
                    }, 1500);
                }
            } else {
                throw new Error(data.error || `Failed to create ${requestType}`);
            }
        } catch (err) {
            console.error("Save error:", err);
            alert(`Error saving ${requestType}: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    // دالة إعادة تعيين الفورم
    const resetForm = () => {
        setGeneralDesc("");
        setIrTags([]);
        setSdTags([]);
        setIrInput("");
        setSdInput("");
        setSelectedLocation("");
        setSelectedFloor(""); // ✅ إعادة تعيين floor
        setFinalDescription("");
        setPouringElement(""); // ✅ إعادة تعيين عنصر الصب
    };

    // تبديل بين IR و CPR
    const switchRequestType = (type) => {
        const newType = type.toUpperCase();

        // ✅ إذا كان المستخدم يحاول الوصول لـ CPR وهو ليس مدنياً
        if (newType === "CPR" && !isCivilEngineer) {
            alert("CPR requests are only available for Civil/Structure engineers");
            return;
        }

        setSearchParams({ type: type.toLowerCase() });
        resetForm();
        setSelectedProject(""); // إعادة تعيين المشروع أيضاً

        // عند التبديل، إعادة تحميل الأوصاف إذا كان هناك مشروع محدد
        if (selectedProject) {
            loadDescriptions(selectedProject);
        }
    };

    // دالة إضافة REVISION
    async function handleSaveRev() {
        if (!revProject || !revText.trim()) {
            alert("Please select project and enter revision number");
            return;
        }

        // تحديد نوع الـ Revision بناءً على صلاحية المستخدم
        let revisionType = "IR_REVISION";
        let parentRequestType = "IR";

        // إذا كان المستخدم في صفحة CPR وكان مدنياً
        if (requestType === "CPR") {
            if (!isCivilEngineer) {
                alert("CPR revisions are only available for Civil/Structure engineers");
                return;
            }
            revisionType = "CPR_REVISION";
            parentRequestType = "CPR";
        }

        setRevSaving(true);
        try {
            const res = await fetch(`${API_URL}/revs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project: revProject,
                    revText: revText.trim(),  // ⭐⭐ **الرقم الذي يدخله المهندس** ⭐⭐
                    revNote: revNote,
                    user: user.username,
                    department: department,
                    revisionType: revisionType,
                    parentRequestType: parentRequestType
                })
            });

            const data = await res.json();

            if (res.ok) {
                const revTypeDisplay = revisionType === "CPR_REVISION" ? "CPR Revision" : "IR Revision";
                const displayNum = data.rev?.displayNumber || data.rev?.userRevNumber || "REV";
                
                alert(`✅ ${revTypeDisplay} ${displayNum} Sent to DC!`);
                console.log("✅ Revision created:", data.rev);

                console.log("📤 Revision Data Sent:", {
                    revNo: data.rev?.revNo,
                    displayNumber: data.rev?.displayNumber,
                    userRevNumber: data.rev?.userRevNumber,
                    project: revProject,
                    revText: revText.trim(),
                    revisionType: revisionType,
                    user: user.username,
                    department: department,
                    isCPRRevision: data.rev?.isCPRRevision,
                    isIRRevision: data.rev?.isIRRevision
                });

                setShowRevModal(false);
                setRevProject("");
                setRevText("");
                setRevNote("");
                
                // ❌ **تم إزالة استدعاء loadAllData الغير معرف** ❌
                // ❌ setTimeout(() => { loadAllData(); }, 1000); // ❌ هذا الخطأ
                
                // ✅ بدلاً من ذلك، يمكننا إعادة تحميل البيانات إذا لزم الأمر
                // reloadData(); // ❓ إذا كنت بحاجة لإعادة تحميل البيانات
            } else {
                throw new Error(data.error || `Failed to create revision`);
            }
        } catch (err) {
            console.error("Revision creation error:", err);
            alert(`❌ Failed to create revision: ${err.message}`);
        } finally {
            setRevSaving(false);
        }
    }

    // دالة إضافة Tag مع Enter
    const handleKeyPress = (e, type) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (type === 'engineer' && irInput.trim()) {
                setIrTags(prev => [...prev, irInput.trim()]);
                setIrInput("");
            } else if (type === 'site' && sdInput.trim()) {
                setSdTags(prev => [...prev, sdInput.trim()]);
                setSdInput("");
            }
        }
    };

    // دالة إضافة Tag بالزر
    const handleAddEngineerNote = () => {
        if (irInput.trim()) {
            setIrTags(prev => [...prev, irInput.trim()]);
            setIrInput("");
        }
    };

    const handleAddSiteDiaryNote = () => {
        if (sdInput.trim()) {
            setSdTags(prev => [...prev, sdInput.trim()]);
            setSdInput("");
        }
    };

    // إزالة وسم
    const removeTag = (index, setTags) => {
        setTags(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="max-w-5xl mx-auto pt-8 px-4">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b pb-6 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">
                            {requestType === "CPR" ? "🏗️ Concrete Pouring Request (ORC)" : "📝 Inspection Request (IR)"}
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Logged in as: <span className="font-semibold text-blue-600">{user.username}</span> ({department})
                            {requestType === "CPR" && (
                                <span className={`ml-2 ${isCivilEngineer ? "text-green-600" : "text-red-600"}`}>
                                    {isCivilEngineer ? "✓ Civil Engineer" : "✗ Non-Civil"}
                                </span>
                            )}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* نوع الطلب */}
                        <div className="bg-white rounded-lg shadow-sm border p-1">
                            <button
                                onClick={() => switchRequestType("IR")}
                                className={`px-4 py-2 rounded-md transition ${requestType === "IR" ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-600"}`}
                            >
                                IR
                            </button>

                            {isCivilEngineer && (
                                <button
                                    onClick={() => switchRequestType("CPR")}
                                    className={`px-4 py-2 rounded-md transition ${requestType === "CPR" ? "bg-green-600 text-white" : "hover:bg-gray-100 text-gray-600"}`}
                                >
                                    CPR
                                </button>
                            )}
                        </div>

                        {/* زر إنشاء REV */}
                        <button
                            onClick={() => setShowRevModal(true)}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-bold shadow-md transition"
                        >
                            + Create REV
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Project Information */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                            {requestType === "CPR" ? "Concrete Pouring Information (ORC)" : "Inspection Request Information"}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SearchableInput
                                label="Project Name"
                                options={projects}
                                value={selectedProject}
                                onChange={setSelectedProject}
                                placeholder="Select project..."
                                loading={loadingProjects}
                                disabled={loadingProjects}
                            />

                            <SearchableInput
                                label="Location / Block"
                                options={locations}
                                value={selectedLocation}
                                onChange={setSelectedLocation}
                                placeholder={selectedProject ? "Select location..." : "Select project first"}
                                disabled={!selectedProject || locations.length === 0}
                                noOptionsMessage={selectedProject && locations.length === 0 ? "No locations found" : ""}
                            />

                            {requestType === "CPR" ? (
                                <>
                                    <SearchableInput
                                        label="Concrete Pouring Element"
                                        options={baseDescriptions}
                                        value={generalDesc}
                                        onChange={setGeneralDesc}
                                        placeholder="Select concrete pouring element..."
                                        disabled={!selectedProject}
                                        noOptionsMessage={selectedProject && baseDescriptions.length === 0 ? "No elements available" : ""}
                                    />

                                </>
                            ) : (
                                <>
                                    <SearchableInput
                                        label="Work Description"
                                        options={baseDescriptions}
                                        value={generalDesc}
                                        onChange={setGeneralDesc}
                                        placeholder="Select work description..."
                                        disabled={!selectedProject}
                                        noOptionsMessage={selectedProject && baseDescriptions.length === 0 ? "No descriptions available" : ""}
                                    />

                                    <SearchableInput
                                        label="Floor"
                                        options={floors}
                                        value={selectedFloor}
                                        onChange={setSelectedFloor}
                                        placeholder="Select floor..."
                                        disabled={!selectedProject}
                                        noOptionsMessage={selectedProject && floors.length === 0 ? "No floors available" : ""}
                                    />
                                </>
                            )}
                        </div>

                        {/* تنبيه CPR فقط للمهندسين المدنيين */}
                        {requestType === "CPR" && !isCivilEngineer && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700 text-sm font-medium">
                                    ⚠️ ORC (CPR) requests are only available for Civil/Structure engineers.
                                </p>
                            </div>
                        )}

                        {/* Loading Indicator */}
                        {loadingData && (
                            <div className="mt-4 flex items-center justify-center p-2">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                <span className="ml-2 text-sm text-gray-600">Loading data...</span>
                            </div>
                        )}
                    </div>

                    {/* Tags Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-700 mb-4">Tags & Notes</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    IR Attatch
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={irInput}
                                        onChange={(e) => setIrInput(e.target.value)}
                                        onKeyPress={(e) => handleKeyPress(e, 'engineer')}
                                        className="flex-1 p-2 border rounded-lg"
                                        placeholder="Add IR Attatch"
                                    />
                                    <button
                                        onClick={handleAddEngineerNote}
                                        className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {irTags.map((tag, idx) => (
                                        <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                            {tag}
                                            <button
                                                onClick={() => removeTag(idx, setIrTags)}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    SD Attatch
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={sdInput}
                                        onChange={(e) => setSdInput(e.target.value)}
                                        onKeyPress={(e) => handleKeyPress(e, 'site')}
                                        className="flex-1 p-2 border rounded-lg"
                                        placeholder="Add SD Attatch"
                                    />
                                    <button
                                        onClick={handleAddSiteDiaryNote}
                                        className="bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {sdTags.map((tag, idx) => (
                                        <span key={idx} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                            {tag}
                                            <button
                                                onClick={() => removeTag(idx, setSdTags)}
                                                className="text-green-600 hover:text-green-800"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Final Description */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-lg font-bold text-gray-700">
                                Final Generated Description
                            </label>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${requestType === "CPR" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                                {requestType === "CPR" ? "ORC" : requestType}
                            </span>
                        </div>
                        <textarea
                            className="w-full p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 font-medium"
                            rows={3}
                            value={finalDescription}
                            onChange={(e) => setFinalDescription(e.target.value)}
                            placeholder="Description will be generated automatically..."
                        />
                        <p className="text-xs text-gray-400 mt-2 italic">
                            * You can manually edit the final text if needed
                        </p>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving || !selectedProject || !selectedLocation || !generalDesc || (requestType === "IR" && !selectedFloor)}
                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all ${saving || !selectedProject || !selectedLocation || !generalDesc || (requestType === "IR" && !selectedFloor)
                            ? "bg-gray-400 cursor-not-allowed"
                            : requestType === "CPR"
                                ? "bg-green-600 hover:bg-green-700 hover:-translate-y-1"
                                : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-1"
                            }`}
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                                Processing...
                            </span>
                        ) : requestType === "CPR" ? (
                            "Submit ORC (CPR) Request"
                        ) : (
                            "Submit Inspection Request"
                        )}
                    </button>
                </div>
            </div>

            {/* Revision Modal */}
            {showRevModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-amber-500 p-4 text-white flex justify-between items-center">
                            <h2 className="text-xl font-bold">Create New Revision (REV)</h2>
                            <button
                                onClick={() => setShowRevModal(false)}
                                className="text-2xl hover:opacity-70"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <SearchableInput
                                label="Select Project"
                                options={projects}
                                value={revProject}
                                onChange={setRevProject}
                            />
                            <div>
                                <label className="block font-bold text-gray-700 mb-1 text-sm">
                                </label>
                                <input
                                    type="text"
                                    value={revText}
                                    onChange={(e) => setRevText(e.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-amber-500 outline-none"
                                    placeholder="أدخل رقم المراجعة (مثل: R1, R2, 001...)"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Rev No
                                </p>
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-1 text-sm">
                                    Additional Notes (Optional)
                                </label>
                                <textarea
                                    value={revNote}
                                    onChange={(e) => setRevNote(e.target.value)}
                                    className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-amber-500 outline-none"
                                    rows={2}
                                    placeholder="Any additional details..."
                                />
                            </div>
                            <button
                                onClick={handleSaveRev}
                                disabled={revSaving || !revProject || !revText.trim()}
                                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition disabled:bg-gray-300"
                            >
                                {revSaving ? "Creating..." : "Submit Revision"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
