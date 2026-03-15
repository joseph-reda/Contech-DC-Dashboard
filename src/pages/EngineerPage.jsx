// src/pages/EngineerPage.jsx
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SearchableInput from "../components/SearchableInput";
import { API_URL } from "../config";

export default function EngineerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const requestType = searchParams.get("type")?.toLowerCase() || "ir";

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const department = user?.department || "";
  const allowedTypes = user?.allowedRequestTypes || ["ir"];

  useEffect(() => {
    if (!allowedTypes.includes(requestType) && allowedTypes.length > 0) {
      setSearchParams({ type: allowedTypes[0] });
    }
  }, [requestType, allowedTypes, setSearchParams]);

  const isCivilEngineer =
    department === "ST" ||
    department?.toLowerCase().includes("civil") ||
    department?.toLowerCase().includes("structure");

  // حقول IR/CPR
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [generalDesc, setGeneralDesc] = useState("");
  const [finalDescription, setFinalDescription] = useState("");
  const [isEditingFinalDesc, setIsEditingFinalDesc] = useState(false);
  const [originalFinalDesc, setOriginalFinalDesc] = useState("");

  // حقل Survey Level (يظهر فقط للمساحين)
  const [surveyInput, setSurveyInput] = useState("");
  const [surveyLevels, setSurveyLevels] = useState([]); // قائمة الخيارات من general_descriptions

  // حقول Shop Drawing
  const [sdSubject, setSdSubject] = useState("");
  const [protoTypes, setProtoTypes] = useState([]); // مصفوفة { type, level, levelOptions }
  const [sdTypeOptions, setSdTypeOptions] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [isRevision, setIsRevision] = useState(false);
  const [parentSdNo, setParentSdNo] = useState("");
  const [sheets, setSheets] = useState([
    { sheetTitle: "", sheetNumber: "", sheetRevision: "0", type: "", level: "", levelOptions: [] }
  ]);

  // بيانات القوائم
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [sheetTitleOptions, setSheetTitleOptions] = useState([]);
  const [loadingSdData, setLoadingSdData] = useState(false);

  // Tags
  const [irTags, setIrTags] = useState([]);
  const [sdTags, setSdTags] = useState([]);
  const [irInput, setIrInput] = useState("");
  const [sdInput, setSdInput] = useState("");

  // حالات التحميل والحفظ
  const [saving, setSaving] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // بيانات المشاريع والمواقع
  const [projects, setProjects] = useState([]);
  const [locations, setLocations] = useState([]);
  const [typesMap, setTypesMap] = useState({});
  const [baseDescriptions, setBaseDescriptions] = useState([]);
  const [floors, setAvailableFloors] = useState([]);
  const [projectCounters, setProjectCounters] = useState({});

  // نافذة إنشاء مراجعة
  const [showRevModal, setShowRevModal] = useState(false);
  const [revProject, setRevProject] = useState("");
  const [revText, setRevText] = useState("");
  const [revNote, setRevNote] = useState("");
  const [revSaving, setRevSaving] = useState(false);

  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const showToastMessage = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  }, []);

  const getDepartmentAbbr = useCallback((dept) => {
    if (!dept) return "ST";
    const d = dept.toUpperCase();
    if (d.includes("ARCH")) return "ARCH";
    if (d.includes("CIVIL") || d.includes("STRUCT")) return "ST";
    if (d.includes("ELECT")) return "ELECT";
    if (d.includes("MECH") || d.includes("MEP")) return "MECH";
    if (d.includes("SURV")) return "SURV";
    return "ST";
  }, []);

  // دالة لاستخراج أول حرف من أول كلمتين من النص
  const getInitialsFromTitle = (title) => {
    if (!title) return "XX";
    const words = title.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    } else {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
  };

  // دالة لتوليد رقم الورقة باستخدام Type ومستوى الورقة نفسها
  const generateSheetNumber = useCallback((sheetIndex, sheet) => {
    if (!selectedProject || !department) return "";
    const deptAbbr = getDepartmentAbbr(department);
    const cleanProject = selectedProject.replace(/\s+/g, "-").toUpperCase();
    const titleInitials = getInitialsFromTitle(sheet.sheetTitle);
    const sheetType = sheet.type || "";
    const sheetLevel = sheet.level || "";
    return `BA-CON-${cleanProject}-SD-${deptAbbr}-${sheetType}-${sheetLevel}-${titleInitials}-${(sheetIndex + 1).toString().padStart(3, "0")}`;
  }, [selectedProject, department, getDepartmentAbbr]);

  // تحديث أرقام الأوراق عند تغيير أي من البيانات المؤثرة
  useEffect(() => {
    if (requestType !== "sd") return;
    const updatedSheets = sheets.map((sheet, index) => ({
      ...sheet,
      sheetNumber: generateSheetNumber(index, sheet)
    }));
    setSheets(updatedSheets);
  }, [selectedProject, department, sheets.map(s => s.sheetTitle).join(','), sheets.map(s => s.type).join(','), sheets.map(s => s.level).join(','), requestType, generateSheetNumber]);

  // تحميل المشاريع
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch(`${API_URL}/projects`);
      const data = await res.json();
      const projectList = Object.keys(data.projects || {}).sort();
      const countersMap = {};
      Object.entries(data.projects || {}).forEach(([name, projData]) => {
        countersMap[name] = projData.counters || {};
      });
      setProjects(projectList);
      setProjectCounters(countersMap);
    } catch (err) {
      console.error("Projects load failed:", err);
      setProjects(["Project A", "Project B", "Project C", "Project D"]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // تحميل المواقع (لـ IR/CPR)
  useEffect(() => {
    if (requestType === "sd") {
      setLocations([]);
      return;
    }
    if (!selectedProject) {
      setLocations([]);
      setTypesMap({});
      return;
    }
    const loadLocations = async () => {
      setLoadingData(true);
      try {
        const res = await fetch(`${API_URL}/locations?project=${selectedProject}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setLocations(data.locations || []);
        setTypesMap(data.types_map || {});
      } catch (err) {
        console.error("Locations load failed:", err);
        setLocations([`No locations configured for ${selectedProject}`]);
        setTypesMap({});
      } finally {
        setLoadingData(false);
      }
    };
    loadLocations();
  }, [selectedProject, requestType]);

  // تحميل الأوصاف العامة (IR/CPR)
  const loadDescriptions = useCallback(async () => {
    if (requestType === "sd") return;
    if (!selectedProject || !department) return;
    try {
      const res = await fetch(
        `${API_URL}/general-descriptions?project=${selectedProject}&dept=${department}&requestType=${requestType.toUpperCase()}`
      );
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (requestType === "cpr") {
        setBaseDescriptions(data.base || ["Slab", "Column", "Beam", "Wall", "Foundation"]);
      } else {
        setBaseDescriptions(data.base || ["Concrete Works", "Steel Reinforcement", "Formwork"]);
        setAvailableFloors(data.floors || ["Ground Floor", "1st Floor", "2nd Floor", "Roof"]);
        // تخزين الـ levels الخاصة بـ Survey إذا كانت موجودة
        setSurveyLevels(data.levels || []);
      }
    } catch (err) {
      console.error("Descriptions load failed:", err);
    }
  }, [selectedProject, department, requestType]);

  useEffect(() => {
    loadDescriptions();
  }, [loadDescriptions]);

  // تحميل بيانات SD (subjects, sheets)
  useEffect(() => {
    if (requestType !== "sd" || !department) return;
    const loadSdData = async () => {
      setLoadingSdData(true);
      try {
        const deptMap = {
          ARCH: "Architectural",
          ST: "Civil",
          ELECT: "Electrical",
          MECH: "Mechanical",
          SURV: "Survey",
        };
        const deptName = deptMap[department] || department;

        const subjectsRes = await fetch(`${API_URL}/admin/subject-titles/${deptName}`);
        if (subjectsRes.ok) {
          const subjectsData = await subjectsRes.json();
          console.log("Subjects loaded:", subjectsData.subjects);
          setSubjectOptions(subjectsData.subjects || []);
        } else {
          setSubjectOptions([]);
        }

        const sheetsRes = await fetch(`${API_URL}/admin/sheet-titles/${deptName}`);
        if (sheetsRes.ok) {
          const sheetsData = await sheetsRes.json();
          console.log("Sheets loaded:", sheetsData.sheets);
          setSheetTitleOptions(sheetsData.sheets || []);
        } else {
          setSheetTitleOptions([]);
        }
      } catch (err) {
        console.error("Error loading SD data:", err);
        setSubjectOptions([]);
        setSheetTitleOptions([]);
      } finally {
        setLoadingSdData(false);
      }
    };
    loadSdData();
  }, [requestType, department]);

  // تحميل خيارات Type من `/sd-types?project=...`
  useEffect(() => {
    if (requestType !== "sd" || !selectedProject) {
      setSdTypeOptions([]);
      return;
    }
    const fetchTypes = async () => {
      setLoadingTypes(true);
      try {
        const res = await fetch(`${API_URL}/sd-types?project=${encodeURIComponent(selectedProject)}`);
        if (res.ok) {
          const data = await res.json();
          setSdTypeOptions(data.types || []);
        } else {
          setSdTypeOptions([]);
        }
      } catch (err) {
        console.error("Error loading types:", err);
        setSdTypeOptions([]);
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchTypes();
  }, [requestType, selectedProject]);

  // دالة لجلب خيارات المستوى لنوع معين
  const fetchLevelsForType = async (type) => {
    if (!type || !selectedProject) return [];
    try {
      const res = await fetch(`${API_URL}/sd-levels?project=${encodeURIComponent(selectedProject)}&type=${encodeURIComponent(type)}`);
      if (res.ok) {
        const data = await res.json();
        return data.levels || [];
      }
    } catch (err) {
      console.error("Error loading levels:", err);
    }
    return [];
  };

  // دوال لإدارة protoTypes (اختيار متعدد)
const handleAddProtoType = (newType) => {
  if (!newType) return;
  if (protoTypes.some(p => p.type === newType)) return;
  setProtoTypes(prev => [...prev, { type: newType, levels: [], levelOptions: [] }]);
  fetchLevelsForType(newType).then(levels => {
    setProtoTypes(prev => prev.map(p => p.type === newType ? { ...p, levelOptions: levels } : p));
  });
};

  const handleAddLevel = (type, level) => {
  if (!level) return;
  setProtoTypes(prev => prev.map(p => 
    p.type === type 
      ? { ...p, levels: [...p.levels, level] }
      : p
  ));
};

const handleRemoveLevel = (type, levelToRemove) => {
  setProtoTypes(prev => prev.map(p => 
    p.type === type 
      ? { ...p, levels: p.levels.filter(l => l !== levelToRemove) }
      : p
  ));
};

  const handleRemoveProtoType = (typeToRemove) => {
    setProtoTypes(prev => prev.filter(p => p.type !== typeToRemove));
  };

  const handleProtoTypeLevelChange = (type, level) => {
    setProtoTypes(prev => prev.map(p => p.type === type ? { ...p, level } : p));
  };

  // دوال لإدارة الأوراق
  const handleAddSheet = () => {
    setSheets(prev => [...prev, { sheetTitle: "", sheetNumber: "", sheetRevision: "0", type: "", level: "", levelOptions: [] }]);
  };

  const handleRemoveSheet = (index) => {
    if (sheets.length > 1) setSheets(prev => prev.filter((_, i) => i !== index));
  };

  const handleSheetChange = (index, field, value) => {
    const newSheets = [...sheets];
    newSheets[index][field] = value;
    setSheets(newSheets);
  };

  const fetchLevelOptionsForSheet = async (index, selectedType) => {
    if (!selectedType || !selectedProject) return;
    setLoadingLevels(true);
    try {
      const res = await fetch(`${API_URL}/sd-levels?project=${encodeURIComponent(selectedProject)}&type=${encodeURIComponent(selectedType)}`);
      if (res.ok) {
        const data = await res.json();
        setSheets(prev => {
          const updated = [...prev];
          updated[index].levelOptions = data.levels || [];
          return updated;
        });
      }
    } catch (err) {
      console.error("Error loading levels:", err);
    } finally {
      setLoadingLevels(false);
    }
  };

  const handleSheetTypeChange = (index, newType) => {
    handleSheetChange(index, "type", newType);
    handleSheetChange(index, "level", "");
    fetchLevelOptionsForSheet(index, newType);
  };

  // إدارة Tags
  const handleAddIrTag = () => {
    if (irInput.trim()) {
      setIrTags((prev) => [...prev, irInput.trim()]);
      setIrInput("");
    }
  };
  const handleAddSdTag = () => {
    if (sdInput.trim()) {
      setSdTags((prev) => [...prev, sdInput.trim()]);
      setSdInput("");
    }
  };
  const handleKeyPress = (e, type) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (type === "engineer" && irInput.trim()) handleAddIrTag();
      else if (type === "site" && sdInput.trim()) handleAddSdTag();
    }
  };
  const removeTag = (index, setTags) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setGeneralDesc("");
    setIrTags([]);
    setSdTags([]);
    setIrInput("");
    setSdInput("");
    setSelectedLocation("");
    setSelectedFloor("");
    setFinalDescription("");
    setIsEditingFinalDesc(false);
    setOriginalFinalDesc("");
    setSurveyInput("");
    setSdSubject("");
    setProtoTypes([]);
    setIsRevision(false);
    setParentSdNo("");
    setSheets([{ sheetTitle: "", sheetNumber: "", sheetRevision: "0", type: "", level: "", levelOptions: [] }]);
  };

  // توليد الوصف النهائي لـ IR/CPR
  useEffect(() => {
    if (isEditingFinalDesc) return;
    if (requestType === "cpr") {
      const desc = generalDesc || "Concrete Pouring";
      const location = selectedLocation ? ` At ${selectedLocation}` : "";
      const finalDesc = `Concrete Pouring Request For ${desc}${location}`;
      setFinalDescription(finalDesc);
      setOriginalFinalDesc(finalDesc);
    } else if (requestType !== "sd") {
      const desc = generalDesc || "Inspection";
      const floor = selectedFloor ? ` For ${selectedFloor}` : "";
      const location = selectedLocation ? ` At ${selectedLocation}` : "";
      const typeStr = typesMap[selectedLocation] ? ` (${typesMap[selectedLocation]})` : "";
      // إضافة surveyInput إذا كان موجوداً
      const survey = surveyInput ? `${surveyInput} ` : "";
      const finalDesc = `${desc}${floor}${survey}${typeStr}${location}`.trim();
      setFinalDescription(finalDesc);
      setOriginalFinalDesc(finalDesc);
    }
  }, [generalDesc, selectedLocation, selectedFloor, typesMap, requestType, isEditingFinalDesc, surveyInput]);

  // حفظ الطلب
  const handleSave = async () => {
    if (requestType === "sd") {
      if (!selectedProject) {
        showToastMessage("Please select a project", "error");
        return;
      }
      if (!sdSubject.trim()) {
        showToastMessage("Please enter a subject", "error");
        return;
      }
      if (isRevision && !parentSdNo.trim()) {
        showToastMessage("Please enter the original SD number", "error");
        return;
      }
      for (let i = 0; i < sheets.length; i++) {
        if (!sheets[i].sheetTitle.trim()) {
          showToastMessage(`Sheet ${i + 1}: Title is required`, "error");
          return;
        }
      }

      setSaving(true);
      try {
        const payload = {
          project: selectedProject,
          department: department,
          user: user.username,
          subject: sdSubject,
  protoTypes: protoTypes.map(({ type, levels }) => ({ type, levels })),
          isRevision,
          parentSdNo: isRevision ? parentSdNo : undefined,
          sheets: sheets.map(({ sheetTitle, sheetNumber, sheetRevision, type, level }) => ({
            sheetTitle,
            sheetNumber,
            sheetRevision,
            type,
            level
          })),
        };
        const res = await fetch(`${API_URL}/shopdrawings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          showToastMessage("Shop Drawing created successfully!", "success");
          resetForm();
          setSelectedProject("");
        } else {
          throw new Error(data.error || "Failed to create shop drawing");
        }
      } catch (err) {
        console.error("Save error:", err);
        showToastMessage(`Error: ${err.message}`, "error");
      } finally {
        setSaving(false);
      }
    } else {
      // حفظ IR/CPR
      if (!selectedProject) {
        showToastMessage("Please select a project", "error");
        return;
      }
      if (!selectedLocation) {
        showToastMessage("Please select a location", "error");
        return;
      }
      if (!generalDesc) {
        showToastMessage("Please select a work description", "error");
        return;
      }
      if (!finalDescription.trim()) {
        showToastMessage("Please enter a final description", "error");
        return;
      }

      setSaving(true);
      const payload = {
        project: selectedProject,
        location: selectedLocation,
        desc: finalDescription,
        user: user.username,
        department: department,
        requestType: requestType.toUpperCase(),
        tags: { engineer: irTags, sd: sdTags },
        isEdited: isEditingFinalDesc,
        surveyInput: surveyInput,
      };
      if (requestType !== "cpr" && selectedFloor) {
        payload.floor = selectedFloor;
      }

      try {
        const res = await fetch(`${API_URL}/irs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          showToastMessage(`${requestType.toUpperCase()} Created Successfully!`, "success");
          resetForm();
          await loadProjects();
        } else {
          throw new Error(data.error || `Failed to create ${requestType}`);
        }
      } catch (err) {
        console.error("Save error:", err);
        showToastMessage(`Error: ${err.message}`, "error");
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSaveRev = async () => {
    if (!revProject || !revText.trim()) {
      showToastMessage("Please select project and enter revision number", "error");
      return;
    }
    let revisionType = "IR_REVISION";
    let parentRequestType = "IR";
    if (requestType === "cpr") {
      if (!isCivilEngineer) {
        showToastMessage("CPR revisions are only available for Civil/Structure engineers", "error");
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
          revText: revText.trim(),
          revNote: revNote,
          user: user.username,
          department: department,
          revisionType: revisionType,
          parentRequestType: parentRequestType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const revTypeDisplay = revisionType === "CPR_REVISION" ? "CPR Revision" : "IR Revision";
        showToastMessage(`${revTypeDisplay} created!`, "success");
        setShowRevModal(false);
        setRevProject("");
        setRevText("");
        setRevNote("");
      } else {
        throw new Error(data.error || "Failed to create revision");
      }
    } catch (err) {
      console.error("Revision error:", err);
      showToastMessage(err.message, "error");
    } finally {
      setRevSaving(false);
    }
  };

  const switchRequestType = (type) => {
    if (type === "CPR" && !isCivilEngineer) {
      showToastMessage("CPR requests are only available for Civil/Structure engineers", "error");
      return;
    }
    setSearchParams({ type: type.toLowerCase() });
    resetForm();
    setSelectedProject("");
  };

  const getNextNumberPreview = () => {
    if (!selectedProject || !department) return "";
    const deptAbbr = getDepartmentAbbr(department);
    const counters = projectCounters[selectedProject] || {};
    const counterKey = requestType === "cpr" ? "CPR" : 
                       requestType === "sd" ? `SD_${deptAbbr}` : deptAbbr;
    const currentCount = counters[counterKey] || 0;
    const nextCount = currentCount + 1;
    const cleanProject = selectedProject.replace(/\s+/g, "-").toUpperCase();

    if (requestType === "sd") {
      const firstSheet = sheets[0] || {};
      const subjectInitials = sdSubject.trim() ? sdSubject.trim().substring(0, 2).toUpperCase() : "XX";
      const firstType = firstSheet.type || "";
      const firstLevel = firstSheet.level || "";
      return `BA-CON-${cleanProject}-SD-${deptAbbr}-${firstType}-${firstLevel}-${subjectInitials}-${nextCount.toString().padStart(3, "0")}`;
    } else if (requestType === "cpr") {
      return `BADYA-CON-${cleanProject}-CPR-${nextCount.toString().padStart(3, "0")}`;
    } else {
      return `BADYA-CON-${cleanProject}-IR-${deptAbbr}-${nextCount.toString().padStart(3, "0")}`;
    }
  };

  const NextNumberPreview = () => {
    const nextNumber = getNextNumberPreview();
    if (!nextNumber) return null;
    return (
      <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg shadow-sm">
        <p className="text-sm font-medium text-purple-700 mb-1 flex items-center gap-2">
          <span>🔢</span> Next number will be:
        </p>
        <p className="font-mono font-bold text-lg text-gray-800 break-all">
          {nextNumber}
        </p>
      </div>
    );
  };

  const isSurvey = department === "SURV" || department?.toLowerCase().includes("survey");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-10">
      {toast.show && (
        <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-in fade-in slide-in-from-top-5 ${
          toast.type === "error" ? "bg-red-600" : toast.type === "warning" ? "bg-amber-600" : "bg-green-600"
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === "error" ? "❌" : toast.type === "warning" ? "⚠️" : "✅"}
            {toast.message}
          </div>
        </div>
      )}

      <div className={`max-w-6xl mx-auto pt-8 px-4 ${
        requestType === "cpr" ? "max-w-6xl  bg-gradient-to-br from-green-50 to-emerald-50" :
        requestType === "sd" ? "max-w-[1500px] bg-gradient-to-br from-purple-50 to-indigo-50" : ""
      } rounded-3xl p-6`}>
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b pb-6 gap-4">
          <div>
            <h1 className={`text-4xl font-bold ${
              requestType === "cpr" ? "text-green-600" :
              requestType === "sd" ? "text-purple-600" : "text-blue-600"
            }`}>
              {requestType === "cpr" ? "🏗️ Concrete Pouring Request (CPR)" :
               requestType === "sd" ? "📐 Shop Drawing" : "📋 Inspection Request (IR)"}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-gray-600">Logged in as:</span>
              <span className={`font-bold text-lg px-3 py-1 rounded-full ${
                requestType === "cpr" ? "bg-green-100 text-green-800" :
                requestType === "sd" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
              }`}>
                {user.username}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{department}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-1 flex flex-wrap">
            {allowedTypes.includes("ir") && (
              <button onClick={() => switchRequestType("IR")}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  requestType === "ir" ? "bg-blue-600 text-white shadow-md" : "hover:bg-gray-100 text-gray-600"
                }`}>📝 IR</button>
            )}
            {isCivilEngineer && allowedTypes.includes("cpr") && (
              <button onClick={() => switchRequestType("CPR")}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  requestType === "cpr" ? "bg-green-600 text-white shadow-md" : "hover:bg-gray-100 text-gray-600"
                }`}>🏗️ CPR</button>
            )}
            {allowedTypes.includes("sd") && (
              <button onClick={() => switchRequestType("SD")}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  requestType === "sd" ? "bg-purple-600 text-white shadow-md" : "hover:bg-gray-100 text-gray-600"
                }`}>📐 Shop Drawing</button>
            )}
          </div>

          {requestType !== "sd" && (
            <button onClick={() => setShowRevModal(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-all hover:-translate-y-0.5">
              + Create Revision (REV)
            </button>
          )}
        </div>

        {requestType === "sd" ? (
          /* نموذج Shop Drawing */
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-purple-600 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-8 bg-purple-600 rounded-full"></span>
                📐 Shop Drawing Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SearchableInput
                  label="Project *"
                  options={projects}
                  value={selectedProject}
                  onChange={setSelectedProject}
                  placeholder="Select project..."
                  loading={loadingProjects}
                  disabled={loadingProjects}
                />
                <SearchableInput
                  label="Subject *"
                  options={subjectOptions}
                  value={sdSubject}
                  onChange={setSdSubject}
                  placeholder={loadingSdData ? "Loading subjects..." : subjectOptions.length === 0 ? "No subjects available" : "Select or type subject..."}
                  disabled={loadingSdData || subjectOptions.length === 0}
                  loading={loadingSdData}
                />
              </div>

              {/* حقل اختيار الأنواع المتعددة (Proto-types) */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proto-types (select multiple)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {sdTypeOptions.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleAddProtoType(type)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        protoTypes.some(p => p.type === type)
                          ? "bg-purple-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
           {protoTypes.length > 0 && (
  <div className="space-y-4 mt-2">
    {protoTypes.map((item) => (
      <div key={item.type} className="p-3 border rounded bg-gray-50">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-purple-700">{item.type}</span>
          <button onClick={() => handleRemoveProtoType(item.type)} className="text-red-600 hover:text-red-800 text-sm">✕ Remove Type</button>
        </div>
        <div className="mb-2">
          <label className="block text-sm text-gray-600 mb-1">Selected Levels:</label>
          <div className="flex flex-wrap gap-2">
            {item.levels.map(level => (
              <span key={level} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                {level}
                <button onClick={() => handleRemoveLevel(item.type, level)} className="text-purple-600 hover:text-purple-800">×</button>
              </span>
            ))}
            {item.levels.length === 0 && <span className="text-sm text-gray-400 italic">No levels selected</span>}
          </div>
        </div>
        <div>
          <SearchableInput
            options={item.levelOptions}
            value="" // لا قيمة محددة، سنستخدم onChange للإضافة
            onChange={(value) => handleAddLevel(item.type, value)}
            placeholder="Add level..."
            disabled={!item.type}
            creatable={true}
            className="w-full"
          />
        </div>
      </div>
    ))}
  </div>
)}

              </div>

              {/* خيار Revision */}
              <div className="mt-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={isRevision} onChange={(e) => setIsRevision(e.target.checked)} className="rounded border-gray-300" />
                  <span className="text-sm text-gray-700">This is a revision of an existing shop drawing</span>
                </label>
              </div>

              {isRevision && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Original Shop Drawing Number *</label>
                  <input type="text" value={parentSdNo} onChange={(e) => setParentSdNo(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500" placeholder="e.g., BA-CON-A6-SD-ARCH-Prototype-A1-SU-001" />
                </div>
              )}

              {/* جدول الأوراق */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Sheets</h3>
                  <button type="button" onClick={handleAddSheet} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">+ Add Sheet</button>
                </div>
                <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
                  <table className="w-full border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left text-sm">Title</th>
                        <th className="p-2 text-left text-sm">Type</th>
                        <th className="p-2 text-left text-sm">Level</th>
                        <th className="p-2 text-left text-sm">Number</th>
                        <th className="p-2 text-left text-sm">Revision</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheets.map((sheet, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2" style={{ position: 'relative', zIndex: 1000 + index }}>
                            <SearchableInput
                              options={sheetTitleOptions}
                              value={sheet.sheetTitle}
                              onChange={(value) => handleSheetChange(index, "sheetTitle", value)}
                              placeholder={loadingSdData ? "Loading titles..." : sheetTitleOptions.length === 0 ? "No titles available" : "Select or type title..."}
                              disabled={loadingSdData || sheetTitleOptions.length === 0}
                              loading={loadingSdData}
                              dropdownClassName="searchable-input-dropdown"
                            />
                          </td>
                          <td className="p-2" style={{ position: 'relative', zIndex: 1000 + index }}>
                            <SearchableInput
                              options={sdTypeOptions}
                              value={sheet.type}
                              onChange={(value) => handleSheetTypeChange(index, value)}
                              placeholder={loadingTypes ? "Loading types..." : sdTypeOptions.length === 0 ? "No types" : "Select type (optional)"}
                              disabled={!selectedProject || loadingTypes}
                              loading={loadingTypes}
                              creatable={true}
                              dropdownClassName="searchable-input-dropdown"
                            />
                          </td>
                          <td className="p-2" style={{ position: 'relative', zIndex: 1000 + index }}>
                            <SearchableInput
                              options={sheet.levelOptions}
                              value={sheet.level}
                              onChange={(value) => handleSheetChange(index, "level", value)}
                              placeholder={!sheet.type ? "Select type first" : sheet.levelOptions.length === 0 ? "No levels" : "Select level (optional)"}
                              disabled={!sheet.type}
                              creatable={true}
                              dropdownClassName="searchable-input-dropdown"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={sheet.sheetNumber}
                              onChange={(e) => handleSheetChange(index, "sheetNumber", e.target.value)}
                              className="w-full p-2 border rounded bg-gray-50"
                              placeholder="Auto-generated"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={sheet.sheetRevision}
                              onChange={(e) => handleSheetChange(index, "sheetRevision", e.target.value)}
                              className="w-full p-2 border rounded"
                            >
                              <option value="0">0</option>
                              <option value="1">1</option>
                              <option value="2">2</option>
                              <option value="3">3</option>
                            </select>
                          </td>
                          <td className="p-2">
                            {sheets.length > 1 && (
                              <button onClick={() => handleRemoveSheet(index)} className="text-red-600 hover:text-red-800">✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedProject && <NextNumberPreview />}
            </div>

            <button onClick={handleSave} disabled={saving || !selectedProject || !sdSubject}
              className={`w-full py-5 rounded-xl text-white font-bold text-lg shadow-xl transition-all transform hover:-translate-y-1 ${
                saving || !selectedProject || !sdSubject ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              }`}>
              {saving ? <span className="flex items-center justify-center gap-3"><span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>Submitting...</span> : "📐 Submit Shop Drawing"}
            </button>
          </div>
        ) : (
          /* نموذج IR/CPR */
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 ${requestType === "cpr" ? "text-green-600" : "text-blue-600"}`}>
                <span className={`w-1.5 h-8 rounded-full ${requestType === "cpr" ? "bg-green-600" : "bg-blue-600"}`}></span>
                {requestType === "cpr" ? "🏗️ Concrete Pouring Details" : "📍 Inspection Details"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SearchableInput label="Project *" options={projects} value={selectedProject} onChange={setSelectedProject} placeholder="Select project..." loading={loadingProjects} disabled={loadingProjects} />
                <SearchableInput label="Location *" options={locations} value={selectedLocation} onChange={setSelectedLocation} placeholder={selectedProject ? "Select location..." : "Select project first"} disabled={!selectedProject || locations.length === 0} noOptionsMessage={selectedProject && locations.length === 0 ? "No locations found" : ""} />
                {requestType === "cpr" ? (
                  <SearchableInput label="Pouring Element *" options={baseDescriptions} value={generalDesc} onChange={setGeneralDesc} placeholder="Select pouring element..." disabled={!selectedProject} />
                ) : (
                  <>
                    <SearchableInput label="Work Description *" options={baseDescriptions} value={generalDesc} onChange={setGeneralDesc} placeholder="Select work description..." disabled={!selectedProject} />
                    <SearchableInput label="Floor (optional)" options={floors} value={selectedFloor} onChange={setSelectedFloor} placeholder="Select floor (optional)..." disabled={!selectedProject} />
                  </>
                )}
              </div>

              {/* حقل Survey Level (يظهر فقط للمساحين) */}
              {isSurvey && (
                <div className="mt-4">
                  <SearchableInput
                    label="Survey Level"
                    options={surveyLevels}
                    value={surveyInput}
                    onChange={setSurveyInput}
                    placeholder="Select or type level..."
                    creatable={true}
                  />
                </div>
              )}

              {requestType === "cpr" && !isCivilEngineer && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700 font-medium flex items-center gap-2"><span>⚠️</span>CPR requests are only available for Civil/Structure engineers.</p></div>
              )}
              {loadingData && (
                <div className="mt-4 flex items-center justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div><span className="ml-2 text-sm text-gray-600">Loading data...</span></div>
              )}
              {selectedProject && <NextNumberPreview />}
            </div>

            {/* Tags Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><span className="w-1.5 h-8 bg-purple-600 rounded-full"></span>🏷️ Tags & Attachments</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">IR Attachments</label>
                  <div className="flex gap-2">
                    <input type="text" value={irInput} onChange={(e) => setIrInput(e.target.value)} onKeyPress={(e) => handleKeyPress(e, "engineer")} className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Add IR attachment..." />
                    <button onClick={handleAddIrTag} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 rounded-lg">
                    {irTags.length === 0 ? <span className="text-sm text-gray-400 italic">No IR attachments added</span> : irTags.map((tag, idx) => (
                      <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm flex items-center gap-1 shadow-sm">📎 {tag}<button onClick={() => removeTag(idx, setIrTags)} className="text-blue-600 hover:text-blue-800 ml-1 font-bold">×</button></span>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">SD Attachments</label>
                  <div className="flex gap-2">
                    <input type="text" value={sdInput} onChange={(e) => setSdInput(e.target.value)} onKeyPress={(e) => handleKeyPress(e, "site")} className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-green-500" placeholder="Add SD attachment..." />
                    <button onClick={handleAddSdTag} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 rounded-lg">
                    {sdTags.length === 0 ? <span className="text-sm text-gray-400 italic">No SD attachments added</span> : sdTags.map((tag, idx) => (
                      <span key={idx} className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm flex items-center gap-1 shadow-sm">📌 {tag}<button onClick={() => removeTag(idx, setSdTags)} className="text-green-600 hover:text-green-800 ml-1 font-bold">×</button></span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Final Description */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-bold flex items-center gap-2 ${requestType === "cpr" ? "text-green-600" : "text-blue-600"}`}>
                  <span className={`w-1.5 h-8 rounded-full ${requestType === "cpr" ? "bg-green-600" : "bg-blue-600"}`}></span>📝 Final Description
                </h2>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${requestType === "cpr" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>{requestType.toUpperCase()}</span>
                  {!isEditingFinalDesc ? (
                    <button onClick={() => setIsEditingFinalDesc(true)} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition">✏️ Edit</button>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => { setOriginalFinalDesc(finalDescription); setIsEditingFinalDesc(false); }} className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition">💾 Save</button>
                      <button onClick={() => { setIsEditingFinalDesc(false); setFinalDescription(originalFinalDesc); }} className="px-4 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition">❌ Cancel</button>
                    </div>
                  )}
                </div>
              </div>
              {isEditingFinalDesc ? (
                <textarea className="w-full p-4 border-2 border-blue-300 rounded-xl" rows={4} value={finalDescription} onChange={(e) => setFinalDescription(e.target.value)} />
              ) : (
                <div className="w-full p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl">
                  {finalDescription || "Description will be generated automatically..."}
                </div>
              )}
            </div>

            <button onClick={handleSave} disabled={saving || !selectedProject || !selectedLocation || !generalDesc || !finalDescription.trim()}
              className={`w-full py-5 rounded-xl text-white font-bold text-lg shadow-xl transition-all transform hover:-translate-y-1 ${
                saving || !selectedProject || !selectedLocation || !generalDesc || !finalDescription.trim() ? "bg-gray-400 cursor-not-allowed" :
                requestType === "cpr" ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              }`}>
              {saving ? "Processing..." : requestType === "cpr" ? "🏗️ Submit CPR Request" : "📋 Submit Inspection Request"}
            </button>
          </div>
        )}

        {/* نافذة إنشاء مراجعة */}
        {showRevModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-5 text-white">
                <div className="flex justify-between items-center">
                  <div><h2 className="text-xl font-bold">Create New Revision</h2><p className="text-amber-100 text-sm mt-1">Add a revision to an existing request</p></div>
                  <button onClick={() => setShowRevModal(false)} className="text-2xl hover:opacity-70">&times;</button>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <SearchableInput label="Select Project *" options={projects} value={revProject} onChange={setRevProject} placeholder="Choose project..." />
                <div>
                  <label className="block font-medium text-gray-700 mb-2"><span className={`text-lg mr-2 ${requestType === "cpr" ? "text-green-600" : "text-blue-600"}`}>{requestType.toUpperCase()}</span> Revision Number *</label>
                  <input type="text" value={revText} onChange={(e) => setRevText(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3" placeholder="e.g., REV-001" />
                </div>
                <div><label className="block font-medium text-gray-700 mb-2">Notes (Optional)</label><textarea value={revNote} onChange={(e) => setRevNote(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3" rows={3} placeholder="Describe what changed..." /></div>
                <button onClick={handleSaveRev} disabled={revSaving || !revProject || !revText.trim()} className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl transition-all disabled:opacity-50">{revSaving ? "Creating..." : "Submit Revision"}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* أنماط إضافية لضمان ظهور القائمة المنسدلة */}
      <style>{`
        .searchable-input-dropdown {
          z-index: 9999 !important;
          position: absolute !important;
          background: white;
          border: 1px solid #ccc;
          max-height: 200px;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        td {
          position: relative;
        }
        .overflow-x-auto {
          overflow: visible !important;
        }
      `}</style>
    </div>
  );
}