export type SpreadsheetCell = string | number | boolean | null | undefined;

export type SpreadsheetSheet = {
  name: string;
  rows: SpreadsheetCell[][];
};

function xml(value: SpreadsheetCell) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function sheetName(value: string) {
  return value.replace(/[\\/?*\[\]:]/g, " ").trim().slice(0, 31) || "Data";
}

function cell(value: SpreadsheetCell, header: boolean) {
  const numeric = typeof value === "number" && Number.isFinite(value);
  const boolean = typeof value === "boolean";
  const type = numeric ? "Number" : boolean ? "Boolean" : "String";
  const content = boolean ? (value ? "1" : "0") : value;
  return `<Cell${header ? ' ss:StyleID="Header"' : ""}><Data ss:Type="${type}">${xml(content)}</Data></Cell>`;
}

/**
 * SpreadsheetML sengaja dipakai agar satu unduhan bisa berisi banyak tab tanpa library besar.
 * File .xls ini bisa langsung dibuka Excel, LibreOffice, atau diimpor ke Google Sheets.
 */
export function buildSpreadsheetXml(sheets: SpreadsheetSheet[]) {
  const worksheets = sheets.map((sheet) => {
    const rows = sheet.rows.map((row, index) => `<Row>${row.map((value) => cell(value, index === 0)).join("")}</Row>`).join("");
    return `<Worksheet ss:Name="${xml(sheetName(sheet.name))}"><Table>${rows}</Table></Worksheet>`;
  }).join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="Header"><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#E8F1ED" ss:Pattern="Solid"/></Style>
 </Styles>
 ${worksheets}
</Workbook>`;
}

