// src/pages/DcPage.jsx
import { useEffect, useState } from "react";
import { copyRow, copyAllRows } from "../firebaseService";
import { API_URL } from "../config";
import { useNavigate } from "react-router-dom";
import SidebarComponent from "../components/SidebarComponent";

export default function DcPage() {
    const navigate = useNavigate();
    const [irs, setIRs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState("");
    const [customNumbers, setCustomNumbers] = useState({});
    const [savingSerials, setSavingSerials] = useState({});
    const [downloadedIRs, setDownloadedIRs] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    // فلاتر الـ Sidebar
    const [sidebarFilters, setSidebarFilters] = useState({
        project: "all",
        department: "all",
        type: "all",
        status: "all"
    });

    // Advanced Filters
    const [advancedFilters, setAdvancedFilters] = useState({
        project: "all",
        type: "all",
        status: "all",
        dateRange: "all",
        department: "all"
    });

    // Check authentication
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user || user.role !== "dc") {
            navigate("/login");
        }
    }, [navigate]);

    function normalizeDept(dept) {
        if (!dept) return "UNKNOWN";
        const d = String(dept).toUpperCase().replace(/[^A-Z]/g, "");
        if (d.includes("ARCH")) return "ARCH";
        if (d.includes("CIVIL") || d.includes("STRUCTURE")) return "ST";
        if (d.includes("ELECT")) return "ELECT";
        if (d.includes("MEP") || d.includes("MECHAN")) return "MEP";
        if (d.includes("SURV")) return "SURVEY";
        return d;
    }

    async function parseJsonSafe(response) {
        const ct = response.headers.get("content-type") || "";
        if (ct.indexOf("application/json") !== -1) {
            return response.json();
        } else {
            const text = await response.text();
            throw new Error(text || `Unexpected response (status ${response.status})`);
        }
    }

    function showToast(msg) {
        setToast(msg);
        setTimeout(() => setToast(""), 2200);
    }

    // دالة إعادة تحميل البيانات
    async function loadAllData() {
        setLoading(true);
        try {
            const [resIrs, resRevs] = await Promise.all([
                fetch(`${API_URL}/irs`),
                fetch(`${API_URL}/revs`)
            ]);

            const dataIrs = await parseJsonSafe(resIrs);
            const dataRevs = await parseJsonSafe(resRevs);

            const listIrs = dataIrs.irs || [];
            const listRevs = dataRevs.revs || [];

            // معالجة IRs
            const normalizedIrs = listIrs.map((ir) => ({
                ...ir,
                isRevision: false,
                isCPR: ir.requestType === "CPR",
                floor: ir.floor || "",
                concreteGrade: ir.concreteGrade || "",
                pouringElement: ir.pouringElement || "",
                tags: ir.tags || { engineer: [], sd: [] }
            }));

            // معالجة Revisions
            const normalizedRevs = listRevs.map((rev) => ({
                ...rev,
                isRevision: true,
                revText: rev.revText || rev.revNo?.split("-").pop() || "R1",
                irNo: rev.revNo || rev.irNo || "",
                department: rev.department || "UNKNOWN",
                project: rev.project || "UNKNOWN",
                sentAt: rev.sentAt || null,
                desc: rev.desc || rev.revNote || "",
                revisionType: rev.revisionType || "IR_REVISION",
                parentRequestType: rev.parentRequestType || "IR",
                floor: rev.floor || "",
                tags: rev.tags || { engineer: [], sd: [] },
                downloadedBy: rev.downloadedBy || "",
                downloadedAt: rev.downloadedAt || "",
                isDone: rev.isDone || false,
                // ⭐⭐ حقول جديدة للمراجعات ⭐⭐
                userRevNumber: rev.userRevNumber || rev.revText,
                displayNumber: rev.displayNumber || 
                    (rev.userRevNumber ? 
                        `REV-${rev.revisionType === "CPR_REVISION" ? "CPR-" : "IR-"}${rev.userRevNumber}` : 
                        rev.revNo),
                isCPRRevision: rev.revisionType === "CPR_REVISION" || rev.isCPRRevision,
                isIRRevision: rev.revisionType === "IR_REVISION" || rev.isIRRevision
            }));

            // دمج القائمتين
            const merged = [...normalizedIrs, ...normalizedRevs];
            setIRs(merged);

            // إعداد custom numbers map
            const map = {};
            merged.forEach((item) => {
                if (!item.isRevision && item.irNo) {
                    map[item.irNo] = item.irNo;
                }
            });
            setCustomNumbers(map);

        } catch (err) {
            console.error("Load error:", err);
            showToast("Failed to load data");
        } finally {
            setLoading(false);
        }
    }

    // Load all data
    useEffect(() => {
        loadAllData();

        // إعادة تحميل كل 30 ثانية
        const interval = setInterval(() => {
            if (!loading) {
                loadAllData();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // 🔧 Helper Functions
    const formatDateShort = (dateStr) => {
        if (!dateStr) return "—";
        try {
            if (dateStr.includes("Jan") || dateStr.includes("Feb") || dateStr.includes("Mar")) {
                const parts = dateStr.split(" ");
                if (parts.length >= 3) {
                    return `${parts[0]} ${parts[1]}\n${parts[2]}`;
                }
                return dateStr;
            }
            const date = new Date(dateStr);
            if (isNaN(date)) return dateStr;
            return new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short"
            }).format(date) + "\n" +
                new Intl.DateTimeFormat("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit"
                }).format(date);
        } catch {
            return dateStr;
        }
    };

    const formatShortDate = (dateStr) => {
        if (!dateStr) return "";
        try {
            if (dateStr.includes("Jan") || dateStr.includes("Feb") || dateStr.includes("Mar")) {
                const parts = dateStr.split(" ");
                if (parts.length >= 3) return `${parts[0]} ${parts[1]}`;
                return dateStr;
            }
            const date = new Date(dateStr);
            if (isNaN(date)) return dateStr;
            return new Intl.DateTimeFormat("en-GB", {
                day: "2-digit",
                month: "short"
            }).format(date);
        } catch {
            return dateStr;
        }
    };

    const getDeptAbbr = (department) => {
        if (!department) return "UNK";
        const dept = department.toUpperCase();
        if (dept.includes("ARCH")) return "ARCH";
        if (dept.includes("CIVIL") || dept.includes("STRUCT")) return "CIVIL";
        if (dept.includes("ELECT")) return "ELEC";
        if (dept.includes("MEP") || dept.includes("MECH")) return "MEP";
        if (dept.includes("SURV")) return "SURV";
        return dept.substring(0, 4);
    };

    const extractTime = (dateStr) => {
        if (!dateStr) return "Unknown";
        try {
            if (dateStr.includes(":")) {
                const parts = dateStr.split(" ");
                if (parts.length >= 3) return `${parts[1]} ${parts[2]}`;
                return dateStr;
            } else {
                const date = new Date(dateStr);
                if (isNaN(date)) return dateStr;
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            }
        } catch {
            return dateStr;
        }
    };

    const getRevDisplayNumber = (rev) => {
        if (!rev) return "REV";
        if (rev.displayNumber) return rev.displayNumber;
        if (rev.userRevNumber) {
            const prefix = rev.revisionType === "CPR_REVISION" ? "REV-CPR-" : "REV-IR-";
            return `${prefix}${rev.userRevNumber}`;
        }
        if (rev.revText) {
            const prefix = rev.revisionType === "CPR_REVISION" ? "REV-CPR-" : "REV-IR-";
            return `${prefix}${rev.revText}`;
        }
        return rev.revNo || "REV";
    };

    const getRevTypeClass = (rev) => {
        if (!rev) return "bg-gray-100 text-gray-800";
        if (rev.revisionType === "CPR_REVISION" || rev.isCPRRevision) {
            return "bg-green-200 text-green-800";
        } else {
            return "bg-amber-200 text-amber-800";
        }
    };

    const getRevTypeText = (rev) => {
        if (!rev) return "REVISION";
        if (rev.revisionType === "CPR_REVISION" || rev.isCPRRevision) {
            return "CPR REV";
        } else {
            return "IR REV";
        }
    };

    // Filter and search logic
    const filteredIRs = irs.filter(ir => {
        // Filter by project from Sidebar
        if (sidebarFilters.project !== "all" && ir.project !== sidebarFilters.project) return false;

        // Filter by department from Sidebar
        if (sidebarFilters.department !== "all") {
            const dept = normalizeDept(ir.department);
            if (dept !== sidebarFilters.department) return false;
        }

        // Filter by type from Sidebar
        if (sidebarFilters.type !== "all") {
            if (sidebarFilters.type === "ir") {
                if (ir.isCPR || (ir.isRevision && ir.revisionType === "CPR_REVISION")) return false;
            }
            if (sidebarFilters.type === "cpr") {
                if (ir.isRevision) {
                    if (ir.revisionType !== "CPR_REVISION") return false;
                } else {
                    if (!ir.isCPR) return false;
                }
            }
            if (sidebarFilters.type === "revision" && !ir.isRevision) return false;
        }

        // Filter by status from Sidebar
        if (sidebarFilters.status !== "all") {
            if (sidebarFilters.status === "pending" && ir.isDone) return false;
            if (sidebarFilters.status === "completed" && !ir.isDone) return false;
        }

        // Advanced Filters
        if (advancedFilters.project !== "all" && ir.project !== advancedFilters.project) return false;

        if (advancedFilters.type !== "all") {
            if (advancedFilters.type === "ir" && (ir.isCPR || ir.isRevision)) return false;
            if (advancedFilters.type === "cpr" && (!ir.isCPR || ir.isRevision)) return false;
            if (advancedFilters.type === "revision" && !ir.isRevision) return false;
        }

        if (advancedFilters.status !== "all") {
            if (advancedFilters.status === "pending" && ir.isDone) return false;
            if (advancedFilters.status === "completed" && !ir.isDone) return false;
        }

        if (advancedFilters.department !== "all" && ir.department !== advancedFilters.department) return false;

        // Filter by date range
        if (advancedFilters.dateRange !== "all") {
            const itemDate = new Date(ir.sentAt || ir.receivedDate);
            const today = new Date();

            switch (advancedFilters.dateRange) {
                case "today":
                    if (itemDate.toDateString() !== today.toDateString()) return false;
                    break;
                case "week":
                    const weekAgo = new Date(today);
                    weekAgo.setDate(today.getDate() - 7);
                    if (itemDate < weekAgo) return false;
                    break;
                case "month":
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(today.getMonth() - 1);
                    if (itemDate < monthAgo) return false;
                    break;
            }
        }

        // Search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const irNumber = formatIrNumber(ir.irNo).toLowerCase();
            return (
                irNumber.includes(term) ||
                (ir.desc && ir.desc.toLowerCase().includes(term)) ||
                (ir.project && ir.project.toLowerCase().includes(term)) ||
                (ir.user && ir.user.toLowerCase().includes(term)) ||
                (ir.floor && ir.floor.toLowerCase().includes(term)) ||
                (ir.concreteGrade && ir.concreteGrade.toLowerCase().includes(term)) ||
                (ir.downloadedBy && ir.downloadedBy.toLowerCase().includes(term))
            );
        }

        return true;
    });

    // Group by project and department
    const grouped = {};
    filteredIRs.forEach(ir => {
        const project = ir.project || "UNKNOWN";
        const deptKey = normalizeDept(ir.department);
        if (!grouped[project]) grouped[project] = {};
        if (!grouped[project][deptKey]) grouped[project][deptKey] = [];
        grouped[project][deptKey].push(ir);
    });

    // 🛠️ Action Handlers
    async function handleArchive(irNo) {
        const item = irs.find((x) => x.irNo === irNo || x.revNo === irNo);
        if (!item) return showToast("Item not found");

        const itemName = item.isRevision ? "Revision" : (item.isCPR ? "CPR" : "IR");

        if (!window.confirm(`Archive ${itemName} ${formatIrNumber(irNo)}?`)) return;

        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");

            const res = await fetch(`${API_URL}/archive`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo,
                    role: "dc",
                    isRevision: item.isRevision || false,
                    revisionType: item.revisionType || (item.isCPR ? "CPR_REVISION" : "IR_REVISION")
                }),
            });

            const json = await parseJsonSafe(res);
            if (!res.ok) throw new Error(json.error || "Archive failed");

            setIRs((prev) => prev.filter((x) => x.irNo !== irNo && x.revNo !== irNo));
            showToast(`✅ ${itemName} archived successfully!`);

            setTimeout(() => loadAllData(), 1000);
        } catch (err) {
            console.error("Archive failed:", err);
            showToast(`❌ Archive failed: ${err.message}`);
        }
    }

    async function markRevDone(irNo) {
        if (!window.confirm(`Mark revision ${formatIrNumber(irNo)} as done?`)) return;

        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");

            const res = await fetch(`${API_URL}/revs/mark-done`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo: irNo,
                    role: "dc"
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to mark revision as done");

            setIRs((prev) =>
                prev.map((x) =>
                    (x.irNo === irNo || x.revNo === irNo) ? {
                        ...x,
                        isDone: true,
                        completedAt: new Date().toISOString()
                    } : x
                )
            );

            showToast("✅ Revision marked as done!");
            setTimeout(() => loadAllData(), 1000);
        } catch (err) {
            console.error("markRevDone error:", err);
            showToast(`❌ Error: ${err.message}`);
        }
    }

    async function handleCopy(ir) {
        try {
            await copyRow(ir);
            showToast("✔ Copied!");
        } catch (err) {
            console.error("copy error:", err);
            showToast("Copy failed");
        }
    }

    async function handleCopyAll(list) {
        try {
            const filtered = list.filter((ir) => !ir.isRevision);
            await copyAllRows(filtered);
            showToast("✔ All Non-REV Copied!");
        } catch (err) {
            console.error("copyAll error:", err);
            showToast("Copy all failed");
        }
    }

    function getTodayDateStr() {
        const now = new Date();
        return now.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, ' ');
    }

    async function markItemAsDone(item, newIrNo = null) {
        const irNoToUse = newIrNo || item.irNo;

        try {
            const endpoint = item.isRevision ? `${API_URL}/revs/mark-done` : `${API_URL}/irs/mark-done`;

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo: irNoToUse,
                    role: "dc"
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to mark item as done");
            }

            setIRs(prev =>
                prev.map(x =>
                    x.irNo === item.irNo
                        ? {
                            ...x,
                            isDone: true,
                            downloadedBy: JSON.parse(localStorage.getItem("user") || "null")?.username || "dc",
                            downloadedAt: new Date().toISOString(),
                            ...(newIrNo && { irNo: newIrNo })
                        }
                        : x
                )
            );

            if (newIrNo && newIrNo !== item.irNo) {
                setCustomNumbers(prev => {
                    const newMap = { ...prev };
                    delete newMap[item.irNo];
                    newMap[newIrNo] = newIrNo;
                    return newMap;
                });
            }

        } catch (err) {
            console.error("Mark as done error:", err);
            showToast(`⚠️ File downloaded but failed to mark as done: ${err.message}`);
        }
    }

    async function handleDownloadWord(ir) {
        if (ir.isRevision) {
            showToast("REV items don't have Word files");
            return;
        }

        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user || user.role !== "dc") {
            showToast("Please login as DC user");
            return;
        }

        const customNumber = customNumbers[ir.irNo];
        const finalIR = customNumber && customNumber.trim() !== "" ? customNumber : ir.irNo;

        try {
            const payload = {
                irNo: finalIR,
                desc: ir.desc || "",
                receivedDate: getTodayDateStr(),
                project: ir.project || "",
                department: ir.department || "",
                downloadedBy: user.username,
                requestType: ir.requestType || "IR",
                concreteGrade: ir.concreteGrade || "",
                pouringElement: ir.pouringElement || "",
                floor: ir.floor || "",
                Description: ir.desc || "",
                ProjectName: ir.project || "",
                Department: ir.department || "",
                ReceivedDate: getTodayDateStr(),
                CurrentDate: getTodayDateStr(),
                oldIrNo: ir.irNo
            };

            const res = await fetch(`${API_URL}/generate-word`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const contentType = res.headers.get("content-type");

            if (!res.ok) {
                if (contentType && contentType.includes("application/json")) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || `Server error: ${res.status}`);
                } else {
                    const text = await res.text();
                    throw new Error(text || `Server error: ${res.status}`);
                }
            }

            if (contentType && contentType.includes("application/json")) {
                const jsonData = await res.json();
                throw new Error(jsonData.error || "Unexpected JSON response");
            }

            const blob = await res.blob();
            if (blob.size === 0) throw new Error("Empty file received");

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            const filename = finalIR.includes("BADYA-CON") ?
                `${finalIR}.docx` :
                `IR-${finalIR}.docx`;
            a.download = filename;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            await markItemAsDone(ir, finalIR);
            setDownloadedIRs(prev => new Set([...prev, ir.irNo]));
            showToast(`✅ Word file with updated number ${finalIR} downloaded and marked as done!`);

        } catch (err) {
            console.error("Download failed:", err);
            showToast(`❌ Download failed: ${err.message}`);
        }
    }

    async function handleConfirmSerial(ir) {
        if (ir.isRevision) {
            showToast("Cannot update revision numbers");
            return;
        }

        const newValue = (customNumbers[ir.irNo] || "").trim();
        if (!newValue) {
            showToast("Please enter a new IR number");
            return;
        }

        let numericSerial;
        if (newValue.includes("-")) {
            const parts = newValue.split("-");
            const lastPart = parts[parts.length - 1];
            numericSerial = parseInt(lastPart);
        } else {
            numericSerial = parseInt(newValue);
        }

        if (isNaN(numericSerial) || numericSerial < 1) {
            showToast("IR must end with valid number (e.g., 001)");
            return;
        }

        setSavingSerials((s) => ({ ...s, [ir.irNo]: true }));

        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");

            const res = await fetch(`${API_URL}/irs/update-ir-number`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    irNo: ir.irNo,
                    newSerial: numericSerial,
                    role: user?.role || "dc",
                    project: ir.project,
                    department: ir.department,
                    requestType: ir.requestType || "IR"
                }),
            });

            const json = await parseJsonSafe(res);
            if (!res.ok) throw new Error(json.error || "Failed to update IR number");

            const newIrNo = json.ir?.irNo || ir.irNo;

            setIRs((prev) =>
                prev.map((x) =>
                    x.irNo === ir.irNo
                        ? {
                            ...x,
                            irNo: newIrNo,
                            downloadedBy: user?.username || "dc",
                            updatedAt: new Date().toISOString()
                        }
                        : x
                )
            );

            setCustomNumbers((prev) => {
                const map = { ...prev };
                delete map[ir.irNo];
                map[newIrNo] = newIrNo;
                return map;
            });

            showToast(`✅ IR number updated from ${formatIrNumber(ir.irNo)} to ${formatIrNumber(newIrNo)}`);
            setTimeout(() => loadAllData(), 500);

        } catch (err) {
            console.error("Update failed:", err);
            showToast(`❌ Update failed: ${err.message}`);
        } finally {
            setSavingSerials((s) => {
                const map = { ...s };
                delete map[ir.irNo];
                return map;
            });
        }
    }

    // Get projects list for filters
    const projects = [...new Set(irs.map(item => item.project).filter(Boolean))].sort();

    // Get departments list for filters
    const departments = [...new Set(irs.map(item => item.department).filter(Boolean))].sort();

    // Stats
    const stats = {
        total: irs.length,
        pending: irs.filter(ir => !ir.isDone && !ir.isRevision).length,
        revisions: irs.filter(ir => ir.isRevision).length,
        cpr: irs.filter(ir => ir.isCPR).length,
        cprRevisions: irs.filter(ir => ir.isRevision && ir.revisionType === "CPR_REVISION").length,
        completed: irs.filter(ir => ir.isDone).length
    };

    // Reset all filters
    const resetAllFilters = () => {
        setSidebarFilters({
            project: "all",
            department: "all",
            type: "all",
            status: "all"
        });
        setAdvancedFilters({
            project: "all",
            type: "all",
            status: "all",
            dateRange: "all",
            department: "all"
        });
        setSearchTerm("");
    };

    // 🎨 Render Components
    const LoadingScreen = () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading IRs...</p>
            </div>
        </div>
    );

    const ToastNotification = () => (
        toast && (
            <div className="fixed top-5 right-5 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-5">
                {toast}
            </div>
        )
    );

    const StatsCards = () => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">{filteredIRs.length}</div>
                <div className="text-sm text-gray-500">Showing</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                    {filteredIRs.filter(ir => !ir.isDone && !ir.isRevision).length}
                </div>
                <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                    {filteredIRs.filter(ir => ir.isRevision).length}
                </div>
                <div className="text-sm text-gray-500">Revisions</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">
                    {filteredIRs.filter(ir => ir.isDone).length}
                </div>
                <div className="text-sm text-gray-500">Completed</div>
            </div>
        </div>
    );

    const SearchBar = () => (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        🔍 Search IR/CPR/REV
                    </label>
                    <input
                        type="text"
                        placeholder="Search by number, description, user, project, floor, concrete grade, downloaded by..."
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setSearchTerm("")}
                    className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
                >
                    Clear Search
                </button>
            </div>
            <div className="mt-4 text-sm text-gray-600">
                <p>💡 Tips: Search by project (e.g., "D1"), department (e.g., "ST"), type (e.g., "CPR"), or downloaded by user</p>
            </div>
        </div>
    );

    const AdvancedFilters = () => (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <h3 className="text-lg font-bold text-gray-800">🎯 Advanced Filters</h3>
                <button
                    onClick={() => setAdvancedFilters({
                        project: "all",
                        type: "all",
                        status: "all",
                        dateRange: "all",
                        department: "all"
                    })}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm"
                >
                    Reset Advanced Filters
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <select
                        value={advancedFilters.project}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, project: e.target.value }))}
                        className="w-full p-2 border rounded-lg bg-white"
                    >
                        <option value="all">All Projects</option>
                        {projects.map(project => (
                            <option key={project} value={project}>{project}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                        value={advancedFilters.type}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full p-2 border rounded-lg bg-white"
                    >
                        <option value="all">All Types</option>
                        <option value="ir">IR Only</option>
                        <option value="cpr">CPR Only</option>
                        <option value="revision">Revisions Only</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <select
                        value={advancedFilters.dateRange}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                        className="w-full p-2 border rounded-lg bg-white"
                    >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                        value={advancedFilters.status}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full p-2 border rounded-lg bg-white"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                        value={advancedFilters.department}
                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full p-2 border rounded-lg bg-white"
                    >
                        <option value="all">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );

    const EmptyState = () => (
        <div className="bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Items Found</h3>
            <p className="text-gray-500 mb-4">
                No items match your current filters. Try adjusting your search criteria.
            </p>
            <button
                onClick={resetAllFilters}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
                Reset All Filters
            </button>
        </div>
    );

    const RevisionChip = ({ rev }) => {
        const displayNumber = getRevDisplayNumber(rev);
        const revTypeClass = getRevTypeClass(rev);
        const revTypeText = getRevTypeText(rev);
        const time = extractTime(rev.sentAt);

        return (
            <div className="p-4 rounded-lg border-l-4 border-amber-500 bg-amber-50">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-1">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${revTypeClass}`}>
                            {revTypeText}
                        </span>
                        <span className="text-xs font-semibold px-2 py-1 bg-gray-200 text-gray-800 rounded">
                            {displayNumber}
                        </span>
                    </div>
                </div>

                <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            📌 {rev.project || "Unknown"}
                        </span>
                        <span className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-800 rounded">
                            🏢 {getDeptAbbr(rev.department)}
                        </span>
                        <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-800 rounded">
                            👤 {rev.user || "Unknown"}
                        </span>
                    </div>
                </div>

                <div className="text-sm text-gray-700 mb-4">
                    {rev.revNote || rev.desc || ""}
                </div>

                <div className="text-xs text-gray-500 mb-4">
                    ⏰ {time} • {formatShortDate(rev.sentAt)}
                </div>

                <div className="flex gap-2">
                    {!rev.isDone && (
                        <button
                            onClick={() => markRevDone(rev.irNo || rev.revNo)}
                            className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-black text-white rounded-lg transition flex-1"
                        >
                            Mark Done
                        </button>
                    )}
                    <button
                        onClick={() => handleArchive(rev.irNo || rev.revNo)}
                        className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition flex-1"
                    >
                        Archive
                    </button>
                </div>
            </div>
        );
    };

    const IRTableRow = ({ ir, dept }) => {
        const isDownloaded = downloadedIRs.has(ir.irNo) || ir.isDone;
        const isCPR = ir.isCPR;

        return (
            <tr className={`border-b transition-colors
                ${isDownloaded ? "bg-emerald-50 hover:bg-emerald-100" :
                isCPR ? "bg-green-50 hover:bg-green-100" :
                "hover:bg-blue-50"}`}
            >
                <td className="p-3">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            {isCPR && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                                    CPR
                                </span>
                            )}
                            <div className="relative flex-1">
                                <div className="text-xs text-gray-500 truncate" title={ir.irNo}>
                                    Full: {ir.irNo}
                                </div>

                                <input
                                    className="w-full border border-gray-300 px-2 py-2 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-24 mt-2"
                                    value={customNumbers[ir.irNo] ?? formatIrNumber(ir.irNo)}
                                    onChange={(e) => setCustomNumbers((prev) => ({ ...prev, [ir.irNo]: e.target.value }))}
                                    placeholder="Change IR number..."
                                />
                                <button
                                    disabled={!!savingSerials[ir.irNo]}
                                    onClick={() => handleConfirmSerial(ir)}
                                    className={`absolute right-1 bottom-1 px-3 py-1.5 rounded text-sm font-medium ${savingSerials[ir.irNo] ?
                                        "bg-gray-400 text-gray-700 cursor-not-allowed" :
                                        "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                                >
                                    {savingSerials[ir.irNo] ? "..." : "Update"}
                                </button>
                            </div>
                        </div>
                    </div>
                </td>

                <td className="p-3">
                    <div className="font-medium text-gray-800">{ir.desc}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        {ir.location && `Location: ${ir.location}`}
                        {!isCPR && ir.floor && ` • Floor: ${ir.floor}`}
                        {isCPR && ir.concreteGrade && ` • Grade: ${ir.concreteGrade}`}
                        {isCPR && ir.pouringElement && ` • Element: ${ir.pouringElement}`}
                    </div>
                </td>

                <td className="p-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium
                        ${isCPR ? "bg-green-100 text-green-800 border border-green-300" :
                        "bg-blue-100 text-blue-800 border border-blue-300"}`}>
                        {isCPR ? "CPR" : "IR"}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                        {ir.user || "—"}
                    </div>
                </td>

                <td className="p-3">
                    <div className="space-y-1 min-w-[150px]">
                        {ir.tags?.engineer && ir.tags.engineer.length > 0 && (
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold text-blue-700">IR:</span>
                                <div className="flex flex-wrap gap-1">
                                    {ir.tags.engineer.map((tag, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs border border-blue-200 rounded">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {ir.tags?.sd && ir.tags.sd.length > 0 && (
                            <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold text-green-700">SD:</span>
                                <div className="flex flex-wrap gap-1">
                                    {ir.tags.sd.map((tag, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 bg-green-50 text-green-700 text-xs border border-green-200 rounded">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(!ir.tags?.engineer || ir.tags.engineer.length === 0) &&
                            (!ir.tags?.sd || ir.tags.sd.length === 0) && (
                                <span className="text-xs text-gray-400 italic">No tags</span>
                            )}
                    </div>
                </td>

                <td className="p-3">
                    <div className="text-gray-600 whitespace-pre-line">
                        {formatDateShort(ir.sentAt)}
                    </div>
                </td>

                <td className="p-3">
                    <div className="space-y-2">
                        {isDownloaded ? (
                            <div className="flex flex-col gap-1">
                                <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                                    <span>✓</span> Done
                                </span>

                                {ir.downloadedBy && (
                                    <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                        <span className="font-medium">📄 Downloaded by:</span> {ir.downloadedBy}
                                        {ir.downloadedAt && (
                                            <div className="text-gray-500 mt-1">
                                                on {formatShortDate(ir.downloadedAt)}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                Pending
                            </span>
                        )}
                    </div>
                </td>

                <td className="p-3">
                    <div className="flex gap-2">
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => handleCopy(ir)}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-800 text-white rounded text-sm flex items-center gap-2 shadow-sm min-w-[80px]"
                            >
                                <span>📋</span> Copy
                            </button>
                            <button
                                onClick={() => handleDownloadWord(ir)}
                                className={`px-3 py-2 text-white rounded text-sm flex items-center gap-2 shadow-sm min-w-[80px]
                                    ${isDownloaded ?
                                    "bg-emerald-600 hover:bg-emerald-800" :
                                    "bg-indigo-600 hover:bg-indigo-800"}`}
                            >
                                <span>{isDownloaded ? "✅" : "📄"}</span>
                                {isDownloaded ? "Download Again" : "Word"}
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => handleArchive(ir.irNo)}
                                className="px-3 py-2 bg-amber-600 hover:bg-amber-800 text-white rounded text-sm flex items-center gap-2 shadow-sm min-w-[80px]"
                            >
                                <span>📁</span> Archive
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

    const ProjectSection = ({ project, depts }) => {
        const projectRevs = Object.values(depts).flat().filter((x) => x.isRevision);
        const projectIRs = Object.values(depts).flat().filter((x) => !x.isRevision);

        return (
            <section key={project} className="bg-white rounded-2xl shadow-lg border overflow-hidden">
                <div className="bg-gradient-to-r from-sky-700 to-sky-600 text-white p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                📌 {project}
                                <span className="text-sm font-normal bg-sky-800 px-3 py-1 rounded-full">
                                    {Object.values(depts).flat().length} items
                                </span>
                            </h2>
                            <div className="flex flex-wrap gap-3 mt-2">
                                <span className="text-sky-200">
                                    IR: {projectIRs.filter(x => !x.isCPR).length}
                                </span>
                                <span className="text-green-200">
                                    CPR: {projectIRs.filter(x => x.isCPR).length}
                                </span>
                                <span className="text-amber-200">
                                    REV: {projectRevs.length}
                                </span>
                                <span className="text-yellow-200">
                                    Pending: {projectIRs.filter(x => !x.isDone).length}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const allItems = Object.values(depts).flat();
                                    handleCopyAll(allItems.filter(item => !item.isRevision));
                                }}
                                className="px-4 py-2 bg-sky-800 hover:bg-sky-900 rounded-lg font-medium flex items-center gap-2"
                            >
                                📋 Copy All IRs
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* REV Chips */}
                    {projectRevs.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                                🔄 Pending Revisions ({projectRevs.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {projectRevs.map((rev) => (
                                    <RevisionChip key={rev.irNo || rev.revNo} rev={rev} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* IR Tables by Department */}
                    {Object.keys(depts).map((dept) => {
                        const list = depts[dept].filter((ir) => !ir.isRevision);
                        if (list.length === 0) return null;

                        return (
                            <div key={dept} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                            ${dept === "ARCH" ? "bg-blue-100 text-blue-800" :
                                            dept === "ST" ? "bg-green-100 text-green-800" :
                                            dept === "ELECT" ? "bg-purple-100 text-purple-800" :
                                            dept === "MEP" ? "bg-amber-100 text-amber-800" :
                                            "bg-gray-100 text-gray-800"}`}>
                                            {dept}
                                        </span>
                                        {dept === "ST" ? "Civil/Structure" : dept} Department
                                        <span className="text-sm font-normal text-gray-500">
                                            ({list.length} items)
                                        </span>
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleCopyAll(list)}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                                        >
                                            Copy All
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full">
                                        <thead className="bg-gray-900 text-white">
                                            <tr>
                                                <th className="p-3 text-left">IR No</th>
                                                <th className="p-3 text-left">Description</th>
                                                <th className="p-3 text-left">Type</th>
                                                <th className="p-3 text-left">Attach</th>
                                                <th className="p-3 text-left">Sent At</th>
                                                <th className="p-3 text-left">Status</th>
                                                <th className="p-3 text-left">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {list.map((ir) => (
                                                <IRTableRow key={ir.irNo} ir={ir} dept={dept} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        );
    };

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <ToastNotification />

            {/* Main Content */}
            <div className="flex flex-col gap-6 w-full px-32">
                <div className="">
                    <StatsCards />
                    <SearchBar />
                    <AdvancedFilters />

                    {/* Main Content */}
                    {Object.keys(grouped).length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="space-y-8">
                            {Object.keys(grouped).map((project) => (
                                <ProjectSection 
                                    key={project} 
                                    project={project} 
                                    depts={grouped[project]} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm border-t">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <p>DC Dashboard • Showing: {filteredIRs.length} of {irs.length} items</p>
                    <p>Last Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>
        </div>
    );
}

/**
 * تنسيق رقم IR/CPR بشكل مختصر
 */
function formatIrNumber(full) {
    if (!full) return "";
    try {
        if (full.includes("BADYA-CON")) {
            const parts = full.split("-");
            if (parts.length >= 6) {
                const project = parts[2] || "";
                const type = parts[3] || "";
                const dept = parts[4] || "";
                const number = parts[5] || "";

                if (type === "CPR") {
                    return `CPR-${project}-${dept}-${number}`;
                }
                return `${project}-${dept}-${number}`;
            }
        }

        if (full.includes("REV-")) {
            const revParts = full.split("-");
            if (revParts.length >= 3) {
                return `REV-${revParts[1]}-${revParts[2]}`;
            }
        }

        return full;
    } catch {
        return full;
    }
}