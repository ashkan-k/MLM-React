import { Check, ChevronLeft, ChevronRight, Edit, Eye, Ban, Trash2, UserCheck, type LucideIcon } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { exportSheets, type ExportFormat, type ExportSheet } from '../lib/export'
import { localeTag } from '../lib/format'

const actionClass: Record<string, string> = {
  view: 'hover:text-blue-500',
  edit: 'hover:text-amber-500',
  delete: 'hover:text-red-500',
  ok: 'hover:text-emerald-500',
  warn: 'hover:text-amber-500',
}

export function IconAction({
  label,
  tone = 'view',
  icon: Icon,
  onClick,
  to,
}: {
  label: string
  tone?: keyof typeof actionClass
  icon: LucideIcon
  onClick?: () => void
  to?: string
}) {
  const className = `p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 ${actionClass[tone]}`
  if (to) {
    return <Link to={to} aria-label={label} className={className}><Icon className="w-4 h-4" /></Link>
  }
  return (
    <button type="button" aria-label={label} className={className} onClick={onClick}>
      <Icon className="w-4 h-4" />
    </button>
  )
}

export function ViewAction(props: { to?: string; onClick?: () => void; label?: string }) {
  return <IconAction label={props.label ?? 'جزئیات'} tone="view" icon={Eye} to={props.to} onClick={props.onClick} />
}

export function EditAction(props: { onClick: () => void; label?: string }) {
  return <IconAction label={props.label ?? 'ویرایش'} tone="edit" icon={Edit} onClick={props.onClick} />
}

export function DeleteAction(props: { onClick: () => void; label?: string }) {
  return <IconAction label={props.label ?? 'حذف'} tone="delete" icon={Trash2} onClick={props.onClick} />
}

export function BlockAction(props: { onClick: () => void; label?: string }) {
  return <IconAction label={props.label ?? 'مسدود کردن'} tone="delete" icon={Ban} onClick={props.onClick} />
}

export function UnblockAction(props: { onClick: () => void; label?: string }) {
  return <IconAction label={props.label ?? 'رفع مسدودی'} tone="ok" icon={UserCheck} onClick={props.onClick} />
}

export function ApproveAction(props: { onClick: () => void; label?: string }) {
  return <IconAction label={props.label ?? 'تایید'} tone="ok" icon={Check} onClick={props.onClick} />
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-center gap-1">{children}</div>
}

export function CheckBox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      className="rounded border-surface-300 accent-primary-600"
    />
  )
}

export function useSelection(ids: number[]) {
  const [selected, setSelected] = useState<number[]>([])
  const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id))
  const someSelected = selected.length > 0
  const toggle = (id: number) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const toggleAll = () => setSelected(allSelected ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])])
  const clear = () => setSelected([])
  const selectedOnPage = useMemo(() => selected.filter((id) => ids.includes(id)), [selected, ids])
  return { selected, selectedOnPage, allSelected, someSelected, toggle, toggleAll, clear, count: selected.length }
}

export function BulkBar({ count, children }: { count: number; children: ReactNode }) {
  const { t, locale } = useApp()
  if (count === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-surface-200 dark:border-surface-700" data-testid="bulk-bar">
      <span className="text-xs text-surface-500">{t('selectedCount', { count: count.toLocaleString(locale === 'en' ? 'en-US' : 'fa-IR') })}</span>
      {children}
    </div>
  )
}

export function BulkButton({
  tone = 'info',
  onClick,
  children,
}: {
  tone?: 'danger' | 'warn' | 'ok' | 'info'
  onClick: () => void
  children: ReactNode
}) {
  const tones = {
    danger: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40',
    warn: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40',
    ok: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40',
  }
  return (
    <button type="button" className={`text-xs px-2 py-1 rounded cursor-pointer ${tones[tone]}`} onClick={onClick}>
      {children}
    </button>
  )
}

export function IconTool({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="p-2 rounded-lg border border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-500">
      <Icon className="w-4 h-4" />
    </button>
  )
}

function pageWindow(current: number, last: number, size = 5): number[] {
  if (last <= 0) return []
  if (last <= size) return Array.from({ length: last }, (_, i) => i + 1)
  const half = Math.floor(size / 2)
  let start = Math.max(1, current - half)
  let end = start + size - 1
  if (end > last) {
    end = last
    start = Math.max(1, end - size + 1)
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export function TablePager({
  page,
  last,
  from,
  to,
  total,
  onPage,
  disabled = false,
}: {
  page: number
  last: number
  from?: number | null
  to?: number | null
  total: number
  onPage: (page: number) => void
  disabled?: boolean
}) {
  const { t, locale } = useApp()
  if (total <= 0) return null
  const pages = pageWindow(page, Math.max(1, last))
  const n = (v: number) => v.toLocaleString(localeTag())
  const summary = locale === 'en'
    ? `Showing ${n(from ?? 1)} to ${n(to ?? total)} of ${n(total)}`
    : `نمایش ${n(from ?? 1)} تا ${n(to ?? total)} از ${n(total)} مورد`

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-surface-200 dark:border-surface-700">
      <span className="text-xs text-surface-500">{summary}</span>
      {last > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled || page <= 1}
            onClick={() => onPage(page - 1)}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 disabled:opacity-40"
            aria-label={t('prev')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              disabled={disabled}
              onClick={() => onPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium ${p === page ? 'bg-primary-600 text-white' : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700'}`}
            >
              {n(p)}
            </button>
          ))}
          <button
            type="button"
            disabled={disabled || page >= last}
            onClick={() => onPage(page + 1)}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 disabled:opacity-40"
            aria-label={t('next')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export function exportSelected(filename: string, rows: ExportSheet['rows'], format: ExportFormat = 'xlsx') {
  exportSheets(filename, [{ title: filename, rows }], format)
}
