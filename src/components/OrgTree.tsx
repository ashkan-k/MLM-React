import { ChevronDown, ChevronUp, Download, Eye, Network, TrendingUp, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { exportSelected } from './table'
import { Empty, Modal } from './ui'

export type OrgNode = {
  id: number
  user?: { id?: number; name: string; mobile?: string } | null
  role?: { name: string; slug?: string } | null
  children?: OrgNode[]
  descendant_count?: number
}

type FlatRow = {
  id: number
  userId?: number
  name: string
  mobile: string
  role: string
  level: number
  parent: string
  path: string
  direct: number
  total: number
}

function countNodes(nodes: OrgNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children ?? []), 0)
}

function depthOf(nodes: OrgNode[], level = 1): number {
  if (!nodes.length) return Math.max(0, level - 1)
  return Math.max(...nodes.map((n) => depthOf(n.children ?? [], level + 1)))
}

function maxDirect(nodes: OrgNode[]): number {
  if (!nodes.length) return 0
  return Math.max(...nodes.map((n) => Math.max(n.children?.length ?? 0, maxDirect(n.children ?? []))))
}

function downline(node: OrgNode): number {
  if (typeof node.descendant_count === 'number') return node.descendant_count
  return countNodes(node.children ?? [])
}

function normalize(value: string) {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .toLowerCase()
    .trim()
}

function filterTree(nodes: OrgNode[], q: string): OrgNode[] {
  if (!q) return nodes
  const needle = normalize(q)
  return nodes.flatMap((n) => {
    const kids = filterTree(n.children ?? [], q)
    const hay = normalize(`${n.user?.name ?? ''} ${n.user?.mobile ?? ''} ${n.role?.name ?? ''} ${n.id}`)
    if (hay.includes(needle)) return [{ ...n, children: n.children }]
    if (kids.length) return [{ ...n, children: kids }]
    return []
  })
}

function flatten(nodes: OrgNode[], level = 0, parent = '', path: string[] = []): FlatRow[] {
  return nodes.flatMap((n) => {
    const name = n.user?.name ?? '—'
    const nextPath = [...path, name]
    const row: FlatRow = {
      id: n.id,
      userId: n.user?.id,
      name,
      mobile: n.user?.mobile ?? '',
      role: n.role?.name ?? '',
      level,
      parent: parent || '—',
      path: nextPath.join(' / '),
      direct: n.children?.length ?? 0,
      total: downline(n),
    }
    return [row, ...flatten(n.children ?? [], level + 1, name, nextPath)]
  })
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[ch] ?? ch))
}

function mermaidOf(rows: FlatRow[], nodes: OrgNode[]): string {
  const lines = ['flowchart TB', '  classDef branch fill:#2563eb,color:#fff,stroke:#1d4ed8']
  const walk = (list: OrgNode[]) => {
    for (const n of list) {
      const row = rows.find((r) => r.id === n.id)
      const label = [
        n.user?.name ?? n.id,
        n.role?.name ? `نقش: ${n.role.name}` : '',
        n.user?.mobile ? `موبایل: ${n.user.mobile}` : '',
        row ? `سطح ${row.level} | مستقیم ${row.direct} | کل ${row.total}` : '',
        row?.parent && row.parent !== '—' ? `مافوق: ${row.parent}` : 'ریشه',
      ].filter(Boolean).join('\\n')
      lines.push(`  n${n.id}["${escapeXml(label)}"]`)
      lines.push(`  class n${n.id} branch`)
      for (const child of n.children ?? []) {
        lines.push(`  n${n.id} --> n${child.id}`)
      }
      walk(n.children ?? [])
    }
  }
  walk(nodes)
  return `${lines.join('\n')}\n`
}

