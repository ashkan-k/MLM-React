export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf'
export type TableRows = Array<Record<string, string | number>>
export type ExportSheet = { title: string; rows: TableRows }

function safeFile(name: string) {
  const ascii = name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '')
  return ascii.slice(0, 60) || 'finopal-export'
}

function csvFrom(rows: TableRows) {
  if (rows.length === 0) return '\uFEFF'
  const keys = Object.keys(rows[0])
  return `\uFEFF${[keys.join(','), ...rows.map((row) => keys.map((k) => `"${String(row[k] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')}`
}

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function utf8(text: string) {
  return new TextEncoder().encode(text)
}

function u16(n: number) {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, n, true)
  return b
}

function u32(n: number) {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, true)
  return b
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0))
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

function zipStore(files: Array<{ name: string; data: Uint8Array }>) {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = utf8(file.name)
    const crc = crc32(file.data)
    const local = concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0),
      name, file.data,
    ])
    locals.push(local)
    centrals.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset), name,
    ]))
    offset += local.length
  }
  const central = concat(centrals)
  const localAll = concat(locals)
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(localAll.length), u16(0),
  ])
  return concat([localAll, central, end])
}

function colName(index: number) {
  let n = index
  let name = ''
  while (n >= 0) {
    name = String.fromCharCode((n % 26) + 65) + name
    n = Math.floor(n / 26) - 1
  }
  return name
}

function sheetXml(rows: TableRows) {
  const keys = rows[0] ? Object.keys(rows[0]) : ['A']
  const all = [keys, ...rows.map((row) => keys.map((k) => String(row[k] ?? '')))]
  const cells = all.flatMap((line, r) => line.map((value, c) => {
    const ref = `${colName(c)}${r + 1}`
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
  }))
  const rowXml = all.map((_, r) => {
    const start = r * keys.length
    return `<row r="${r + 1}">${cells.slice(start, start + keys.length).join('')}</row>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowXml}</sheetData></worksheet>`
}

function xlsxBytes(sheets: ExportSheet[]) {
  const usable = sheets.length ? sheets : [{ title: 'Sheet1', rows: [{ پیام: '' }] }]
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${usable.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${usable.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
</Relationships>`
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${usable.map((s, i) => `<sheet name="${escapeXml((s.title || `Sheet${i + 1}`).slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
</workbook>`
  const files = [
    { name: '[Content_Types].xml', data: utf8(contentTypes) },
    { name: '_rels/.rels', data: utf8(rels) },
    { name: 'xl/workbook.xml', data: utf8(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8(wbRels) },
    ...usable.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: utf8(sheetXml(sheet.rows)) })),
  ]
  return zipStore(files)
}

function downloadBlob(name: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadZip(filename: string, files: Array<{ name: string; content: string }>) {
  const packed = zipStore(files.map((file) => ({ name: file.name, data: utf8(file.content) })))
  const base = filename.endsWith('.zip') ? filename : `${safeFile(filename)}.zip`
  downloadBlob(base, packed as BlobPart, 'application/zip')
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
    downloadBlob(`${safeFile(title)}.html`, html, 'text/html;charset=utf-8')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  win.onafterprint = () => win.close()
  win.print()
}

export function exportSheets(filename: string, sheets: ExportSheet[], format: ExportFormat) {
  const usable = sheets.filter((s) => s.rows.length > 0)
  const fallback = usable.length ? usable : [{ title: 'empty', rows: [{ message: 'no data' }] }]
  const base = safeFile(filename)
  if (format === 'csv') {
    if (fallback.length === 1) {
      downloadBlob(`${base}.csv`, csvFrom(fallback[0].rows), 'text/csv;charset=utf-8')
      return
    }
    downloadZip(base, fallback.map((sheet) => ({
      name: `${safeFile(sheet.title)}.csv`,
      content: csvFrom(sheet.rows),
    })))
    return
  }
  if (format === 'xlsx') {
    downloadBlob(`${base}.xlsx`, xlsxBytes(fallback) as BlobPart, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    return
  }
  if (format === 'json') {
    downloadBlob(`${base}.json`, JSON.stringify(Object.fromEntries(fallback.map((s) => [s.title, s.rows])), null, 2), 'application/json')
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
