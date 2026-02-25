// ---------------------------------------------------------
// FIREBASE SERVICE - COPY FUNCTIONS ONLY
// ---------------------------------------------------------

/**
 * الحصول على نوع العنصر من الـ item
 * Priority:
 * 1. item.type (إذا كان موجوداً)
 * 2. item.locationType (إذا كان موجوداً)
 * 3. من typesMap باستخدام الموقع
 * 4. requestType (CPR/IR)
 * 5. القيم الافتراضية
 */
function getItemType(item) {
  // 1. إذا كان هناك type موجود في الـ item نفسه
  if (item.type) return item.type;
  
  // 2. إذا كان هناك locationType (يُمرر من DcPage)
  if (item.locationType) return item.locationType;
  
  // 3. إذا كان هناك typesMap والتقاطعات
  if (item.typesMap && item.location) {
    const locationType = item.typesMap[item.location];
    if (locationType) return locationType;
  }
  
  // 4. التحقق من وجود requestType
  if (item.requestType === "CPR") return "CPR";
  if (item.requestType === "IR") return "IR";
  
  // 5. التحقق من isCPR
  if (item.isCPR) return "CPR";
  
  // 6. القيم الافتراضية
  if (item.isRevision) {
    return item.revisionType === "CPR_REVISION" ? "CPR REV" : "IR REV";
  }
  
  return "IR";
}

/**
 * الحصول على التاريخ بشكل آمن
 */
function getSafeDate(item) {
  if (item.receivedDate) return item.receivedDate;
  if (item.sentAt) return item.sentAt;
  if (item.createdAt) return item.createdAt;
  if (item.archivedAt) return item.archivedAt;
  
  // تاريخ اليوم كـ fallback
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  }).replace(/\//g, '/');
}

/**
 * تحويل كائن IR/CPR إلى صف Excel
 * الترتيب المطلوب: SerialNumber | L | 0 | description | location | type | receivedDate
 */
function convertIRToExcelRow(ir) {
  // التأكد من وجود البيانات الأساسية
  if (!ir) return "";
  
  // الحصول على النوع المناسب
  const itemType = getItemType(ir);
  
  // الحصول على الرقم (يفضل irNo، ثم revNo)
  const serialNumber = ir.irNo || ir.revNo || "";
  
  // الحصول على الوصف
  const description = ir.desc || ir.revNote || "";
  
  // الحصول على الموقع
  const location = ir.location || "";
  
  // الحصول على التاريخ
  const receivedDate = getSafeDate(ir);
  
  // الترتيب المطلوب: SerialNumber | L | 0 | description | location | type | receivedDate
  return [
    serialNumber,           // SerialNumber (الرقم الكامل)
    "HYPERLINK",                    // 0 (ثابت)
    "0",                    // 0 (ثابت)
    "L",                    // L (ثابت)
    description,            // description
    location,               // location
    itemType,               // type (trio-c, cor-c, TRIO-CM, TRIO-C, CPR, IR, etc.)
    receivedDate            // receivedDate
  ].join("\t");
}

// ---------------------------------------------------------
// 📌 VALIDATION FUNCTIONS
// ---------------------------------------------------------

/**
 * التحقق من صحة البيانات قبل النسخ
 */
function validateItem(item) {
  if (!item) {
    throw new Error("Item is undefined or null");
  }
  
  if (!item.irNo && !item.revNo) {
    console.warn("⚠️ Item has no number:", item);
    // لا نرمي خطاً، نستمر مع قيمة فارغة
  }
  
  return true;
}

// ---------------------------------------------------------
// 📌 COPY ONE ROW
// ---------------------------------------------------------

/**
 * نسخ صف واحد إلى الحافظة
 * @param {Object} ir - كائن IR/CPR/REV
 * @returns {Promise<string>} - النص المنسوخ
 */
export async function copyRow(ir) {
  try {
    // التحقق من صحة البيانات
    validateItem(ir);
    
    // تحويل إلى صف Excel
    const row = convertIRToExcelRow(ir);
    
    // نسخ إلى الحافظة
    await navigator.clipboard.writeText(row);
    
    // تسجيل النجاح
    console.log("✅ Copied row:", row);
    console.log("📋 Item details:", {
      number: ir.irNo || ir.revNo,
      type: getItemType(ir),
      location: ir.location
    });
    
    return row;
  } catch (err) {
    console.error("❌ Copy failed:", err);
    console.error("Item that failed:", ir);
    throw new Error(`Failed to copy: ${err.message}`);
  }
}

// ---------------------------------------------------------
// 📌 COPY ALL ROWS (NO HEADER)
// ---------------------------------------------------------

/**
 * نسخ عدة صفوف إلى الحافظة (بدون Header)
 * @param {Array} list - قائمة كائنات IR/CPR/REV
 * @returns {Promise<string>} - النص المنسوخ
 */
