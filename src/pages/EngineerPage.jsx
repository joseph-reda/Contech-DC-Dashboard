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

  const [selectedProject, setSelectedProject] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("");
  const [generalDesc, setGeneralDesc] = useState("");
  const [finalDescription, setFinalDescription] = useState("");
  const [isEditingFinalDesc, setIsEditingFinalDesc] = useState(false);
  const [originalFinalDesc, setOriginalFinalDesc] = useState("");

  // Shop Drawing
  const [sdSubject, setSdSubject] = useState("");
  const [isRevision, setIsRevision] = useState(false);
  const [parentSdNo, setParentSdNo] = useState("");
  const [sheets, setSheets] = useState([
    { sheetTitle: "", sheetNumber: "", sheetRevision: "0" },
  ]);

  // قائمة عناوين الألواح (Sheet Titles) للقسم الحالي
  const [sheetTitleOptions, setSheetTitleOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);

  const [irTags, setIrTags] = useState([]);
  const [sdTags, setSdTags] = useState([]);
  const [irInput, setIrInput] = useState("");
  const [sdInput, setSdInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [projects, setProjects] = useState([]);
  const [locations, setLocations] = useState([]);
  const [typesMap, setTypesMap] = useState({});
  const [baseDescriptions, setBaseDescriptions] = useState([]);
  const [floors, setAvailableFloors] = useState([]);
  const [projectCounters, setProjectCounters] = useState({});

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
        const res = await fetch(
          `${API_URL}/locations?project=${selectedProject}`,
        );
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

  // تحميل الأوصاف (لـ IR/CPR)
  const loadDescriptions = useCallback(async () => {
    if (requestType === "sd") return;
    if (!selectedProject || !department) return;
    try {
      const res = await fetch(
        `${API_URL}/general-descriptions?project=${selectedProject}&dept=${department}&requestType=${requestType.toUpperCase()}`,
      );
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (requestType === "cpr") {
        setBaseDescriptions(
          data.base || ["Slab", "Column", "Beam", "Wall", "Foundation"],
        );
      } else {
        setBaseDescriptions(
          data.base || ["Concrete Works", "Steel Reinforcement", "Formwork"],
        );
        setAvailableFloors(
          data.floors || ["Ground Floor", "1st Floor", "2nd Floor", "Roof"],
        );
      }
    } catch (err) {
      console.error("Descriptions load failed:", err);
    }
  }, [selectedProject, department, requestType]);

  useEffect(() => {
    loadDescriptions();
  }, [loadDescriptions]);

  // تحميل عناوين الألواح (Sheet Titles)
  useEffect(() => {
    if (requestType !== "sd" || !department) return;
    const loadSheetTitles = async () => {
      try {
        const deptMap = {
          ARCH: "Architectural",
          ST: "Civil",
          ELECT: "Electrical",
          MECH: "Mechanical",
          SURV: "Survey",
        };
        const deptName = deptMap[department] || department;
        const res = await fetch(`${API_URL}/admin/sheet-titles/${deptName}`);
        if (res.ok) {
          const data = await res.json();
          setSheetTitleOptions(data.sheets || []);
        } else {
          console.warn("Failed to load sheet titles, using fallback");
          setSheetTitleOptions([
            "SUNSCREEN ELEVATION 1",
            "SUNSCREEN ELEVATION 2",
            "DETAILS",
            "Foundation Plan",
            "Column Layout",
          ]);
        }
      } catch (err) {
        console.error("Error loading sheet titles:", err);
        setSheetTitleOptions([]);
      }
    };
    loadSheetTitles();
  }, [requestType, department]);

  // تحميل عناوين المواضيع (Subject Titles)
  useEffect(() => {
    if (requestType !== "sd" || !department) return;
    const loadSubjectTitles = async () => {
      try {
        const deptMap = {
          ARCH: "Architectural",
          ST: "Civil",
          ELECT: "Electrical",
          MECH: "Mechanical",
          SURV: "Survey",
        };
        const deptName = deptMap[department] || department;
        const res = await fetch(`${API_URL}/admin/subject-titles/${deptName}`);
        if (res.ok) {
          const data = await res.json();
          setSubjectOptions(data.subjects || []);
        } else {
          setSubjectOptions([]);
        }
      } catch (err) {
        console.error("Error loading subject titles:", err);
        setSubjectOptions([]);
      }
    };
    loadSubjectTitles();
  }, [requestType, department]);

  // توليد الوصف النهائي تلقائياً (IR/CPR)
  useEffect(() => {
    if (isEditingFinalDesc) return;
    if (requestType === "cpr") {
      const desc = generalDesc || "Concrete Pouring";
      const location = selectedLocation ? ` at ${selectedLocation}` : "";
      const finalDesc = `Concrete Pouring Request: ${desc}${location}`;
      setFinalDescription(finalDesc);
      setOriginalFinalDesc(finalDesc);
    } else if (requestType !== "sd") {
      const desc = generalDesc || "Inspection";
      const floor = selectedFloor ? ` for ${selectedFloor}` : "";
      const location = selectedLocation ? ` at ${selectedLocation}` : "";
      const typeStr = typesMap[selectedLocation]
        ? ` (${typesMap[selectedLocation]})`
        : "";
      const finalDesc = `${desc}${floor}${location}${typeStr}`.trim();
      setFinalDescription(finalDesc);
      setOriginalFinalDesc(finalDesc);
    }
  }, [
    generalDesc,
    selectedLocation,
    selectedFloor,
    typesMap,
    requestType,
    isEditingFinalDesc,
  ]);

  const getNextNumberPreview = () => {
    if (!selectedProject || !department) return "";
    const deptAbbr = getDepartmentAbbr(department);
    const counters = projectCounters[selectedProject] || {};
    const counterKey = requestType === "cpr" ? "CPR" : deptAbbr;
    const currentCount = counters[counterKey] || 0;
    const nextCount = currentCount + 1;
    const cleanProject = selectedProject.replace(/\s+/g, "-").toUpperCase();
    if (requestType === "cpr") {
      return `BADYA-CON-${cleanProject}-CPR-${nextCount.toString().padStart(3, "0")}`;
    } else if (requestType === "sd") {
      const year = new Date().getFullYear().toString().slice(-2);
      return `BADYA-SD-CON-${cleanProject}-${year}-${deptAbbr}-${nextCount.toString().padStart(3, "0")}`;
    } else {
      return `BADYA-CON-${cleanProject}-IR-${deptAbbr}-${nextCount.toString().padStart(3, "0")}`;
    }
  };

  // دوال إدارة الألواح
  const handleAddSheet = () => {
    setSheets([
      ...sheets,
      { sheetTitle: "", sheetNumber: "", sheetRevision: "0" },
    ]);
  };

  const handleRemoveSheet = (index) => {
    if (sheets.length > 1) {
      setSheets(sheets.filter((_, i) => i !== index));
    }
  };

  const handleSheetChange = (index, field, value) => {
    const newSheets = [...sheets];
    newSheets[index][field] = value;
    setSheets(newSheets);
  };

  // دوال إضافة Tags
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
    setSdSubject("");
    setIsRevision(false);
    setParentSdNo("");
    setSheets([{ sheetTitle: "", sheetNumber: "", sheetRevision: "0" }]);
  };

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
        if (!sheets[i].sheetTitle.trim() || !sheets[i].sheetNumber.trim()) {
          showToastMessage(
            `Sheet ${i + 1}: Title and Number are required`,
            "error",
          );
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
          isRevision,
          parentSdNo: isRevision ? parentSdNo : undefined,
          sheets: sheets.map((s) => ({
            sheetTitle: s.sheetTitle,
            sheetNumber: s.sheetNumber,
            sheetRevision: s.sheetRevision,
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
          showToastMessage(
            `${requestType.toUpperCase()} Created Successfully!`,
            "success",
          );
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
      showToastMessage(
        "Please select project and enter revision number",
        "error",
      );
      return;
    }
    let revisionType = "IR_REVISION";
    let parentRequestType = "IR";
    if (requestType === "cpr") {
      if (!isCivilEngineer) {
        showToastMessage(
          "CPR revisions are only available for Civil/Structure engineers",
          "error",
        );
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
        const revTypeDisplay =
          revisionType === "CPR_REVISION" ? "CPR Revision" : "IR Revision";
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
      showToastMessage(
        "CPR requests are only available for Civil/Structure engineers",
        "error",
      );
      return;
    }
    setSearchParams({ type: type.toLowerCase() });
    resetForm();
    setSelectedProject("");
  };

  const NextNumberPreview = () => {
    const nextNumber = getNextNumberPreview();
    if (!nextNumber) return null;
    return (
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <p className="text-sm font-medium text-blue-700 mb-1 flex items-center gap-2">
          <span>🔢</span> Next number will be:
        </p>
        <p className="font-mono font-bold text-lg text-gray-800">
          {nextNumber}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-10">
      {toast.show && (
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
            {toast.type === "error"
              ? "❌"
              : toast.type === "warning"
                ? "⚠️"
                : "✅"}
            {toast.message}
          </div>
        </div>
      )}

      <div
        className={`max-w-6xl mx-auto pt-8 px-4 ${
          requestType === "cpr"
            ? "bg-gradient-to-br from-green-50 to-emerald-50"
            : requestType === "sd"
              ? "bg-gradient-to-br from-purple-50 to-indigo-50"
              : ""
        } rounded-3xl p-6`}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b pb-6 gap-4">
          <div>
            <h1
              className={`text-4xl font-bold ${
                requestType === "cpr"
                  ? "text-green-600"
                  : requestType === "sd"
                    ? "text-purple-600"
                    : "text-blue-600"
              }`}
            >
              {requestType === "cpr"
                ? "🏗️ Concrete Pouring Request (CPR)"
                : requestType === "sd"
                  ? "📐 Shop Drawing"
                  : "📋 Inspection Request (IR)"}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-gray-600">Logged in as:</span>
              <span
                className={`font-bold text-lg px-3 py-1 rounded-full ${
                  requestType === "cpr"
                    ? "bg-green-100 text-green-800"
                    : requestType === "sd"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                }`}
              >
                {user.username}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{department}</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-1 flex flex-wrap">
            {allowedTypes.includes("ir") && (
              <button
                onClick={() => switchRequestType("IR")}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  requestType === "ir"
                    ? "bg-blue-600 text-white shadow-md"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                📝 IR
              </button>
            )}
            {isCivilEngineer && allowedTypes.includes("cpr") && (
              <button
                onClick={() => switchRequestType("CPR")}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  requestType === "cpr"
                    ? "bg-green-600 text-white shadow-md"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                🏗️ CPR
              </button>
            )}
            {allowedTypes.includes("sd") && (
              <button
                onClick={() => switchRequestType("SD")}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  requestType === "sd"
                    ? "bg-purple-600 text-white shadow-md"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                📐 Shop Drawing
              </button>
            )}
          </div>

          {requestType !== "sd" && (
            <button
              onClick={() => setShowRevModal(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md transition-all hover:-translate-y-0.5"
            >
              + Create Revision (REV)
            </button>
          )}
        </div>

        {requestType === "sd" ? (
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
                  placeholder="Select or type subject..."
                  disabled={subjectOptions.length === 0}
                />
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isRevision}
                    onChange={(e) => setIsRevision(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">
                    This is a revision of an existing shop drawing
                  </span>
                </label>
              </div>

              {isRevision && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Original Shop Drawing Number *
                  </label>
                  <input
                    type="text"
                    value={parentSdNo}
                    onChange={(e) => setParentSdNo(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., BADYA-SD-CON-A6-24-ARCH-155"
                  />
                </div>
              )}

              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Sheets
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddSheet}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                  >
                    + Add Sheet
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left text-sm">Title</th>
                        <th className="p-2 text-left text-sm">Number</th>
                        <th className="p-2 text-left text-sm">Revision</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheets.map((sheet, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">
                            <SearchableInput
                              options={sheetTitleOptions}
                              value={sheet.sheetTitle}
                              onChange={(value) =>
                                handleSheetChange(index, "sheetTitle", value)
                              }
                              placeholder="Select or type title..."
                              disabled={sheetTitleOptions.length === 0}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={sheet.sheetNumber}
                              onChange={(e) =>
                                handleSheetChange(
                                  index,
                                  "sheetNumber",
                                  e.target.value,
                                )
                              }
                              className="w-full p-2 border rounded"
                              placeholder="e.g., BA-CON-ARC-A6-PARK-D-ELEV-01"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={sheet.sheetRevision}
                              onChange={(e) =>
                                handleSheetChange(
                                  index,
                                  "sheetRevision",
                                  e.target.value,
                                )
                              }
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
                              <button
                                type="button"
                                onClick={() => handleRemoveSheet(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                ✕
                              </button>
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

            <button
              onClick={handleSave}
              disabled={saving || !selectedProject || !sdSubject}
              className={`w-full py-5 rounded-xl text-white font-bold text-lg shadow-xl transition-all transform hover:-translate-y-1 ${
                saving || !selectedProject || !sdSubject
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              }`}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Submitting...
                </span>
              ) : (
                "📐 Submit Shop Drawing"
              )}
            </button>
          </div>
        ) : (
          /* نموذج IR/CPR */
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2
                className={`text-xl font-bold mb-6 flex items-center gap-2 ${
                  requestType === "cpr" ? "text-green-600" : "text-blue-600"
                }`}
              >
                <span
                  className={`w-1.5 h-8 rounded-full ${
                    requestType === "cpr" ? "bg-green-600" : "bg-blue-600"
                  }`}
                ></span>
                {requestType === "cpr"
                  ? "🏗️ Concrete Pouring Details"
                  : "📍 Inspection Details"}
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
                  label="Location *"
                  options={locations}
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  placeholder={
                    selectedProject
                      ? "Select location..."
                      : "Select project first"
                  }
                  disabled={!selectedProject || locations.length === 0}
                  noOptionsMessage={
                    selectedProject && locations.length === 0
                      ? "No locations found"
                      : ""
                  }
                />
                {requestType === "cpr" ? (
                  <SearchableInput
                    label="Pouring Element *"
                    options={baseDescriptions}
                    value={generalDesc}
                    onChange={setGeneralDesc}
                    placeholder="Select pouring element..."
                    disabled={!selectedProject}
                  />
                ) : (
                  <>
                    <SearchableInput
                      label="Work Description *"
                      options={baseDescriptions}
                      value={generalDesc}
                      onChange={setGeneralDesc}
                      placeholder="Select work description..."
                      disabled={!selectedProject}
                    />
                    <SearchableInput
                      label="Floor (optional)"
                      options={floors}
                      value={selectedFloor}
                      onChange={setSelectedFloor}
                      placeholder="Select floor (optional)..."
                      disabled={!selectedProject}
                    />
                  </>
                )}
              </div>

              {requestType === "cpr" && !isCivilEngineer && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 font-medium flex items-center gap-2">
                    <span>⚠️</span>
                    CPR requests are only available for Civil/Structure
                    engineers.
                  </p>
                </div>
              )}

              {loadingData && (
                <div className="mt-4 flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">
                    Loading data...
                  </span>
                </div>
              )}

              {selectedProject && <NextNumberPreview />}
            </div>

            {/* Tags Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-8 bg-purple-600 rounded-full"></span>
                🏷️ Tags & Attachments
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    IR Attachments
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={irInput}
                      onChange={(e) => setIrInput(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, "engineer")}
                      className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Add IR attachment..."
                    />
                    <button
                      onClick={handleAddIrTag}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 rounded-lg">
                    {irTags.length === 0 ? (
                      <span className="text-sm text-gray-400 italic">
                        No IR attachments added
                      </span>
                    ) : (
                      irTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm flex items-center gap-1 shadow-sm"
                        >
                          📎 {tag}
                          <button
                            onClick={() => removeTag(idx, setIrTags)}
                            className="text-blue-600 hover:text-blue-800 ml-1 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    SD Attachments
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sdInput}
                      onChange={(e) => setSdInput(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, "site")}
                      className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Add SD attachment..."
                    />
                    <button
                      onClick={handleAddSdTag}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 rounded-lg">
                    {sdTags.length === 0 ? (
                      <span className="text-sm text-gray-400 italic">
                        No SD attachments added
                      </span>
                    ) : (
                      sdTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm flex items-center gap-1 shadow-sm"
                        >
                          📌 {tag}
                          <button
                            onClick={() => removeTag(idx, setSdTags)}
                            className="text-green-600 hover:text-green-800 ml-1 font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Final Description */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2
                  className={`text-xl font-bold flex items-center gap-2 ${
                    requestType === "cpr" ? "text-green-600" : "text-blue-600"
                  }`}
                >
                  <span
                    className={`w-1.5 h-8 rounded-full ${
                      requestType === "cpr" ? "bg-green-600" : "bg-blue-600"
                    }`}
                  ></span>
                  📝 Final Description
                </h2>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                      requestType === "cpr"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {requestType.toUpperCase()}
                  </span>
                  {!isEditingFinalDesc ? (
                    <button
                      onClick={() => setIsEditingFinalDesc(true)}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition"
                    >
                      ✏️ Edit
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setOriginalFinalDesc(finalDescription);
                          setIsEditingFinalDesc(false);
                        }}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                      >
                        💾 Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingFinalDesc(false);
                          setFinalDescription(originalFinalDesc);
                        }}
                        className="px-4 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition"
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {isEditingFinalDesc ? (
                <textarea
                  className="w-full p-4 border-2 border-blue-300 rounded-xl"
                  rows={4}
                  value={finalDescription}
                  onChange={(e) => setFinalDescription(e.target.value)}
                />
              ) : (
                <div className="w-full p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl">
                  {finalDescription ||
                    "Description will be generated automatically..."}
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={
                saving ||
                !selectedProject ||
                !selectedLocation ||
                !generalDesc ||
                !finalDescription.trim()
              }
              className={`w-full py-5 rounded-xl text-white font-bold text-lg shadow-xl transition-all transform hover:-translate-y-1 ${
                saving ||
                !selectedProject ||
                !selectedLocation ||
                !generalDesc ||
                !finalDescription.trim()
                  ? "bg-gray-400 cursor-not-allowed"
                  : requestType === "cpr"
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              }`}
            >
              {saving
                ? "Processing..."
                : requestType === "cpr"
                  ? "🏗️ Submit CPR Request"
                  : "📋 Submit Inspection Request"}
            </button>
          </div>
        )}

        {showRevModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-5 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">Create New Revision</h2>
                    <p className="text-amber-100 text-sm mt-1">
                      Add a revision to an existing request
                    </p>
                  </div>
                  <button
                    onClick={() => setShowRevModal(false)}
                    className="text-2xl hover:opacity-70"
                  >
                    &times;
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <SearchableInput
                  label="Select Project *"
                  options={projects}
                  value={revProject}
                  onChange={setRevProject}
                  placeholder="Choose project..."
                />
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    <span
                      className={`text-lg mr-2 ${requestType === "cpr" ? "text-green-600" : "text-blue-600"}`}
                    >
                      {requestType.toUpperCase()}
                    </span>
                    Revision Number *
                  </label>
                  <input
                    type="text"
                    value={revText}
                    onChange={(e) => setRevText(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl p-3"
                    placeholder="e.g., REV-001"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={revNote}
                    onChange={(e) => setRevNote(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl p-3"
                    rows={3}
                    placeholder="Describe what changed..."
                  />
                </div>
                <button
                  onClick={handleSaveRev}
                  disabled={revSaving || !revProject || !revText.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {revSaving ? "Creating..." : "Submit Revision"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}