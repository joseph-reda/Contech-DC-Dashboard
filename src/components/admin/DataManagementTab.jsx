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
    rules: [],
  });
  const [newRule, setNewRule] = useState({
    pattern: "",
    type: "",
    floors: [],
  });

  // General Descriptions States
  const [generalDescriptions, setGeneralDescriptions] = useState({});
  const [cprDescriptions, setCprDescriptions] = useState({});
  const [sdDescriptions, setSdDescriptions] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState("Architectural");
  const [descriptionType, setDescriptionType] = useState("regular"); // regular, cpr, sd
  const [editingDescriptions, setEditingDescriptions] = useState({
    department: "Architectural",
    base: [],
    floors: [],
    type: "regular",
  });
  const [editingSDDescriptions, setEditingSDDescriptions] = useState({
    department: "Architectural",
    base: [],
    elements: [],
    type: "sd",
  });
  const [newDescription, setNewDescription] = useState({
    text: "",
    type: "base", // base or floor for regular/cpr, base or element for sd
    floor: "",
  });

  // Sheet Titles (Shop Drawing) States
  const [sheetTitles, setSheetTitles] = useState({});
  const [selectedSheetDept, setSelectedSheetDept] = useState("Architectural");
  const [editingSheets, setEditingSheets] = useState({
    department: "Architectural",
    sheets: [],
  });
  const [newSheet, setNewSheet] = useState("");

  // Subject Titles (Shop Drawing main subjects) States
  const [subjectTitles, setSubjectTitles] = useState({});
  const [selectedSubjectDept, setSelectedSubjectDept] =
    useState("Architectural");
  const [editingSubjects, setEditingSubjects] = useState({
    department: "Architectural",
    subjects: [],
  });
  const [newSubject, setNewSubject] = useState("");

  // Available departments
  const departments = [
    {
      value: "Architectural",
      label: "Architectural",
      color: "bg-blue-100 text-blue-800",
      icon: "🏛️",
    },
    {
      value: "Civil",
      label: "Civil",
      color: "bg-green-100 text-green-800",
      icon: "🏗️",
    },
    {
      value: "Electrical",
      label: "Electrical",
      color: "bg-purple-100 text-purple-800",
      icon: "⚡",
    },
    {
      value: "Mechanical",
      label: "Mechanical",
      color: "bg-amber-100 text-amber-800",
      icon: "🔧",
    },
    {
      value: "Survey",
      label: "Survey",
      color: "bg-indigo-100 text-indigo-800",
      icon: "📐",
    },
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
    "Public entrance",
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
        loadAllSheetTitles(),
        loadAllSubjectTitles(),
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
      const [regularRes, cprRes, sdRes] = await Promise.all([
        fetch(`${API_URL}/admin/general-descriptions`),
        fetch(`${API_URL}/admin/general-descriptions-cpr`),
        fetch(`${API_URL}/admin/general-descriptions-sd`),
      ]);
      if (regularRes.ok) {
        const data = await regularRes.json();
        setGeneralDescriptions(data.general_descriptions || {});
      }
      if (cprRes.ok) {
        const data = await cprRes.json();
        setCprDescriptions(data.general_descriptions_cpr || {});
      }
      if (sdRes.ok) {
        const data = await sdRes.json();
        setSdDescriptions(data.general_descriptions_sd || {});
      }

      // Initialize first department for regular descriptions
      const firstDept = departments[0].value;
      const regularData = generalDescriptions[firstDept] || {};
      setEditingDescriptions({
        department: firstDept,
        base: regularData.base || [],
        floors: regularData.floors || [],
        type: "regular",
      });
      setSelectedDepartment(firstDept);

      // Initialize SD descriptions
      const sdData = sdDescriptions[firstDept] || {};
      setEditingSDDescriptions({
        department: firstDept,
        base: sdData.base || [],
        elements: sdData.elements || [],
        type: "sd",
      });
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
          sheets: deptSheets,
        });
        setSelectedSheetDept(firstDept);
      } else {
        const mock = {
          Architectural: [
            "SUNSCREEN ELEVATION 1",
            "SUNSCREEN ELEVATION 2",
            "DETAILS",
          ],
          Civil: ["Foundation Plan", "Column Layout", "Beam Details"],
          Electrical: ["Lighting Layout", "Power Layout"],
          Mechanical: ["HVAC Layout", "Plumbing Layout"],
          Survey: ["Topography", "Grid Lines"],
        };
        setSheetTitles(mock);
        setEditingSheets({
          department: "Architectural",
          sheets: mock.Architectural,
        });
      }
    } catch (error) {
      console.error("Failed to load sheet titles:", error);
      showToast("Failed to load sheet titles", "error");
    }
  };

  const loadAllSubjectTitles = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/subject-titles`);
      if (res.ok) {
        const data = await res.json();
        setSubjectTitles(data.subject_titles || {});
        const firstDept = departments[0].value;
        const deptSubjects = data.subject_titles?.[firstDept] || [];
        setEditingSubjects({
          department: firstDept,
          subjects: deptSubjects,
        });
        setSelectedSubjectDept(firstDept);
      } else {
        const mock = {
          Architectural: [
            "SUN SCREEN FOR A6 PARK-D",
            "FACADE DETAILS",
            "WINDOW SCHEDULE",
          ],
          Civil: ["FOUNDATION PLAN", "COLUMN LAYOUT"],
          Electrical: ["LIGHTING LAYOUT", "POWER LAYOUT"],
          Mechanical: ["HVAC LAYOUT", "PLUMBING LAYOUT"],
          Survey: ["TOPOGRAPHY", "GRID LINES"],
        };
        setSubjectTitles(mock);
        setEditingSubjects({
          department: "Architectural",
          subjects: mock.Architectural,
        });
      }
    } catch (error) {
      console.error("Failed to load subject titles:", error);
      showToast("Failed to load subject titles", "error");
    }
  };

  // Location Rules Functions
  const handleEditProjectRules = (projectName) => {
    const projectData = locationRules[projectName] || { rules: [] };
    setEditingProjectRules({
      project: projectName,
      rules: projectData.rules || [],
    });
    showToast(`Loading rules for ${projectName}`, "info");
  };

  const handleAddNewRule = () => {
    if (!newRule.pattern.trim()) {
      showToast("Location pattern is required", "error");
      return;
    }
    const updatedRules = [...editingProjectRules.rules, { ...newRule }];
    setEditingProjectRules((prev) => ({ ...prev, rules: updatedRules }));
    setNewRule({ pattern: "", type: "", floors: [] });
    showToast("Rule added", "success");
  };

  const handleRemoveRule = (index) => {
    const updatedRules = editingProjectRules.rules.filter(
      (_, i) => i !== index,
    );
    setEditingProjectRules((prev) => ({ ...prev, rules: updatedRules }));
    showToast("Rule removed", "info");
  };

  const handleUpdateRule = (index, field, value) => {
    const updatedRules = [...editingProjectRules.rules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    setEditingProjectRules((prev) => ({ ...prev, rules: updatedRules }));
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
          rules: editingProjectRules.rules,
        }),
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
    if (
      !window.confirm(
        `Are you sure you want to delete all rules for "${projectName}"?\nThis action cannot be undone.`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/location-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: projectName, rules: [] }),
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

  // General Descriptions Functions (regular & CPR)
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
      type: type,
    });
    showToast(`Loaded ${type} descriptions for ${dept}`, "info");
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
    setEditingDescriptions((prev) => ({ ...prev, base: updated }));
    showToast("Description removed", "info");
  };

  const handleRemoveFloor = (index) => {
    const updated = editingDescriptions.floors.filter((_, i) => i !== index);
    setEditingDescriptions((prev) => ({ ...prev, floors: updated }));
    showToast("Floor removed", "info");
  };

  const handleUpdateBaseDescription = (index, newText) => {
    const updated = [...editingDescriptions.base];
    updated[index] = newText;
    setEditingDescriptions((prev) => ({ ...prev, base: updated }));
  };

  const handleUpdateFloor = (index, newFloor) => {
    const updated = [...editingDescriptions.floors];
    updated[index] = newFloor;
    setEditingDescriptions((prev) => ({ ...prev, floors: updated }));
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
          base: editingDescriptions.base.filter((item) => item.trim() !== ""),
          floors: editingDescriptions.floors.filter(
            (item) => item.trim() !== "",
          ),
        },
        type: editingDescriptions.type,
      };
      const res = await fetch(`${API_URL}/admin/general-descriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
      if (res.ok) {
        showToast(
          `Descriptions for ${editingDescriptions.department} saved`,
          "success",
        );
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
    if (
      !window.confirm(
        `Are you sure you want to delete all descriptions for "${editingDescriptions.department}"?\nThis action cannot be undone.`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `${API_URL}/admin/general-descriptions/${editingDescriptions.department}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        showToast(
          `Descriptions for ${editingDescriptions.department} deleted`,
          "success",
        );
        setEditingDescriptions((prev) => ({ ...prev, base: [], floors: [] }));
        await loadAllDescriptions();
      }
    } catch (error) {
      console.error("Delete descriptions error:", error);
      showToast("Failed to delete descriptions", "error");
    } finally {
      setSaving(false);
    }
  };

  // SD Descriptions Functions
  const handleSelectSDDepartment = (dept) => {
    setSelectedDepartment(dept); // reuse same department state or separate? we'll use separate for clarity
    setDescriptionType("sd");
    const deptData = sdDescriptions[dept] || {};
    setEditingSDDescriptions({
      department: dept,
      base: deptData.base || [],
      elements: deptData.elements || [],
      type: "sd",
    });
    showToast(`Loaded SD descriptions for ${dept}`, "info");
  };

  const handleAddSDDescription = () => {
    if (!newDescription.text.trim()) {
      showToast("Description text is required", "error");
      return;
    }
    const updated = { ...editingSDDescriptions };
    if (newDescription.type === "base") {
      updated.base = [...updated.base, newDescription.text.trim()];
      showToast("Base description added", "success");
    } else {
      updated.elements = [...updated.elements, newDescription.text.trim()];
      showToast("Element added", "success");
    }
    setEditingSDDescriptions(updated);
    setNewDescription({ text: "", type: "base", floor: "" });
  };

  const handleRemoveSDBase = (index) => {
    const updated = editingSDDescriptions.base.filter((_, i) => i !== index);
    setEditingSDDescriptions((prev) => ({ ...prev, base: updated }));
    showToast("Base description removed", "info");
  };

  const handleRemoveSDElement = (index) => {
    const updated = editingSDDescriptions.elements.filter(
      (_, i) => i !== index,
    );
    setEditingSDDescriptions((prev) => ({ ...prev, elements: updated }));
    showToast("Element removed", "info");
  };

  const handleUpdateSDBase = (index, newText) => {
    const updated = [...editingSDDescriptions.base];
    updated[index] = newText;
    setEditingSDDescriptions((prev) => ({ ...prev, base: updated }));
  };

  const handleUpdateSDElement = (index, newText) => {
    const updated = [...editingSDDescriptions.elements];
    updated[index] = newText;
    setEditingSDDescriptions((prev) => ({ ...prev, elements: updated }));
  };

  const handleSaveSDDescriptions = async () => {
    if (!editingSDDescriptions.department) {
      showToast("Department is required", "error");
      return;
    }
    setSaving(true);
    try {
      const requestData = {
        department: editingSDDescriptions.department,
        descriptions: {
          base: editingSDDescriptions.base.filter((item) => item.trim() !== ""),
          elements: editingSDDescriptions.elements.filter(
            (item) => item.trim() !== "",
          ),
        },
      };
      const res = await fetch(`${API_URL}/admin/general-descriptions-sd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
      if (res.ok) {
        showToast(
          `SD descriptions for ${editingSDDescriptions.department} saved`,
          "success",
        );
        await loadAllDescriptions();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save SD descriptions");
      }
    } catch (error) {
      console.error("Save SD descriptions error:", error);
      showToast(`Failed to save SD descriptions: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSDDepartment = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete all SD descriptions for "${editingSDDescriptions.department}"?\nThis action cannot be undone.`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `${API_URL}/admin/general-descriptions-sd/${editingSDDescriptions.department}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        showToast(
          `SD descriptions for ${editingSDDescriptions.department} deleted`,
          "success",
        );
        setEditingSDDescriptions((prev) => ({
          ...prev,
          base: [],
          elements: [],
        }));
        await loadAllDescriptions();
      }
    } catch (error) {
      console.error("Delete SD descriptions error:", error);
      showToast("Failed to delete SD descriptions", "error");
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

// Sheet Titles Functions (نفس الشيء)
const handleAddSheet = () => {
  if (!newSheet.trim()) {
    showToast("Sheet title is required", "error");
    return;
  }
  setEditingSheets(prev => ({
    ...prev,
    sheets: [...prev.sheets, newSheet.trim()]
  }));
  setNewSheet("");
  showToast("Sheet added", "success");
};

const handleRemoveSheet = (index) => {
  setEditingSheets(prev => ({
    ...prev,
    sheets: prev.sheets.filter((_, i) => i !== index)
  }));
  showToast("Sheet removed", "info");
};

const handleUpdateSheet = (index, newValue) => {
  setEditingSheets(prev => {
    const updatedSheets = [...prev.sheets];
    updatedSheets[index] = newValue;
    return { ...prev, sheets: updatedSheets };
  });
};

const handleSaveSheets = async () => {
  if (!editingSheets.department) {
    showToast("Department is required", "error");
    return;
  }
  setSaving(true);
  try {
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
      // إعادة تحميل البيانات من الخادم لضمان التحديث
      await loadAllSheetTitles();
    } else {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to save sheets");
    }
  } catch (error) {
    console.error("Save sheets error:", error);
    // في حالة الفشل، نحتفظ بالتغييرات محلياً ولكن نعرض خطأ
    setSheetTitles(prev => ({
      ...prev,
      [editingSheets.department]: editingSheets.sheets.filter(s => s.trim() !== "")
    }));
    showToast(`Failed to save sheets, but changes kept locally`, "error");
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
    const res = await fetch(`${API_URL}/admin/sheet-titles/${editingSheets.department}`, {
      method: "DELETE"
    });
    if (res.ok) {
      showToast(`Sheets for ${editingSheets.department} deleted`, "success");
      // إعادة تحميل البيانات من الخادم
      await loadAllSheetTitles();
      setEditingSheets(prev => ({ ...prev, sheets: [] }));
    } else {
      const errorData = await res.json();
      throw new Error(errorData.error || "Delete failed");
    }
  } catch (error) {
    console.error("Delete sheets error:", error);
    // حذف محلي إذا فشل الطلب
    setSheetTitles(prev => {
      const newSheets = { ...prev };
      delete newSheets[editingSheets.department];
      return newSheets;
    });
    setEditingSheets(prev => ({ ...prev, sheets: [] }));
    showToast("Sheets deleted locally (server error)", "error");
  } finally {
    setSaving(false);
  }
};

  // Subject Titles Functions
  const handleSelectSubjectDept = (dept) => {
    setSelectedSubjectDept(dept);
    const deptSubjects = subjectTitles[dept] || [];
    setEditingSubjects({ department: dept, subjects: deptSubjects });
    showToast(`Loaded subjects for ${dept}`, "info");
  };

const handleAddSubject = () => {
  if (!newSubject.trim()) {
    showToast("Subject title is required", "error");
    return;
  }
  setEditingSubjects(prev => ({
    ...prev,
    subjects: [...prev.subjects, newSubject.trim()]
  }));
  setNewSubject("");
  showToast("Subject added", "success");
};

const handleRemoveSubject = (index) => {
  setEditingSubjects(prev => ({
    ...prev,
    subjects: prev.subjects.filter((_, i) => i !== index)
  }));
  showToast("Subject removed", "info");
};

const handleUpdateSubject = (index, newValue) => {
  setEditingSubjects(prev => {
    const updatedSubjects = [...prev.subjects];
    updatedSubjects[index] = newValue;
    return { ...prev, subjects: updatedSubjects };
  });
};

  const handleSaveSubjects = async () => {
    if (!editingSubjects.department) {
      showToast("Department is required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/subject-titles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department: editingSubjects.department,
          subjects: editingSubjects.subjects.filter((s) => s.trim() !== ""),
        }),
      });
      if (res.ok) {
        showToast(
          `Subject titles for ${editingSubjects.department} saved`,
          "success",
        );
        await loadAllSubjectTitles();
      } else {
        setSubjectTitles((prev) => ({
          ...prev,
          [editingSubjects.department]: editingSubjects.subjects,
        }));
        showToast(`Subject titles saved locally`, "success");
      }
    } catch (error) {
      console.error("Save subjects error:", error);
      showToast("Failed to save subjects", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartmentSubjects = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete all subjects for "${editingSubjects.department}"?\nThis action cannot be undone.`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `${API_URL}/admin/subject-titles/${editingSubjects.department}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        showToast(
          `Subjects for ${editingSubjects.department} deleted`,
          "success",
        );
        setEditingSubjects((prev) => ({ ...prev, subjects: [] }));
        await loadAllSubjectTitles();
      } else {
        setSubjectTitles((prev) => {
          const newSubjects = { ...prev };
          delete newSubjects[editingSubjects.department];
          return newSubjects;
        });
        setEditingSubjects((prev) => ({ ...prev, subjects: [] }));
        showToast("Subjects deleted locally", "success");
      }
    } catch (error) {
      console.error("Delete subjects error:", error);
      showToast("Failed to delete subjects", "error");
    } finally {
      setSaving(false);
    }
  };

  // Export functions
  const exportLocationRules = () => {
    const dataStr = JSON.stringify(locationRules, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute(
      "download",
      `location-rules-${new Date().toISOString().split("T")[0]}.json`,
    );
    linkElement.click();
    showToast("Location rules exported", "success");
  };

  const exportDescriptions = () => {
    const data = {
      general_descriptions: generalDescriptions,
      general_descriptions_cpr: cprDescriptions,
      general_descriptions_sd: sdDescriptions,
      exported_at: new Date().toISOString(),
    };
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute(
      "download",
      `general-descriptions-${new Date().toISOString().split("T")[0]}.json`,
    );
    linkElement.click();
    showToast("General descriptions exported", "success");
  };

  const exportSheets = () => {
    const dataStr = JSON.stringify(sheetTitles, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute(
      "download",
      `sheet-titles-${new Date().toISOString().split("T")[0]}.json`,
    );
    linkElement.click();
    showToast("Sheet titles exported", "success");
  };

  const exportSubjects = () => {
    const dataStr = JSON.stringify(subjectTitles, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute(
      "download",
      `subject-titles-${new Date().toISOString().split("T")[0]}.json`,
    );
    linkElement.click();
    showToast("Subject titles exported", "success");
  };

  const handleImportData = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (type === "location_rules") {
          showToast("Import not implemented yet", "info");
        } else if (type === "descriptions") {
          showToast("Import not implemented yet", "info");
        } else if (type === "sheets") {
          showToast("Import not implemented yet", "info");
        } else if (type === "subjects") {
          showToast("Import not implemented yet", "info");
        }
      } catch (error) {
        showToast("Invalid file", "error");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
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

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🗃️ Data Management
        </h2>
        <p className="text-gray-600">
          Manage location rules, general descriptions, sheet titles, and subject
          titles
        </p>
      </div>

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
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
          📄 Sheet Titles
        </button>
        <button
          onClick={() => setActiveSection("subjects")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${activeSection === "subjects" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}
        >
          📌 Subject Titles
        </button>
        <button
          onClick={() => setActiveSection("tools")}
          className={`px-4 py-2 font-medium text-sm transition-colors ${activeSection === "tools" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600 hover:text-gray-800"}`}
        >
          🛠️ Data Tools
        </button>
      </div>

      <div className="space-y-6">
        {/* Location Rules Section */}
        {activeSection === "location_rules" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  📋 Available Projects
                </h3>
                <span className="text-sm text-gray-500">
                  {Object.keys(locationRules).length} projects with rules
                </span>
              </div>
              {Object.keys(projects).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No projects
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(projects).map(
                    ([projectName, projectData]) => {
                      const rules = locationRules[projectName]?.rules || [];
                      const hasRules = rules.length > 0;
                      return (
                        <div
                          key={projectName}
                          className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${editingProjectRules.project === projectName ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-bold text-gray-800">
                                {projectName}
                              </h4>
                              {projectData.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {projectData.description}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  handleEditProjectRules(projectName)
                                }
                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                                title="Edit rules"
                              >
                                ✏️
                              </button>
                              {hasRules && (
                                <button
                                  onClick={() =>
                                    handleDeleteProjectRules(projectName)
                                  }
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                                  title="Delete all rules"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            Rules: {rules.length}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>
            {editingProjectRules.project && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-800">
                    ✏️ Edit rules for: {editingProjectRules.project}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setEditingProjectRules({ project: "", rules: [] })
                      }
                      className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProjectRules}
                      disabled={saving}
                      className="px-4 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "💾 Save"}
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-medium text-gray-700 mb-3">
                    ➕ Add New Rule
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newRule.pattern}
                      onChange={(e) =>
                        setNewRule((prev) => ({
                          ...prev,
                          pattern: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border rounded-lg"
                      placeholder="Pattern (e.g., A2-02-01)"
                    />
                    <input
                      type="text"
                      value={newRule.type}
                      onChange={(e) =>
                        setNewRule((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border rounded-lg"
                      placeholder="Type (e.g., Park-D)"
                    />
                    <button
                      onClick={handleAddNewRule}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    >
                      Add Rule
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    You can add floors later by editing the rule.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">
                    📋 Rules ({editingProjectRules.rules.length})
                  </h4>
                  {editingProjectRules.rules.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      No rules yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editingProjectRules.rules.map((rule, index) => (
                        <div
                          key={index}
                          className="border rounded-lg p-4 hover:bg-gray-50"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={rule.pattern}
                                onChange={(e) =>
                                  handleUpdateRule(
                                    index,
                                    "pattern",
                                    e.target.value,
                                  )
                                }
                                className="px-3 py-2 border rounded-lg"
                              />
                              <input
                                type="text"
                                value={rule.type}
                                onChange={(e) =>
                                  handleUpdateRule(
                                    index,
                                    "type",
                                    e.target.value,
                                  )
                                }
                                className="px-3 py-2 border rounded-lg"
                              />
                            </div>
                            <button
                              onClick={() => handleRemoveRule(index)}
                              className="ml-3 p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                            >
                              🗑️
                            </button>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">
                              Floors (comma separated)
                            </label>
                            <input
                              type="text"
                              value={rule.floors?.join(", ") || ""}
                              onChange={(e) =>
                                handleUpdateRule(
                                  index,
                                  "floors",
                                  e.target.value
                                    .split(",")
                                    .map((f) => f.trim()),
                                )
                              }
                              className="w-full px-3 py-2 border rounded-lg"
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

        {/* General Descriptions Section */}
        {activeSection === "descriptions" && (
          <div className="space-y-6">
            {/* Type selector */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                📝 Description Type
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDescriptionType("regular")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${descriptionType === "regular" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  Regular Descriptions
                </button>
                <button
                  onClick={() => setDescriptionType("cpr")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${descriptionType === "cpr" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  CPR Descriptions
                </button>
                <button
                  onClick={() => setDescriptionType("sd")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${descriptionType === "sd" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  SD Descriptions
                </button>
              </div>
            </div>

            {/* Department selector (varies by type) */}
            {descriptionType === "regular" && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  🏗️ Select Department (Regular)
                </h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {departments.map((dept) => (
                    <button
                      key={dept.value}
                      onClick={() =>
                        handleSelectDepartment(dept.value, "regular")
                      }
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${selectedDepartment === dept.value && descriptionType === "regular" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                      <span>{dept.icon}</span> {dept.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Department:{" "}
                    <span className="font-medium">{selectedDepartment}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteDepartmentDescriptions}
                      disabled={
                        saving ||
                        (!editingDescriptions.base.length &&
                          !editingDescriptions.floors.length)
                      }
                      className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg disabled:opacity-50"
                    >
                      🗑️ Delete All
                    </button>
                    <button
                      onClick={handleSaveDescriptions}
                      disabled={saving}
                      className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "💾 Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {descriptionType === "cpr" && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  🏗️ CPR Descriptions (Civil only)
                </h3>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-gray-600">
                    Department: <span className="font-medium">Civil</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteDepartmentDescriptions}
                      disabled={
                        saving ||
                        (!editingDescriptions.base.length &&
                          !editingDescriptions.floors.length)
                      }
                      className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg disabled:opacity-50"
                    >
                      🗑️ Delete All
                    </button>
                    <button
                      onClick={handleSaveDescriptions}
                      disabled={saving}
                      className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "💾 Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {descriptionType === "sd" && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  📐 Select Department (SD)
                </h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {departments.map((dept) => (
                    <button
                      key={dept.value}
                      onClick={() => handleSelectSDDepartment(dept.value)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${selectedDepartment === dept.value && descriptionType === "sd" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                    >
                      <span>{dept.icon}</span> {dept.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Department:{" "}
                    <span className="font-medium">
                      {editingSDDescriptions.department}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteSDDepartment}
                      disabled={
                        saving ||
                        (!editingSDDescriptions.base.length &&
                          !editingSDDescriptions.elements.length)
                      }
                      className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg disabled:opacity-50"
                    >
                      🗑️ Delete All
                    </button>
                    <button
                      onClick={handleSaveSDDescriptions}
                      disabled={saving}
                      className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "💾 Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add new description form */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-medium text-gray-700 mb-4">
                ➕ Add New Description
              </h4>
              {descriptionType === "sd" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={newDescription.type}
                    onChange={(e) =>
                      setNewDescription((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="base">Base Description</option>
                    <option value="element">Element</option>
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDescription.text}
                      onChange={(e) =>
                        setNewDescription((prev) => ({
                          ...prev,
                          text: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-2 border rounded-lg"
                      placeholder="Enter description text"
                    />
                    <button
                      onClick={handleAddSDDescription}
                      disabled={!newDescription.text.trim()}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    value={newDescription.type}
                    onChange={(e) =>
                      setNewDescription((prev) => ({
                        ...prev,
                        type: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="base">General (Base)</option>
                    <option value="floor">Floor</option>
                  </select>
                  {newDescription.type === "floor" && (
                    <select
                      value={newDescription.floor}
                      onChange={(e) =>
                        setNewDescription((prev) => ({
                          ...prev,
                          floor: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select floor</option>
                      {commonFloors.map((floor) => (
                        <option key={floor} value={floor}>
                          {floor}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDescription.text}
                      onChange={(e) =>
                        setNewDescription((prev) => ({
                          ...prev,
                          text: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-2 border rounded-lg"
                      placeholder="Description text"
                    />
                    <button
                      onClick={handleAddDescription}
                      disabled={
                        !newDescription.text.trim() ||
                        (newDescription.type === "floor" &&
                          !newDescription.floor)
                      }
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Display lists based on type */}
            {descriptionType === "sd" ? (
              <>
                {/* SD Base Descriptions */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="font-medium text-gray-700 mb-4">
                    📝 Base Descriptions ({editingSDDescriptions.base.length})
                  </h4>
                  {editingSDDescriptions.base.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      No base descriptions
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editingSDDescriptions.base.map((desc, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <span className="text-gray-500">{index + 1}.</span>
                          <input
                            type="text"
                            value={desc}
                            onChange={(e) =>
                              handleUpdateSDBase(index, e.target.value)
                            }
                            className="flex-1 px-3 py-1 border rounded"
                          />
                          <button
                            onClick={() => handleRemoveSDBase(index)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SD Elements */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="font-medium text-gray-700 mb-4">
                    🔧 Elements ({editingSDDescriptions.elements.length})
                  </h4>
                  {editingSDDescriptions.elements.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      No elements
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editingSDDescriptions.elements.map((elem, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <span className="text-gray-500">{index + 1}.</span>
                          <input
                            type="text"
                            value={elem}
                            onChange={(e) =>
                              handleUpdateSDElement(index, e.target.value)
                            }
                            className="flex-1 px-3 py-1 border rounded"
                          />
                          <button
                            onClick={() => handleRemoveSDElement(index)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Base Descriptions */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="font-medium text-gray-700 mb-4">
                    📝 General Descriptions ({editingDescriptions.base.length})
                  </h4>
                  {editingDescriptions.base.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      No descriptions
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editingDescriptions.base.map((desc, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <span className="text-gray-500">{index + 1}.</span>
                          <input
                            type="text"
                            value={desc}
                            onChange={(e) =>
                              handleUpdateBaseDescription(index, e.target.value)
                            }
                            className="flex-1 px-3 py-1 border rounded"
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

                {/* Floors */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="font-medium text-gray-700 mb-4">
                    🏢 Floors ({editingDescriptions.floors.length})
                  </h4>
                  {editingDescriptions.floors.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      No floors
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editingDescriptions.floors.map((floor, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <span className="text-gray-500">🏢</span>
                          <input
                            type="text"
                            value={floor}
                            onChange={(e) =>
                              handleUpdateFloor(index, e.target.value)
                            }
                            className="flex-1 px-3 py-1 border rounded"
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
              </>
            )}
          </div>
        )}

        {/* Sheet Titles Section */}
        {activeSection === "sheets" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                📄 Sheet Titles for Shop Drawing
              </h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {departments.map((dept) => (
                  <button
                    key={dept.value}
                    onClick={() => handleSelectSheetDept(dept.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${selectedSheetDept === dept.value ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  >
                    <span>{dept.icon}</span> {dept.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Department:{" "}
                  <span className="font-medium">{selectedSheetDept}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteDepartmentSheets}
                    disabled={saving || editingSheets.sheets.length === 0}
                    className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg disabled:opacity-50"
                  >
                    🗑️ Delete All
                  </button>
                  <button
                    onClick={handleSaveSheets}
                    disabled={saving}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "💾 Save"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-medium text-gray-700 mb-4">
                ➕ Add New Sheet Title
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSheet}
                  onChange={(e) => setNewSheet(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  placeholder="Enter sheet title (e.g., SUNSCREEN ELEVATION 1)"
                />
                <button
                  onClick={handleAddSheet}
                  disabled={!newSheet.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-medium text-gray-700 mb-4">
                📋 Sheet Titles ({editingSheets.sheets.length})
              </h4>
              {editingSheets.sheets.length === 0 ? (
                <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  No sheet titles
                </div>
              ) : (
                <div className="space-y-3">
                  {editingSheets.sheets.map((sheet, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <span className="text-gray-500">{index + 1}.</span>
                      <input
                        type="text"
                        value={sheet}
                        onChange={(e) =>
                          handleUpdateSheet(index, e.target.value)
                        }
                        className="flex-1 px-3 py-1 border rounded"
                      />
                      <button
                        onClick={() => handleRemoveSheet(index)}
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

        {/* Subject Titles Section */}
        {activeSection === "subjects" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                📌 Subject Titles for Shop Drawing
              </h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {departments.map((dept) => (
                  <button
                    key={dept.value}
                    onClick={() => handleSelectSubjectDept(dept.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${selectedSubjectDept === dept.value ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                  >
                    <span>{dept.icon}</span> {dept.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Department:{" "}
                  <span className="font-medium">{selectedSubjectDept}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteDepartmentSubjects}
                    disabled={saving || editingSubjects.subjects.length === 0}
                    className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg disabled:opacity-50"
                  >
                    🗑️ Delete All
                  </button>
                  <button
                    onClick={handleSaveSubjects}
                    disabled={saving}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "💾 Save"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-medium text-gray-700 mb-4">
                ➕ Add New Subject
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  placeholder="Enter subject (e.g., SUN SCREEN FOR A6 PARK-D)"
                />
                <button
                  onClick={handleAddSubject}
                  disabled={!newSubject.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-medium text-gray-700 mb-4">
                📋 Subject Titles ({editingSubjects.subjects.length})
              </h4>
              {editingSubjects.subjects.length === 0 ? (
                <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  No subjects
                </div>
              ) : (
                <div className="space-y-3">
                  {editingSubjects.subjects.map((subject, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <span className="text-gray-500">{index + 1}.</span>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) =>
                          handleUpdateSubject(index, e.target.value)
                        }
                        className="flex-1 px-3 py-1 border rounded"
                      />
                      <button
                        onClick={() => handleRemoveSubject(index)}
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
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                🛠️ Data Tools
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">
                    📤 Export Data
                  </h4>
                  <div className="space-y-3">
                    <button
                      onClick={exportLocationRules}
                      className="w-full px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium flex items-center justify-between"
                    >
                      Export Location Rules <span>⬇️</span>
                    </button>
                    <button
                      onClick={exportDescriptions}
                      className="w-full px-4 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium flex items-center justify-between"
                    >
                      Export General Descriptions <span>⬇️</span>
                    </button>
                    <button
                      onClick={exportSheets}
                      className="w-full px-4 py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium flex items-center justify-between"
                    >
                      Export Sheet Titles <span>⬇️</span>
                    </button>
                    <button
                      onClick={exportSubjects}
                      className="w-full px-4 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium flex items-center justify-between"
                    >
                      Export Subject Titles <span>⬇️</span>
                    </button>
                    <button
                      onClick={() => {
                        const allData = {
                          location_rules: locationRules,
                          general_descriptions: generalDescriptions,
                          general_descriptions_cpr: cprDescriptions,
                          general_descriptions_sd: sdDescriptions,
                          sheet_titles: sheetTitles,
                          subject_titles: subjectTitles,
                          exported_at: new Date().toISOString(),
                        };
                        const dataStr = JSON.stringify(allData, null, 2);
                        const dataUri =
                          "data:application/json;charset=utf-8," +
                          encodeURIComponent(dataStr);
                        const linkElement = document.createElement("a");
                        linkElement.setAttribute("href", dataUri);
                        linkElement.setAttribute(
                          "download",
                          `full-data-backup-${new Date().toISOString().split("T")[0]}.json`,
                        );
                        linkElement.click();
                        showToast("Full backup exported", "success");
                      }}
                      className="w-full px-4 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium flex items-center justify-between"
                    >
                      Export Full Backup <span>💾</span>
                    </button>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">
                    📥 Import Data
                  </h4>
                  <div className="space-y-3">
                    <label className="block">
                      <div className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium flex items-center justify-between cursor-pointer">
                        Import Location Rules <span>⬆️</span>
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
                        Import General Descriptions <span>⬆️</span>
                      </div>
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => handleImportData(e, "descriptions")}
                        className="hidden"
                      />
                    </label>
                    <label className="block">
                      <div className="px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium flex items-center justify-between cursor-pointer">
                        Import Sheet Titles <span>⬆️</span>
                      </div>
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => handleImportData(e, "sheets")}
                        className="hidden"
                      />
                    </label>
                    <label className="block">
                      <div className="px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium flex items-center justify-between cursor-pointer">
                        Import Subject Titles <span>⬆️</span>
                      </div>
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => handleImportData(e, "subjects")}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={loadAllData}
                      className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-between"
                    >
                      Reload Data <span>🔄</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-700 mb-4">
                  📊 Data Statistics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {Object.keys(locationRules).length}
                    </div>
                    <div className="text-sm text-gray-600">
                      Projects with rules
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.keys(generalDescriptions).length}
                    </div>
                    <div className="text-sm text-gray-600">Depts (regular)</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {Object.keys(sdDescriptions).length}
                    </div>
                    <div className="text-sm text-gray-600">Depts (SD)</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-indigo-600">
                      {Object.keys(sheetTitles).length}
                    </div>
                    <div className="text-sm text-gray-600">Sheet depts</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">
                      {Object.keys(projects).length}
                    </div>
                    <div className="text-sm text-gray-600">Total projects</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
