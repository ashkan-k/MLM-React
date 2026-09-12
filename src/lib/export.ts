export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf'
export type TableRows = Array<Record<string, string | number>>
export type ExportSheet = { title: string; rows: TableRows }

function csvFrom(rows: TableRows) {
  if (rows.length === 0) return '\uFEFF'
  const keys = Object.keys(rows[0])
  return `\uFEFF${[keys.join(','), ...rows.map((row) => keys.map((k) => `"${String(row[k] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')}`
}

function xlsFrom(sheets: ExportSheet[]) {
  const worksheets = sheets.map((sheet) => {
    const rows = sheet.rows
    const keys = rows[0] ? Object.keys(rows[0]) : []
    const header = `<Row>${keys.map((k) => `<Cell><Data ss:Type="String">${escapeXml(k)}</Data></Cell>`).join('')}</Row>`
    const body = rows.map((row) => `<Row>${keys.map((k) => `<Cell><Data ss:Type="String">${escapeXml(String(row[k] ?? ''))}</Data></Cell>`).join('')}</Row>`).join('')
    return `<Worksheet ss:Name="${escapeXml(sheet.title.slice(0, 31))}"><Table>${header}${body}</Table></Worksheet>`
  }).join('')
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheets}
</Workbook>`
}

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function downloadBlob(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function printPdf(title: string, sheets: ExportSheet[]) {
  const tables = sheets.map((sheet) => {
    const keys = sheet.rows[0] ? Object.keys(sheet.rows[0]) : []
    return `<h2>${sheet.title}</h2><table><thead><tr>${keys.map((k) => `<th>${k}</th>`).join('')}</tr></thead><tbody>${
      sheet.rows.map((row) => `<tr>${keys.map((k) => `<td>${String(row[k] ?? '')}</td>`).join('')}</tr>`).join('')
    }</tbody></table>`
  }).join('')
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:Tahoma,sans-serif;padding:24px}h1{font-size:18px}h2{font-size:15px;margin-top:28px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #d0d5dd;padding:6px 8px;font-size:12px;text-align:right}th{background:#f2f4f7}</style>
  </head><body><h1>${title}</h1>${tables}</body></html>`
  const win = window.open('', '_blank')
  if (!win) {
    downloadBlob(`${title}.html`, html, 'text/html;charset=utf-8')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

export function exportSheets(filename: string, sheets: ExportSheet[], format: ExportFormat) {
  const usable = sheets.filter((s) => s.rows.length > 0)
  const fallback = usable.length ? usable : [{ title: 'خالی', rows: [{ پیام: 'داده‌ای برای خروجی نیست' }] }]
  if (format === 'csv') {
    fallback.forEach((sheet) => downloadBlob(`${filename}-${sheet.title}.csv`, csvFrom(sheet.rows), 'text/csv;charset=utf-8'))
    return
  }
  if (format === 'xlsx') {
    downloadBlob(`${filename}.xls`, xlsFrom(fallback), 'application/vnd.ms-excel')
    return
  }
  if (format === 'json') {
    downloadBlob(`${filename}.json`, JSON.stringify(Object.fromEntries(fallback.map((s) => [s.title, s.rows])), null, 2), 'application/json')
    return
  }
  printPdf(filename, fallback)
}

export const exportFormats: Array<{ id: ExportFormat; label: string }> = [
  { id: 'xlsx', label: 'Excel' },
  { id: 'csv', label: 'CSV' },
  { id: 'json', label: 'JSON' },
  { id: 'pdf', label: 'PDF' },
]