export async function copyAllRows(list) {
  try {
    // التحقق من صحة المدخلات
    if (!Array.isArray(list)) {
      throw new Error("Input must be an array");
    }
    
    if (list.length === 0) {
      throw new Error("No rows to copy");
    }
    
    console.log(`📋 Preparing to copy ${list.length} rows...`);
    
    // Generate rows only (NO HEADER)
    const rows = list.map((ir) => {
      try {
        return convertIRToExcelRow(ir);
      } catch (itemError) {
        console.warn("⚠️ Error converting item:", ir, itemError);
        return ""; // صف فارغ للعناصر التي فشلت
      }
    }).filter(row => row !== ""); // إزالة الصفوف الفارغة
    
    if (rows.length === 0) {
      throw new Error("No valid rows to copy after filtering");
    }
    
    // Join rows
    const finalText = rows.join("\n");
    
    // Copy to clipboard
    await navigator.clipboard.writeText(finalText);
    
    console.log(`✅ Copied ${rows.length} rows successfully`);
    console.log("📋 Sample first row:", rows[0]);
    
    return finalText;
  } catch (err) {
    console.error("❌ Copy all failed:", err);
    throw new Error(`Failed to copy all rows: ${err.message}`);
  }
}

// ---------------------------------------------------------
// 📌 COPY WITH HEADER
// ---------------------------------------------------------

/**
 * نسخ عدة صفوف إلى الحافظة (مع Header)
 * @param {Array} list - قائمة كائنات IR/CPR/REV
 * @returns {Promise<string>} - النص المنسوخ
 */
export async function copyWithHeader(list) {
  try {
    // التحقق من صحة المدخلات
    if (!Array.isArray(list)) {
      throw new Error("Input must be an array");
    }
    
    if (list.length === 0) {
      throw new Error("No rows to copy");
    }
    
    console.log(`📋 Preparing to copy ${list.length} rows with header...`);
    
    // Header row
    const header = ["SerialNumber","HYPERLINK", "0", "L", "Description", "Location", "Type", "ReceivedDate"].join("\t");
    
    // Data rows
    const rows = list.map((ir) => {
      try {
        return convertIRToExcelRow(ir);
      } catch (itemError) {
        console.warn("⚠️ Error converting item:", ir, itemError);
        return "";
      }
    }).filter(row => row !== "");
    
    if (rows.length === 0) {
      throw new Error("No valid rows to copy after filtering");
    }
    
    // Join header + rows
    const finalText = [header, ...rows].join("\n");
    
    // Copy to clipboard
    await navigator.clipboard.writeText(finalText);
    
    console.log(`✅ Copied ${rows.length} rows with header successfully`);
    console.log("📋 Header:", header);
    console.log("📋 Sample first row:", rows[0]);
    
    return finalText;
  } catch (err) {
    console.error("❌ Copy with header failed:", err);
    throw new Error(`Failed to copy with header: ${err.message}`);
  }
}

// ---------------------------------------------------------
// 📌 UTILITY FUNCTIONS
// ---------------------------------------------------------

/**
 * تحويل قائمة إلى نص Excel (دون نسخ)
 * @param {Array} list - قائمة كائنات IR/CPR/REV
 * @returns {string} - نص Excel
 */
export function convertToExcelText(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return "";
  }
  
  const rows = list.map(ir => convertIRToExcelRow(ir));
  return rows.join("\n");
}

/**
 * تحويل قائمة إلى نص Excel مع Header (دون نسخ)
 * @param {Array} list - قائمة كائنات IR/CPR/REV
 * @returns {string} - نص Excel مع Header
 */
export function convertToExcelTextWithHeader(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return "";
  }
  
  const header = ["SerialNumber","HYPERLINK", "0", "L", "Description", "Location", "Type", "ReceivedDate"].join("\t");
  const rows = list.map(ir => convertIRToExcelRow(ir));
  
  return [header, ...rows].join("\n");
}

// ---------------------------------------------------------
// 📌 TEST FUNCTION
// ---------------------------------------------------------

/**
 * اختبار دالة التحويل (للاستخدام في التطوير فقط)
 */
export function testConversion() {
  const testItem = {
    irNo: "BADYA-CON-D6-A7-CPR-342",
    desc: "Concrete Pouring Request for Roof Columns At A7-02-06",
    location: "A7-02-06",
    requestType: "CPR",
    type: "Cor-C",
    sentAt: "2/25/2026 9:27"
  };
  
  const result = convertIRToExcelRow(testItem);
  console.log("Test result:", result);
  return result;
}

// ---------------------------------------------------------
// 📌 EXPORT DEFAULT
// ---------------------------------------------------------

export default {
  copyRow,
  copyAllRows,
  copyWithHeader,
  convertToExcelText,
  convertToExcelTextWithHeader,
  testConversion
};