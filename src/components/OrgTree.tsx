import { ChevronDown, ChevronUp, Download, Eye, Network, TrendingUp, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { exportSelected } from './table'
import { downloadZip } from '../lib/export'
import { Empty, Modal } from './ui'

export type OrgNode = {
  id: number
  user?: { id?: number; name: string; mobile?: string; is_active?: boolean } | null
  role?: { name: string; slug?: string } | null
  children?: OrgNode[]
  descendant_count?: number
  has_children?: boolean
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
  const defs: string[] = []
  const edges: string[] = []
  const walk = (list: OrgNode[]) => {
    for (const n of list) {
      const row = rows.find((r) => r.id === n.id)
      const label = [
        n.user?.name ?? String(n.id),
        n.role?.name ?? '',
        n.user?.mobile ?? '',
        row ? `سطح ${row.level} مستقیم ${row.direct} کل ${row.total}` : '',
      ].filter(Boolean).join('<br/>')
      defs.push(`  N${n.id}["${label}"]`)
      for (const child of n.children ?? []) {
        edges.push(`  N${n.id} --> N${child.id}`)
      }
      walk(n.children ?? [])
    }
  }
  walk(nodes)
  return ['flowchart TB', ...defs, ...edges, ''].join('\n')
}

function htmlOrgChart(nodes: OrgNode[], rows: FlatRow[]): string {
  const card = (n: OrgNode) => {
    const row = rows.find((r) => r.id === n.id)
    return `<div class="node">
      <strong>${escapeXml(n.user?.name ?? '—')}</strong>
      <span>${escapeXml(n.role?.name || '—')}</span>
      <span dir="ltr">${escapeXml(n.user?.mobile || '—')}</span>
      <small>سطح ${row?.level ?? 0} · زیرمجموعه مستقیم ${row?.direct ?? 0} · کل ${row?.total ?? 0}</small>
      ${row?.parent && row.parent !== '—' ? `<small>مافوق: ${escapeXml(row.parent)}</small>` : '<small>ریشه شبکه</small>'}
    </div>`
  }
  const walk = (list: OrgNode[]): string => {
    if (!list.length) return ''
    return `<ul>${list.map((n) => `<li>${card(n)}${walk(n.children ?? [])}</li>`).join('')}</ul>`
  }
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>دیاگرام شبکه فاینوپال</title>
  <style>
    body{margin:0;background:#f2f5f1;font-family:Vazirmatn,Tahoma,sans-serif;color:#15211b}
    h1{text-align:center;padding:24px 16px 8px;font-size:22px}
    .tree{overflow:auto;padding:16px 24px 48px}
    .tree ul{display:flex;justify-content:center;padding-top:20px;position:relative}
    .tree li{list-style:none;display:flex;flex-direction:column;align-items:center;position:relative;padding:20px 10px 0}
    .tree li::before,.tree li::after{content:"";position:absolute;top:0;width:50%;height:20px;border-top:2px solid #93c5fd}
    .tree li::before{inset-inline-end:50%;border-inline-end:2px solid #93c5fd}
    .tree li::after{inset-inline-start:50%}
    .tree li:only-child::before,.tree li:only-child::after{display:none}
    .tree li:only-child{padding-top:0}
    .tree li:first-child::before,.tree li:last-child::after{border:0 none}
    .tree li:last-child::before{border-inline-end:2px solid #93c5fd;border-radius:0 0 8px 0}
    .tree li:first-child::after{border-inline-start:2px solid #93c5fd;border-radius:0 0 0 8px}
    .tree ul ul::before{content:"";position:absolute;top:0;inset-inline-start:50%;border-inline-start:2px solid #93c5fd;width:0;height:20px}
    .node{min-width:180px;max-width:240px;background:#0e8467;color:#fff;border-radius:14px;padding:12px 14px;text-align:center;box-shadow:0 10px 24px rgba(14,132,103,.25)}
    .node strong{display:block;font-size:15px;margin-bottom:4px}
    .node span,.node small{display:block;opacity:.92;font-size:12px;line-height:1.6}
  </style></head>
  <body><h1>دیاگرام شبکه و زیرمجموعه‌ها</h1><div class="tree">${walk(nodes)}</div></body></html>`
}

function svgOf(rows: FlatRow[]): string {
  const height = Math.max(180, rows.length * 92 + 80)
  const width = 1100
  const boxes = rows.map((row, index) => {
    const x = 32 + row.level * 42
    const y = 56 + index * 92
    return `
      <g>
        <rect x="${x}" y="${y}" rx="14" width="520" height="78" fill="#ffffff" stroke="#0e8467" stroke-width="1.5"/>
        <rect x="${x}" y="${y}" width="8" height="78" rx="4" fill="#0e8467"/>
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
  <style>body{font-family:Vazirmatn,Tahoma,sans-serif;background:#f2f5f1;margin:0;padding:24px;color:#15211b}</style></head>
  <body><h1>خروجی درختی شبکه و زیرمجموعه‌ها</h1>${items}</body></html>`
}

function NodeRow({
  node,
  depth,
  forceOpen,
  onView,
  locale,
  t,
  lazy,
  onLoadChildren,
}: {
  node: OrgNode
  depth: number
  forceOpen: boolean
  onView: (n: OrgNode) => void
  locale: 'fa' | 'en'
  t: (key: string) => string
  lazy?: boolean
  onLoadChildren?: (nodeId: number) => Promise<OrgNode[]>
}) {
  const [open, setOpen] = useState(depth < 1)
  const [lazyKids, setLazyKids] = useState<OrgNode[]>(() => node.children ?? [])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(() => !lazy || (node.children?.length ?? 0) > 0 || node.has_children === false)
  // Search mode (!lazy): always render embedded children from props — avoid stale lazy state after remount reuse
  const kids = lazy ? lazyKids : (node.children ?? [])
  const shown = forceOpen || open
  const hasChildren = Boolean(node.has_children) || kids.length > 0 || (node.children?.length ?? 0) > 0
  const name = node.user?.name ?? '—'
  const nf = locale === 'en' ? 'en-US' : 'fa-IR'

  useEffect(() => {
    if (!lazy) return
    setLazyKids(node.children ?? [])
    setLoaded((node.children?.length ?? 0) > 0 || node.has_children === false)
  }, [lazy, node.id, node.has_children])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next && lazy && !loaded && onLoadChildren && (node.has_children || hasChildren)) {
      setLoading(true)
      try {
        const fetched = await onLoadChildren(node.id)
        setLazyKids(fetched)
        setLoaded(true)
      } finally {
        setLoading(false)
      }
    }
  }

  const team = downline({ ...node, children: kids })
  const avColors = ['#12a07c', '#e9b44c', '#5ea5d6', '#c9705f', '#7fb5ae', '#8d7ac9']
  const av = avColors[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % avColors.length]

  return (
    <div className="min-w-max">
      <div className="flex items-stretch gap-0">
        <div className="flex flex-col items-center">
          <div
            role="button"
            tabIndex={0}
            onClick={() => { if (hasChildren) void toggle(); else onView(node) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (hasChildren) void toggle(); else onView(node) } }}
            className={`card card-hover p-3 w-[196px] text-start ${hasChildren ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex items-center gap-2">
              <span
                className="relative inline-flex items-center justify-center rounded-full font-bold text-white shrink-0"
                style={{ width: 30, height: 30, background: av, fontSize: 11 }}
              >
                {name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="org-node-name text-sm font-bold truncate m-0 text-ink" style={{ fontSize: '0.8rem' }}>{name}</p>
                <p className="text-[0.64rem] text-faint font-code m-0">{node.user?.mobile || `N-${node.id}`}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 gap-1">
              <span className="badge tone-prim truncate max-w-[110px]">{node.role?.name || (depth === 0 ? t('orgRoot') : `${t('orgLevel')} ${depth}`)}</span>
              <span className="text-[0.64rem] text-mute num shrink-0">{t('orgDownline')} {team.toLocaleString(nf)}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[0.68rem]">
              {node.user?.is_active === false
                ? <span className="badge tone-bad">{t('blocked')}</span>
                : <span className="badge tone-ok">{t('adminActive') || 'فعال'}</span>}
              <button
                type="button"
                aria-label={t('details')}
                className="icon-btn icon-btn-sm"
                onClick={(e) => { e.stopPropagation(); onView(node) }}
              >
                <Eye size={14} />
              </button>
            </div>
            {hasChildren && (
              <span className="flex items-center justify-center gap-1 mt-2 pt-2 border-t border-line text-[0.66rem] font-bold text-prim">
                {shown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {(kids.length || team).toLocaleString(nf)} {t('orgDownline')}
                {loading ? ' …' : ''}
              </span>
            )}
          </div>
        </div>
        {hasChildren && shown && (
          <div className="flex flex-col justify-center ms-0">
            <div className="flex items-center">
              <span className="w-6 h-px bg-line2 shrink-0" />
              <div className="tree-line ps-6 py-2 flex flex-col gap-3">
                {kids.map((child) => (
                  <NodeRow key={child.id} node={child} depth={depth + 1} forceOpen={forceOpen} onView={onView} locale={locale} t={t} lazy={lazy} onLoadChildren={onLoadChildren} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function OrgTree({
  nodes,
  title,
  subtitle,
  testId,
  hideTitle = false,
  lazy = true,
  onLoadChildren,
}: {
  nodes: OrgNode[]
  title?: string
  subtitle?: string
  testId?: string
  hideTitle?: boolean
  onExport?: () => void
  lazy?: boolean
  onLoadChildren?: (nodeId: number) => Promise<OrgNode[]>
}) {
  const { t, locale } = useApp()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [searchNodes, setSearchNodes] = useState<OrgNode[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [detail, setDetail] = useState<OrgNode | null>(null)
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(query.trim()), 350)
    return () => window.clearTimeout(handle)
  }, [query])

  useEffect(() => {
    if (!debounced) {
      setSearchNodes(null)
      setSearchLoading(false)
      return
    }
    let cancelled = false
    setSearchLoading(true)
    setSearchNodes(null)
    api.get('/organization/tree', { params: { search: debounced, max_depth: 16 } })
      .then(({ data }) => {
        if (cancelled) return
        const remote = Array.isArray(data) ? data as OrgNode[] : []
        // Server prune is authoritative; local filter only as last resort on already-loaded nodes
        setSearchNodes(remote.length > 0 ? remote : filterTree(nodesRef.current, debounced))
      })
      .catch(() => {
        if (!cancelled) setSearchNodes(filterTree(nodesRef.current, debounced))
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false)
      })
    return () => { cancelled = true }
  }, [debounced])

  const searching = Boolean(debounced)
  const displayNodes = searching ? (searchNodes ?? []) : nodes
  const visible = displayNodes
  const total = useMemo(
    () => displayNodes.reduce((s, n) => s + 1 + (n.descendant_count ?? countNodes(n.children ?? [])), 0),
    [displayNodes],
  )
  const depth = useMemo(() => depthOf(displayNodes), [displayNodes])
  const widest = useMemo(() => maxDirect(displayNodes), [displayNodes])
  const rows = useMemo(() => flatten(visible), [visible])
  const nf = locale === 'en' ? 'en-US' : 'fa-IR'
  const heading = title ?? t('orgTitle')
  const sub = subtitle ?? t('orgSubtitle')

  const loadChildren = onLoadChildren

  const exportExcel = () => {
    exportSelected(locale === 'en' ? 'network' : 'شبکه', rows.map((r) => (
      locale === 'en'
        ? { ID: r.id, Name: r.name, Mobile: r.mobile, Role: r.role, Level: r.level, Upline: r.parent, Path: r.path, Direct: r.direct, Downline: r.total }
        : { شناسه: r.id, نام: r.name, موبایل: r.mobile, نقش: r.role, سطح: r.level, مافوق: r.parent, مسیر: r.path, 'زیرمجموعه مستقیم': r.direct, 'کل زیرمجموعه': r.total }
    )))
  }

  const exportTree = () => {
    const text = rows.map((r) => `${'  '.repeat(r.level)}- ${r.name} | ${r.role || '—'} | ${r.mobile || '—'} | ${t('orgLevel')} ${r.level} | ${t('orgParent')}: ${r.parent} | ${t('orgDirect')} ${r.direct} | ${t('orgTotal')} ${r.total} | ${t('orgPath')}: ${r.path}`).join('\n')
    downloadZip(locale === 'en' ? 'network-tree' : 'خروجی-درختی-شبکه', [
      { name: 'network-tree.txt', content: text },
      { name: 'network-tree.html', content: htmlTree(rows) },
    ])
  }

  const exportDiagram = () => {
    downloadZip(locale === 'en' ? 'network-diagram' : 'خروجی-دیاگرام-شبکه', [
      { name: 'network-diagram.html', content: htmlOrgChart(visible, rows) },
      { name: 'network.svg', content: svgOf(rows) },
    ])
  }

  return (
    <div className="space-y-4">
      <div className={`flex flex-col lg:flex-row items-start lg:items-center gap-4 ${hideTitle ? 'justify-end' : 'justify-between'}`}>
        {!hideTitle && (
          <div>
            <h3 className="text-[1.3rem] font-extrabold tracking-tight text-ink m-0">{heading}</h3>
            <p className="text-sm text-mute mt-1 mb-0 leading-6">{sub}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" data-testid="org-export-excel" onClick={exportExcel} className="btn btn-outline btn-sm">
            <Download className="w-4 h-4" />
            {t('exportExcel')}
          </button>
          <button type="button" data-testid="org-export-tree" onClick={exportTree} className="btn btn-outline btn-sm">
            <Download className="w-4 h-4" />
            {t('exportTree')}
          </button>
          <button type="button" data-testid="org-export-diagram" onClick={exportDiagram} className="btn btn-outline btn-sm">
            <Download className="w-4 h-4" />
            {t('exportDiagram')}
          </button>
        </div>
      </div>
      <input
        data-testid="org-search"
        className="input w-full sm:w-96"
        placeholder={t('orgSearch')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {searchLoading && (
        <div className="text-xs text-faint">{locale === 'en' ? 'Searching network…' : 'در حال جستجوی شبکه…'}</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger">
        {[
          { label: t('orgDepth'), value: depth.toLocaleString(nf), icon: Network, tone: 'prim' as const },
          { label: t('orgBranches'), value: total.toLocaleString(nf), icon: TrendingUp, tone: 'acc' as const },
          { label: t('orgMax'), value: widest.toLocaleString(nf), icon: Users, tone: 'info' as const },
        ].map((stat) => (
          <div key={stat.label} className="card card-hover p-4 flex items-center gap-3">
            <span className={`badge tone-${stat.tone} !p-2.5 !rounded-xl`}><stat.icon className="w-5 h-5" /></span>
            <div>
              <div className="text-lg font-extrabold text-ink num">{stat.value}</div>
              <div className="text-xs text-mute font-semibold">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="card p-4 overflow-x-auto scroll-slim" data-testid={testId}>
        {visible.length > 0 ? (
          <div className="flex flex-col gap-4 min-w-max">
            {visible.map((n) => (
              <NodeRow
                key={searching ? `search-${n.id}` : n.id}
                node={n}
                depth={0}
                forceOpen={searching}
                onView={setDetail}
                locale={locale}
                t={t}
                lazy={lazy && !searching}
                onLoadChildren={loadChildren}
              />
            ))}
          </div>
        ) : <Empty text={searchLoading || (searching && searchNodes === null) ? (locale === 'en' ? 'Searching…' : 'در حال جستجو…') : t('orgEmpty')} />}
      </div>
      <Modal open={Boolean(detail)} title={detail?.user?.name ?? t('details')} onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-2 text-sm">
            <div>{t('orgMobile')}: {detail.user?.mobile ?? '—'}</div>
            <div>{t('status')}: {detail.user?.is_active === false ? t('blocked') : t('adminActive')}</div>
            <div>{t('orgRole')}: {detail.role?.name ?? '—'}</div>
            <div>{t('orgDirect')}: {(detail.children?.length ?? 0).toLocaleString(nf)}</div>
            <div>{t('orgTotal')}: {downline(detail).toLocaleString(nf)}</div>
          </div>
        )}
      </Modal>
    </div>
  )
}
