// /utils/export.js

/**
 * 將二維陣列匯出為 CSV 檔案並觸發下載。
 * @param {string} filename - 下載的檔名（不含 .csv）。
 * @param {string[][]} data - 要匯出的資料，第一行為標頭。
 */
export function exportToCsv(filename, data) {
  if (!data || data.length === 0) {
    console.error("No data to export.");
    return;
  }

  // 將陣列轉換為 CSV 格式的字串
  const csvContent = data
    .map((row) =>
      row
        .map((field) => {
          // 處理包含逗號或引號的欄位
          const str = String(field || "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    )
    .join("\n");

  // 建立 Blob 物件，並加入 UTF-8 BOM
  // BOM（Byte Order Mark）是必需的，這樣 Microsoft Excel 才能正確識別 UTF-8 編碼並顯示中文
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8;" });

  // 使用隱形連結觸發下載
  const link = document.createElement("a");
  if (link.download !== undefined) {
    // 檢查瀏覽器是否支援 download 屬性
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
