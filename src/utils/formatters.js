// src/utils/formatters.js

/**
 * تنسيق رقم IR/CPR بشكل مختصر
 * @param {string} full - الرقم الكامل (مثل: BADYA-CON-D1-IR-ST-001)
 * @returns {string} - الرقم المختصر (مثل: D1-ST-001)
 */
export const formatIrNumber = (full) => {
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
};

/**
 * تنسيق التاريخ مع الوقت في سطرين
 * @param {string} dateStr - نص التاريخ
 * @returns {string} - التاريخ المنسق (مثل: 25-Jan-2024\n14:30)
 */
export const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
        const date = new Date(dateStr);
        if (isNaN(date)) return dateStr;
        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date) + "\n" + 
        new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    } catch {
        return dateStr;
    }
};

/**
 * تنسيق التاريخ مع الوقت في سطرين (مختصر)
 * @param {string} dateStr - نص التاريخ
 * @returns {string} - التاريخ المنسق (مثل: 25-Jan\n14:30)
 */
export const formatDateShort = (dateStr) => {
    if (!dateStr) return "—";
    try {
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

/**
 * تنسيق التاريخ فقط (بدون الوقت)
 * @param {string} dateStr - نص التاريخ
 * @returns {string} - التاريخ المنسق (مثل: 25-Jan)
 */
export const formatShortDate = (dateStr) => {
    if (!dateStr) return "";
    try {
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

/**
 * الحصول على اختصار القسم
 * @param {string} department - اسم القسم الكامل
 * @returns {string} - اختصار القسم (مثل: ST, ARCH, ELECT)
 */
export const getDepartmentAbbr = (department) => {
    if (!department) return "";
    const dept = department.toUpperCase();
    if (dept.includes("ARCH")) return "ARCH";
    if (dept.includes("CIVIL") || dept.includes("STRUCT")) return "ST";
    if (dept.includes("ELECT")) return "ELECT";
    if (dept.includes("MEP") || dept.includes("MECH")) return "MEP";
    if (dept.includes("SURV")) return "SURV";
    if (dept.includes("REV")) return "REV";
    return dept.substring(0, 4);
};

/**
 * استخراج الوقت فقط من نص التاريخ
 * @param {string} dateStr - نص التاريخ
 * @returns {string} - الوقت فقط (مثل: 14:30 PM)
 */
export const extractTime = (dateStr) => {
    if (!dateStr) return "Unknown";
    try {
        if (dateStr.includes(":")) {
            const parts = dateStr.split(" ");
            if (parts.length >= 3) return `${parts[1]} ${parts[2]}`;
            return dateStr;
        } else {
            const date = new Date(dateStr);
            if (isNaN(date)) return dateStr;
            return date.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                hour12: true 
            });
        }
    } catch {
        return dateStr;
    }
};

/**
 * تحويل القسم إلى صيغة موحدة للبحث
 * @param {string} department - اسم القسم
 * @returns {string} - القسم الموحد (مثل: ARCH, ST, ELECT)
 */
export const normalizeDepartment = (department) => {
    if (!department) return "UNKNOWN";
    const d = String(department).toUpperCase().replace(/[^A-Z]/g, "");
    if (d.includes("ARCH")) return "ARCH";
    if (d.includes("CIVIL") || d.includes("STRUCTURE")) return "ST";
    if (d.includes("ELECT")) return "ELECT";
    if (d.includes("MEP") || d.includes("MECHAN")) return "MEP";
    if (d.includes("SURV")) return "SURVEY";
    return d;
};

/**
 * تنسيق التاريخ في صيغة مناسبة للوثائق
 * @param {string} dateStr - نص التاريخ
 * @returns {string} - التاريخ المنسق (مثل: 25 Jan 2024)
 */
export const getDocumentDate = (dateStr) => {
    if (!dateStr) return "";
    try {
        const date = new Date(dateStr);
        if (isNaN(date)) return dateStr;
        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date).replace(/ /g, ' ');
    } catch {
        return dateStr;
    }
};

/**
 * التحقق مما إذا كان العنصر من نوع CPR
 * @param {object} item - العنصر
 * @returns {boolean} - true إذا كان CPR
 */
export const isCPRItem = (item) => {
    return item?.requestType === "CPR" || item?.isCPR === true;
};

/**
 * التحقق مما إذا كان العنصر مراجعة
 * @param {object} item - العنصر
 * @returns {boolean} - true إذا كان مراجعة
 */
export const isRevisionItem = (item) => {
    return item?.isRevision === true;
};

/**
 * الحصول على النص الكامل لنوع العنصر
 * @param {object} item - العنصر
 * @returns {string} - نوع العنصر (مثل: IR, CPR, IR REVISION, CPR REVISION)
 */
export const getItemTypeText = (item) => {
    if (!item) return "Unknown";
    
    if (item.isRevision) {
        if (item.revisionType === "CPR_REVISION" || item.isCPRRevision) {
            return "CPR REVISION";
        }
        return "IR REVISION";
    }
    
    if (item.requestType === "CPR" || item.isCPR) {
        return "CPR";
    }
    
    return "IR";
};

/**
 * تنسيق وقت مرسل للمستخدم
 * @param {string} dateStr - نص التاريخ
 * @returns {string} - الوقت المناسب (مثل: اليوم 14:30، أمس 10:00، 25 يناير)
 */
export const formatUserTime = (dateStr) => {
    if (!dateStr) return "Unknown";
    
    try {
        const date = new Date(dateStr);
        if (isNaN(date)) return dateStr;
        
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return formatShortDate(dateStr);
        }
    } catch {
        return dateStr;
    }
};