function svgOf(rows: FlatRow[]): string {
  const height = Math.max(180, rows.length * 92 + 80)
  const width = 1100
  const boxes = rows.map((row, index) => {
    const x = 32 + row.level * 42
    const y = 56 + index * 92
    return `
      <g>
        <rect x="${x}" y="${y}" rx="14" width="520" height="78" fill="#ffffff" stroke="#2563eb" stroke-width="1.5"/>
        <rect x="${x}" y="${y}" width="8" height="78" rx="4" fill="#2563eb"/>
        <text x="${x + 22}" y="${y + 24}" fill="#0f172a" font-size="15" font-weight="700" font-family="Vazirmatn, Inter, sans-serif">${escapeXml(row.name)}</text>
        <text x="${x + 22}" y="${y + 44}" fill="#334155" font-size="12" font-family="Vazirmatn, Inter, sans-serif">${escapeXml(row.role || '—')} · ${escapeXml(row.mobile || '—')}</text>
        <text x="${x + 22}" y="${y + 64}" fill="#64748b" font-size="11" font-family="Vazirmatn, Inter, sans-serif">سطح ${row.level} · مافوق ${escapeXml(row.parent)} · مستقیم ${row.direct} · کل زیرمجموعه ${row.total}</text>
      </g>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#e8eef5"/>
  <text x="32" y="32" fill="#1e293b" font-size="18" font-weight="700" font-family="Vazirmatn, Inter, sans-serif">نمودار شبکه فروش فاینوپال</text>
  ${boxes.join('')}
</svg>`
}

function htmlTree(rows: FlatRow[]) {
  const items = rows.map((row) => `
    <article style="margin:0 0 12px ${row.level * 28}px;padding:14px 16px;border:1px solid #d7e0ea;border-radius:14px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.05)">
      <h3 style="margin:0 0 6px;font-size:16px">${escapeXml(row.name)}</h3>
      <p style="margin:0;color:#475569;font-size:13px">نقش: ${escapeXml(row.role || '—')} · موبایل: ${escapeXml(row.mobile || '—')}</p>
      <p style="margin:6px 0 0;color:#64748b;font-size:12px">سطح ${row.level} · مافوق: ${escapeXml(row.parent)} · زیرمجموعه مستقیم: ${row.direct} · کل زیرمجموعه: ${row.total}</p>
      <p style="margin:6px 0 0;color:#94a3b8;font-size:12px">مسیر: ${escapeXml(row.path)}</p>
    </article>`).join('')
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>خروجی درختی شبکه</title>
  <style>body{font-family:Vazirmatn,Tahoma,sans-serif;background:#e8eef5;margin:0;padding:24px;color:#0f172a}</style></head>
  <body><h1>خروجی درختی شبکه و زیرمجموعه‌ها</h1>${items}</body></html>`
}

function downloadText(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function NodeRow({
  node,
  depth,
  forceOpen,
  onView,
  locale,
  t,
}: {
  node: OrgNode
  depth: number
  forceOpen: boolean
  onView: (n: OrgNode) => void
  locale: 'fa' | 'en'
  t: (key: string) => string
}) {
  const [open, setOpen] = useState(depth < 2)
  const shown = forceOpen || open
  const hasChildren = (node.children?.length ?? 0) > 0
  const name = node.user?.name ?? '—'
  const nf = locale === 'en' ? 'en-US' : 'fa-IR'

  return (
    <div className={depth > 0 ? 'ms-6 lg:ms-10 border-s-2 border-surface-200 dark:border-surface-700 ps-4' : ''}>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 mb-2 hover:shadow-md transition-shadow">
        {hasChildren ? (
          <button type="button" className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700" onClick={() => setOpen((v) => !v)}>
            {shown ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
          </button>
        ) : <div className="w-6" />}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold">
          {name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-surface-800 dark:text-surface-200">{name}</div>
          <div className="text-xs text-surface-400">{t('orgLevel')} {depth} • {downline(node).toLocaleString(nf)} {t('orgDownline')}{node.user?.mobile ? ` • ${node.user.mobile}` : ''}</div>
        </div>
        <div className="flex items-center gap-2">
          {node.role?.name && (
            <span className="text-xs px-2 py-1 rounded-full bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300">{node.role.name}</span>
          )}
          <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            {depth === 0 ? t('orgRoot') : `${t('orgLevel')} ${depth}`}
          </span>
          <button type="button" aria-label={t('details')} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400" onClick={() => onView(node)}>
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
      {hasChildren && shown && node.children!.map((child) => (
        <NodeRow key={child.id} node={child} depth={depth + 1} forceOpen={forceOpen} onView={onView} locale={locale} t={t} />
      ))}
    </div>
  )
}

export function OrgTree({
  nodes,
  title,
  subtitle,
  testId,
}: {
  nodes: OrgNode[]
  title?: string
  subtitle?: string
  testId?: string
  onExport?: () => void
}) {
  const { t, locale } = useApp()
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<OrgNode | null>(null)
  const visible = useMemo(() => filterTree(nodes, query), [nodes, query])
  const total = useMemo(() => countNodes(nodes), [nodes])
  const depth = useMemo(() => depthOf(nodes), [nodes])
  const widest = useMemo(() => maxDirect(nodes), [nodes])
  const rows = useMemo(() => flatten(visible), [visible])
  const nf = locale === 'en' ? 'en-US' : 'fa-IR'
  const heading = title ?? t('orgTitle')
  const sub = subtitle ?? t('orgSubtitle')

  const exportExcel = () => {
    exportSelected(locale === 'en' ? 'network' : 'شبکه', rows.map((r) => (
      locale === 'en'
        ? { ID: r.id, Name: r.name, Mobile: r.mobile, Role: r.role, Level: r.level, Upline: r.parent, Path: r.path, Direct: r.direct, Downline: r.total }
        : { شناسه: r.id, نام: r.name, موبایل: r.mobile, نقش: r.role, سطح: r.level, مافوق: r.parent, مسیر: r.path, 'زیرمجموعه مستقیم': r.direct, 'کل زیرمجموعه': r.total }
    )))
  }

  const exportTree = () => {
    const text = rows.map((r) => `${'  '.repeat(r.level)}- ${r.name} | ${r.role || '—'} | ${r.mobile || '—'} | ${t('orgLevel')} ${r.level} | ${t('orgParent')}: ${r.parent} | ${t('orgDirect')} ${r.direct} | ${t('orgTotal')} ${r.total} | ${t('orgPath')}: ${r.path}`).join('\n')
    downloadText(locale === 'en' ? 'network-tree.txt' : 'network-tree.txt', text, 'text/plain;charset=utf-8')
    downloadText(locale === 'en' ? 'network-tree.html' : 'network-tree.html', htmlTree(rows), 'text/html;charset=utf-8')
  }

  const exportDiagram = () => {
    downloadText(locale === 'en' ? 'network.mmd' : 'network.mmd', mermaidOf(rows, visible), 'text/plain;charset=utf-8')
    downloadText(locale === 'en' ? 'network.svg' : 'network.svg', svgOf(rows), 'image/svg+xml;charset=utf-8')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-surface-800 dark:text-surface-100 m-0">{heading}</h3>
          <p className="text-sm text-surface-500 mt-1 mb-0">{sub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" data-testid="org-export-excel" onClick={exportExcel} className="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-600 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700">
            <Download className="w-4 h-4 inline ms-1" />
            {t('exportExcel')}
          </button>
          <button type="button" data-testid="org-export-tree" onClick={exportTree} className="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-600 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700">
            <Download className="w-4 h-4 inline ms-1" />
            {t('exportTree')}
          </button>
          <button type="button" data-testid="org-export-diagram" onClick={exportDiagram} className="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-600 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700">
            <Download className="w-4 h-4 inline ms-1" />
            {t('exportDiagram')}
          </button>
        </div>
      </div>
      <input
        data-testid="org-search"
        className="w-full sm:w-96 ps-3 pe-3 py-2 rounded-lg bg-white dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-sm outline-none focus:ring-2 focus:ring-primary-500/20 text-surface-800 dark:text-surface-200"
        placeholder={t('orgSearch')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t('orgDepth'), value: depth.toLocaleString(nf), icon: Network },
          { label: t('orgBranches'), value: total.toLocaleString(nf), icon: TrendingUp },
          { label: t('orgMax'), value: widest.toLocaleString(nf), icon: Users },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700 flex items-center gap-3">
            <stat.icon className="w-5 h-5 text-primary-500" />
            <div>
              <div className="text-lg font-bold text-surface-800 dark:text-surface-100">{stat.value}</div>
              <div className="text-xs text-surface-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white/70 dark:bg-surface-900/50 rounded-xl p-4 border border-surface-200 dark:border-surface-700" data-testid={testId}>
        {visible.length > 0 ? visible.map((n) => <NodeRow key={n.id} node={n} depth={0} forceOpen={Boolean(query.trim())} onView={setDetail} locale={locale} t={t} />) : <Empty text={t('orgEmpty')} />}
      </div>
      <Modal open={Boolean(detail)} title={detail?.user?.name ?? t('details')} onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-2 text-sm">
            <div>{t('orgMobile')}: {detail.user?.mobile ?? '—'}</div>
            <div>{t('orgRole')}: {detail.role?.name ?? '—'}</div>
            <div>{t('orgDirect')}: {(detail.children?.length ?? 0).toLocaleString(nf)}</div>
            <div>{t('orgTotal')}: {downline(detail).toLocaleString(nf)}</div>
          </div>
        )}
      </Modal>
    </div>
  )
}
