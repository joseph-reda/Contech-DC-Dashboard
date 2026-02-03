// src/pages/DcPage.jsx
import { useEffect, useState, useCallback, memo, useRef } from "react"; // أضف useRef
import { copyRow, copyAllRows } from "../firebaseService";
import { API_URL } from "../config";
import { useNavigate } from "react-router-dom";
import {
    formatIrNumber,
    formatDateShort,
    getDepartmentAbbr,
    extractTime
} from "../utils/formatters";

export default function DcPage() {
    const navigate = useNavigate();
    const [irs, setIRs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState("");
    const [customNumbers, setCustomNumbers] = useState({});
    const [savingSerials, setSavingSerials] = useState({});
    const [downloadedIRs, setDownloadedIRs] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState(null);
    
    // Refs لحفظ الحالة
    const customNumbersRef = useRef({});
    const tableContainerRef = useRef(null);
    const scrollPositionRef = useRef(0);
    const inputRefs = useRef({});

    // Advanced Filters only (no more sidebar)
    const [filters, setFilters] = useState({
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

    // حفظ موضع التمرير قبل التحديثات
    useEffect(() => {
        const handleBeforeUpdate = () => {
            if (tableContainerRef.current) {
                scrollPositionRef.current = tableContainerRef.current.scrollTop;
            }
        };

        // يمكنك إضافة event listener إذا لزم الأمر
        return () => {
            // تنظيف إذا لزم
        };
    }, []);

    // استعادة موضع التمرير بعد تحديث البيانات
    useEffect(() => {
        if (tableContainerRef.current && scrollPositionRef.current > 0) {
            setTimeout(() => {
                if (tableContainerRef.current) {
                    tableContainerRef.current.scrollTop = scrollPositionRef.current;
                }
            }, 100);
        }
    }, [irs]);

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

    // دالة محسنة لإعادة تحميل البيانات
    const loadAllData = useCallback(async (preserveScroll = true) => {
        setLoading(true);
        setError(null);
        
        // حفظ موضع التمرير إذا طُلب
        if (preserveScroll && tableContainerRef.current) {
            scrollPositionRef.current = tableContainerRef.current.scrollTop;
        }
        
        try {
            const [resIrs, resRevs] = await Promise.all([
                fetch(`${API_URL}/irs`),
                fetch(`${API_URL}/revs`)
            ]);

            if (!resIrs.ok) throw new Error(`Failed to load IRs: ${resIrs.status}`);
            if (!resRevs.ok) throw new Error(`Failed to load Revisions: ${resRevs.status}`);

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
                tags: ir.tags || { engineer: [], sd: [] },
                departmentAbbr: getDepartmentAbbr(ir.department)
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
                departmentAbbr: getDepartmentAbbr(rev.department),
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
            customNumbersRef.current = map;

            setError(null);
        } catch (err) {
            console.error("Load error:", err);
            setError("Failed to load data. Please try again.");
            showToast("Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    // Load all data once
    useEffect(() => {
        loadAllData(false);
    }, [loadAllData]);

    // 🔧 Helper Functions
    const getRevDisplayNumber = useCallback((rev) => {
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
    }, []);

    const getRevTypeClass = useCallback((rev) => {
        if (!rev) return "bg-gray-100 text-gray-800";
        if (rev.revisionType === "CPR_REVISION" || rev.isCPRRevision) {
            return "bg-green-200 text-green-800";
        } else {
            return "bg-amber-200 text-amber-800";
        }
    }, []);

    const getRevTypeText = useCallback((rev) => {
        if (!rev) return "REVISION";
        if (rev.revisionType === "CPR_REVISION" || rev.isCPRRevision) {
            return "CPR REV";
        } else {
            return "IR REV";
        }
    }, []);

    const getStatusClass = useCallback((item) => {
        if (item.isDone) return "bg-emerald-100 text-emerald-800";
        if (item.isRevision) return "bg-amber-100 text-amber-800";
        return "bg-yellow-100 text-yellow-800";
    }, []);

    const getTypeClass = useCallback((item) => {
        if (item.isRevision) {
            if (item.revisionType === "CPR_REVISION" || item.isCPRRevision) {
                return "bg-green-100 text-green-800";
            }
            return "bg-purple-100 text-purple-800";
        }
        if (item.isCPR || item.requestType === "CPR") return "bg-green-100 text-green-800";
        return "bg-blue-100 text-blue-800";
    }, []);

    const getTodayDateStr = useCallback(() => {
        const now = new Date();
        return now.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/ /g, ' ');
    }, []);

    // Filter and search logic
    const filteredIRs = irs.filter(ir => {
        // Filter by project
        if (filters.project !== "all" && ir.project !== filters.project) return false;

        // Filter by type
        if (filters.type !== "all") {
            if (filters.type === "ir" && (ir.isCPR || ir.isRevision)) return false;
            if (filters.type === "cpr" && (!ir.isCPR || ir.isRevision)) return false;
            if (filters.type === "revision" && !ir.isRevision) return false;
        }

        // Filter by status
        if (filters.status !== "all") {
            if (filters.status === "pending" && ir.isDone) return false;
            if (filters.status === "completed" && !ir.isDone) return false;
        }

        // Filter by department
        if (filters.department !== "all") {
            const dept = getDepartmentAbbr(ir.department);
            if (dept !== filters.department) return false;
        }

        // Filter by date range
        if (filters.dateRange !== "all") {
            const itemDate = new Date(ir.sentAt || ir.receivedDate);
            const today = new Date();

            switch (filters.dateRange) {
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
            const revNumber = ir.isRevision ? getRevDisplayNumber(ir).toLowerCase() : "";

            return (
                irNumber.includes(term) ||
                revNumber.includes(term) ||
                (ir.desc && ir.desc.toLowerCase().includes(term)) ||
                (ir.project && ir.project.toLowerCase().includes(term)) ||
                (ir.user && ir.user.toLowerCase().includes(term)) ||
                (ir.floor && ir.floor.toLowerCase().includes(term)) ||
                (ir.concreteGrade && ir.concreteGrade.toLowerCase().includes(term)) ||
                (ir.downloadedBy && ir.downloadedBy.toLowerCase().includes(term)) ||
                (ir.location && ir.location.toLowerCase().includes(term))
            );
        }

        return true;
    });

    // Group by project and department
    const grouped = {};
    filteredIRs.forEach(ir => {
        const project = ir.project || "UNKNOWN";
        const deptKey = getDepartmentAbbr(ir.department);
        if (!grouped[project]) grouped[project] = {};
        if (!grouped[project][deptKey]) grouped[project][deptKey] = [];
        grouped[project][deptKey].push(ir);
    });

    // 🛠️ Action Handlers محسنة
    const handleArchive = useCallback(async (irNo, event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        const item = irs.find((x) => x.irNo === irNo || x.revNo === irNo);
        if (!item) {
            showToast("Item not found");
            return;
        }

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

            // تحديث الـ state محلياً دون إعادة تحميل كاملة
            setIRs((prev) => prev.filter((x) => x.irNo !== irNo && x.revNo !== irNo));

            // تحديث custom numbers
            setCustomNumbers(prev => {
                const newMap = { ...prev };
                delete newMap[irNo];
                return newMap;
            });

            // تحديث الـ ref
            delete customNumbersRef.current[irNo];

            showToast(`✅ ${itemName} archived successfully!`);

        } catch (err) {
            console.error("Archive failed:", err);
            showToast(`❌ Archive failed: ${err.message}`);
        }
    }, [irs]);

    const markRevDone = useCallback(async (irNo) => {
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

            // تحديث الـ state محلياً
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
        } catch (err) {
            console.error("markRevDone error:", err);
            showToast(`❌ Error: ${err.message}`);
        }
    }, []);

    const handleCopy = useCallback(async (ir) => {
        try {
            await copyRow(ir);
            showToast("✔ Copied!");
        } catch (err) {
            console.error("copy error:", err);
            showToast("Copy failed");
        }
    }, []);

    const handleCopyAll = useCallback(async (list) => {
        try {
            const filtered = list.filter((ir) => !ir.isRevision);
            await copyAllRows(filtered);
            showToast("✔ All Non-REV Copied!");
        } catch (err) {
            console.error("copyAll error:", err);
            showToast("Copy all failed");
        }
    }, []);

    const markItemAsDone = useCallback(async (item, newIrNo = null) => {
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

            // تحديث الـ state محلياً
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
                
                // تحديث الـ ref
                delete customNumbersRef.current[item.irNo];
                customNumbersRef.current[newIrNo] = newIrNo;
            }

            // تحديث downloadedIRs
            setDownloadedIRs(prev => new Set([...prev, item.irNo]));

        } catch (err) {
            console.error("Mark as done error:", err);
            showToast(`⚠️ File downloaded but failed to mark as done: ${err.message}`);
        }
    }, []);

    const handleDownloadWord = useCallback(async (ir) => {
        if (ir.isRevision) {
            showToast("REV items don't have Word files");
            return;
        }

        const user = JSON.parse(localStorage.getItem("user") || "null");
        if (!user || user.role !== "dc") {
            showToast("Please login as DC user");
            return;
        }

        const customNumber = customNumbers[ir.irNo] || customNumbersRef.current[ir.irNo];
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
            showToast(`✅ Word file with updated number ${finalIR} downloaded and marked as done!`);

        } catch (err) {
            console.error("Download failed:", err);
            showToast(`❌ Download failed: ${err.message}`);
        }
    }, [customNumbers, getTodayDateStr, markItemAsDone]);

    // دالة محسنة لتحديث أرقام IR
    const handleConfirmSerial = useCallback(async (ir) => {
        if (ir.isRevision) {
            showToast("Cannot update revision numbers");
            return;
        }

        const newValue = (customNumbers[ir.irNo] || customNumbersRef.current[ir.irNo] || "").trim();
        if (!newValue) {
            showToast("Please enter a new IR number");
            return;
        }

        // استخراج الرقم التسلسلي من الرقم الجديد
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

            // تحديث الرقم في الـ state محلياً
            const cleanProject = ir.project.replace(/ /g, "-").toUpperCase();
            const deptCode = getDepartmentAbbr(ir.department);

            let newIrNo;
            if (ir.requestType === "CPR" || ir.isCPR) {
                newIrNo = `BADYA-CON-${cleanProject}-CPR-${numericSerial.toString().padStart(3, '0')}`;
            } else {
                newIrNo = `BADYA-CON-${cleanProject}-IR-${deptCode}-${numericSerial.toString().padStart(3, '0')}`;
            }

            // تحديث IRs في الـ state بشكل محدد
            setIRs(prev =>
                prev.map(item => {
                    if (item.irNo === ir.irNo) {
                        return {
                            ...item,
                            irNo: newIrNo
                            // لا تعيد جميع الحواسلت للحفاظ على التركيز
                        };
                    }
                    return item;
                })
            );

            // تحديث custom numbers
            setCustomNumbers(prev => {
                const newMap = { ...prev };
                delete newMap[ir.irNo];
                newMap[newIrNo] = newIrNo;
                return newMap;
            });

            // تحديث الـ ref
            delete customNumbersRef.current[ir.irNo];
            customNumbersRef.current[newIrNo] = newIrNo;

            showToast(`✅ IR number updated to ${newIrNo}`);

            return json;

        } catch (err) {
            console.error("Update failed:", err);
            showToast(`❌ Update failed: ${err.message}`);
            throw err;
        } finally {
            setSavingSerials((s) => {
                const map = { ...s };
                delete map[ir.irNo];
                return map;
            });
        }
    }, [customNumbers]);

    // Get projects list for filters
    const projects = [...new Set(irs.map(item => item.project).filter(Boolean))].sort();

    // Get departments list for filters
    const departments = [...new Set(irs.map(item => getDepartmentAbbr(item.department)).filter(Boolean))].sort();

    // Stats
    const stats = {
        total: irs.length,
        pending: irs.filter(ir => !ir.isDone && !ir.isRevision).length,
        revisions: irs.filter(ir => ir.isRevision).length,
        cpr: irs.filter(ir => ir.isCPR).length,
        cprRevisions: irs.filter(ir => ir.isRevision && ir.revisionType === "CPR_REVISION").length,
        completed: irs.filter(ir => ir.isDone).length,
        ir: irs.filter(ir => !ir.isRevision && !ir.isCPR).length
    };

    // Reset all filters
    const resetAllFilters = useCallback(() => {
        setFilters({
            project: "all",
            type: "all",
            status: "all",
            dateRange: "all",
            department: "all"
        });
        setSearchTerm("");
    }, []);

    // Navigate to archive
    const navigateToArchive = () => {
        navigate("/dc/archive");
    };

    // 🎨 Render Components
    const LoadingScreen = () => (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading IRs...</p>
                <p className="text-gray-400 text-sm mt-2">Please wait a moment</p>
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

    const ErrorAlert = () => (
        error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3">
                    <div className="text-red-500 text-xl">⚠️</div>
                    <div className="flex-1">
                        <p className="font-medium text-red-700">{error}</p>
                        <button
                            onClick={() => loadAllData(true)}
                            className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                            Click here to retry
                        </button>
                    </div>
                </div>
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
                        placeholder="Search by number, description, user, project, floor, concrete grade, downloaded by, location..."
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoComplete="off"
                    />
                </div>
                <button
                    onClick={() => setSearchTerm("")}
                    className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
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
                <h3 className="text-lg font-bold text-gray-800">🎯 Filters</h3>
                <button
                    onClick={resetAllFilters}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm"
                >
                    Reset All Filters
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <select
                        value={filters.project}
                        onChange={(e) => setFilters(prev => ({ ...prev, project: e.target.value }))}
                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
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
                        value={filters.type}
                        onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
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
                        value={filters.dateRange}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
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
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                        value={filters.department}
                        onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
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
                {irs.length === 0
                    ? "No items in the system yet. Wait for engineers to submit requests."
                    : "No items match your current filters. Try adjusting your search criteria."}
            </p>
            <button
                onClick={resetAllFilters}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
                Reset All Filters
            </button>
        </div>
    );

    const RevisionChip = memo(({ rev }) => {
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
                            🏢 {getDepartmentAbbr(rev.department)}
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
                    ⏰ {time} • {formatDateShort(rev.sentAt)}
                </div>

                <div className="flex gap-2">
                    {!rev.isDone && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                markRevDone(rev.irNo || rev.revNo);
                            }}
                            className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-black text-white rounded-lg transition flex-1"
                        >
                            Mark Done
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(rev.irNo || rev.revNo, e);
                        }}
                        className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition flex-1"
                    >
                        Archive
                    </button>
                </div>
            </div>
        );
    });

    const IRTableRow = memo(({ ir, dept }) => {
        const isDownloaded = downloadedIRs.has(ir.irNo) || ir.isDone;
        const isCPR = ir.isCPR || ir.requestType === "CPR";
        const inputRef = useRef(null);

        // حفظ مرجع الـ input
        useEffect(() => {
            if (inputRef.current) {
                inputRefs.current[ir.irNo] = inputRef.current;
            }
        }, [ir.irNo]);

        const handleInputChange = (e) => {
            const value = e.target.value;
            setCustomNumbers(prev => ({
                ...prev,
                [ir.irNo]: value
            }));
            customNumbersRef.current[ir.irNo] = value;
        };

        const handleUpdateClick = (e) => {
            e.stopPropagation();
            handleConfirmSerial(ir);
        };

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
                                    ref={inputRef}
                                    className="w-full border border-gray-300 px-2 py-2 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pr-24 mt-2"
                                    value={customNumbers[ir.irNo] !== undefined ? customNumbers[ir.irNo] : formatIrNumber(ir.irNo)}
                                    onChange={handleInputChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleConfirmSerial(ir);
                                        }
                                    }}
                                    placeholder="Change IR number..."
                                    autoComplete="off"
                                />
                                <button
                                    disabled={!!savingSerials[ir.irNo]}
                                    onClick={handleUpdateClick}
                                    className={`absolute right-1 bottom-1 px-3 py-1.5 rounded text-sm font-medium ${savingSerials[ir.irNo] ?
                                            "bg-gray-400 text-gray-700 cursor-not-allowed" :
                                            "bg-emerald-600 hover:bg-emerald-700 text-white"
                                        }`}
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
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeClass(ir)}`}>
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
                                <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusClass(ir)}`}>
                                    <span>✓</span> Done
                                </span>

                                {ir.downloadedBy && (
                                    <div className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                        <span className="font-medium">📄 Downloaded by:</span> {ir.downloadedBy}
                                        {ir.downloadedAt && (
                                            <div className="text-gray-500 mt-1">
                                                on {formatDateShort(ir.downloadedAt)}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusClass(ir)}`}>
                                Pending
                            </span>
                        )}
                    </div>
                </td>

                <td className="p-3">
                    <div className="flex gap-2">
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(ir);
                                }}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-800 text-white rounded text-sm flex items-center gap-2 shadow-sm min-w-[80px]"
                            >
                                <span>📋</span> Copy
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadWord(ir);
                                }}
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchive(ir.irNo, e);
                                }}
                                className="px-3 py-2 bg-amber-600 hover:bg-amber-800 text-white rounded text-sm flex items-center gap-2 shadow-sm min-w-[80px]"
                            >
                                <span>📁</span> Archive
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        );
    });

    const ProjectSection = memo(({ project, depts }) => {
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
                                    IR: {projectIRs.filter(x => !x.isCPR && x.requestType !== "CPR").length}
                                </span>
                                <span className="text-green-200">
                                    CPR: {projectIRs.filter(x => x.isCPR || x.requestType === "CPR").length}
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
                                onClick={(e) => {
                                    e.stopPropagation();
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
                                    <RevisionChip key={`${rev.irNo}-${rev.sentAt || ''}`} rev={rev} />
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
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyAll(list);
                                            }}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                                        >
                                            Copy All
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-lg border" ref={tableContainerRef}>
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
                                                <IRTableRow
                                                    key={`${ir.irNo}-${ir.sentAt || ''}`}
                                                    ir={ir}
                                                    dept={dept}
                                                />
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
    });

    // Main render
    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <ToastNotification />

            {/* Main Content */}
            <div className="flex flex-col gap-6 w-full px-4 md:px-8 lg:px-32 py-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                            📊 DC Dashboard
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Total Items: <span className="font-bold text-blue-600">{irs.length}</span>
                            <span className="mx-3">•</span>
                            Showing: <span className="font-bold text-green-600">{filteredIRs.length}</span>
                            <span className="mx-3">•</span>
                            <button
                                onClick={() => loadAllData(true)}
                                className="text-blue-500 hover:text-blue-700 font-medium"
                            >
                                🔄 Refresh
                            </button>
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={navigateToArchive}
                            className="px-4 py-2 bg-gray-800 hover:bg-black text-white rounded-lg font-medium transition flex items-center gap-2"
                        >
                            📁 View Archive
                        </button>
                        <div className="text-sm bg-white/80 px-4 py-2 rounded-full shadow">
                            DC User Dashboard
                        </div>
                    </div>
                </div>

                {error && <ErrorAlert />}

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

                {/* Information Section */}
                {irs.length > 0 && (
                    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                        <div className="flex items-start gap-3">
                            <div className="text-blue-500 text-2xl">💡</div>
                            <div>
                                <h4 className="font-bold text-blue-800 mb-2">Dashboard Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white/50 p-3 rounded-lg">
                                        <p className="text-blue-700 text-sm font-medium">📋 IR/CPR Management</p>
                                        <p className="text-blue-600 text-xs mt-1">
                                            • Update IR numbers before download<br />
                                            • Download Word files for each IR<br />
                                            • Archive completed items<br />
                                            • Copy data to clipboard
                                        </p>
                                    </div>
                                    <div className="bg-white/50 p-3 rounded-lg">
                                        <p className="text-emerald-700 text-sm font-medium">🔄 Revision Handling</p>
                                        <p className="text-emerald-600 text-xs mt-1">
                                            • View all pending revisions<br />
                                            • Mark revisions as done<br />
                                            • Archive revisions when completed<br />
                                            • Separate revision counters
                                        </p>
                                    </div>
                                    <div className="bg-white/50 p-3 rounded-lg">
                                        <p className="text-purple-700 text-sm font-medium">⚡ Quick Actions</p>
                                        <p className="text-purple-600 text-xs mt-1">
                                            • Search by any field<br />
                                            • Filter by project, department, type<br />
                                            • Copy all IRs in a department<br />
                                            • View detailed statistics
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-500 text-sm border-t">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <p>DC Dashboard • Total: {irs.length} • Showing: {filteredIRs.length} • Last Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <div className="flex gap-4 mt-2 md:mt-0">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">IR: {stats.ir}</span>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">CPR: {stats.cpr}</span>
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">REV: {stats.revisions}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}