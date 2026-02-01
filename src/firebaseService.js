// ---------------------------------------------------------
// NO FIREBASE — ONLY COPY FUNCTIONS
// ---------------------------------------------------------

// Convert IR object → Excel row text with the required order
function convertIRToExcelRow(ir) {
  return [                  // IR Latest Rev (Always L)
    ir.desc || "",              // Description
    ir.location || "",          // Location
    ir.type || "",              // Type
    ir.receivedDate || "", // 📌 Date
  ].join("\t");
}

// ---------------------------------------------------------
// 📌 COPY ONE ROW
// ---------------------------------------------------------
export async function copyRow(ir) {
  const row = convertIRToExcelRow(ir);
  await navigator.clipboard.writeText(row);
  return row;
}

// ---------------------------------------------------------
// 📌 COPY ALL ROWS (NO HEADER) — FINAL VERSION
// ---------------------------------------------------------
export async function copyAllRows(list) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("No rows to copy");
  }

  // Generate rows only (NO HEADER)
  const rows = list.map((ir) => convertIRToExcelRow(ir));

  // Join rows
  const finalText = rows.join("\n");

  await navigator.clipboard.writeText(finalText);

  return finalText;
}