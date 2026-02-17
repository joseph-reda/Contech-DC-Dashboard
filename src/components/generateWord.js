// -------------------------
//    GENERATE WORD FILE
// -------------------------
import { API_URL } from "../config";

export async function downloadWord(ir) {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const getTodayDate = () => {
      const now = new Date();
      return now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    };

    const payload = {
      IRNo: ir.irNo || "",
      ProjectName: ir.project || "",     
      Description: ir.desc || "",         
      ReceivedDate: getTodayDate(),
      requestType: ir.type || "IR",       
      department: ir.department || "",    
      downloadedBy: user.fullname || "",
      desc: ir.desc || "",
      project: ir.project || "",
      department: ir.department || ""
    };

    console.log("📤 Word generation payload:", payload);

    const res = await fetch(`${API_URL}/generate-word`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to generate file");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    
    let filename = ir.irNo || "document";
    if (!filename.includes("BADYA-CON")) {
      filename = `IR-${filename}`;
    }
    a.download = `${filename}.docx`;
    
    document.body.appendChild(a);
    a.click();
    
    // تنظيف الذاكرة
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log(`✅ Word file downloaded: ${filename}.docx`);
    
  } catch (error) {
    console.error("Download Error:", error);
    alert("حدث خطأ أثناء تحميل الملف: " + error.message);
  }
}