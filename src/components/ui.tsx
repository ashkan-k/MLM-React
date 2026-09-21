import { X, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart as ReBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../contexts/AppContext'
import { currentLocale, dateTime, jalaliMonth, localeTag } from '../lib/format'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-1">
      <div>
        <h2 className="text-xl font-bold m-0 text-surface-800 dark:text-surface-100">{title}</h2>
        {subtitle && <p className="text-sm text-surface-500 mt-1 mb-0">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  title,
  value,
  hint,
  testId,
  icon: Icon,
  color = 'from-primary-500 to-primary-600',
}: {
  title: string
  value: ReactNode
  hint?: string
  testId?: string
  icon?: LucideIcon
  color?: string
}) {
  return (
    <div className="card p-5 hover:shadow-lg transition-shadow">
      {Icon && (
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      )}
      <div className="text-2xl font-bold text-surface-800 dark:text-surface-100" data-testid={testId}>{value}</div>
      <div className="text-xs text-surface-500 mt-1">{title}</div>
      {hint && <div className="text-xs text-surface-400 mt-1">{hint}</div>}
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>
}

export function Badge({ tone = 'info', children }: { tone?: 'ok' | 'warn' | 'info' | 'muted' | 'danger'; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return <div className="progress"><span style={{ width: `${pct}%` }} /></div>
}

/** کسب‌شده از حد نصاب — اعداد با bdi جدا می‌شوند تا در RTL برعکس دیده نشوند */
export function ScorePair({
  actual,
  required,
  unit,
  compact,
}: {
  actual: number
  required: number
  unit?: string
  compact?: boolean
}) {
  const a = Number(actual).toLocaleString(localeTag())
  const r = Number(required).toLocaleString(localeTag())
  const en = currentLocale() === 'en'
  return (
    <span className={`inline-flex items-baseline gap-1 flex-wrap ${compact ? 'text-sm' : ''}`}>
      <bdi className="tabular-nums font-semibold text-surface-800 dark:text-surface-100" dir="ltr">{a}</bdi>
      <span className="text-surface-400 text-[11px] font-normal">{en ? 'of' : 'از'}</span>
      <bdi className="tabular-nums text-surface-500" dir="ltr">{r}</bdi>
      {unit ? <span className="text-surface-400 text-[11px]">{unit}</span> : null}
    </span>
  )
}

export function DateTimeText({ value }: { value?: string | null }) {
  return <time className="datetime-ltr" dir="ltr" dateTime={value ?? undefined}>{dateTime(value)}</time>
}

export function MonthText({ value }: { value?: string | null }) {
  const text = jalaliMonth(value)
  if (!value || text === '—') return <span>—</span>
  // نام ماه فارسی را در جریان RTL نگه می‌داریم؛ رقم‌ها داخل متن هستند
  return <span className="font-medium tracking-tight">{text}</span>
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="field-hint">{children}</p>
}

export function RequiredMark() {
  return <span className="req" aria-hidden>*</span>
}

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span>
      {children}
      {required ? <RequiredMark /> : null}
    </span>
  )
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className={`bg-white dark:bg-surface-800 rounded-2xl w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} shadow-xl animate-fadeIn max-h-[92svh] overflow-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-surface-200 dark:border-surface-700">
          <div>
            <h3 className="font-semibold text-surface-800 dark:text-surface-200 m-0">{title}</h3>
            {subtitle && <p className="text-sm text-surface-500 mt-1 mb-0">{subtitle}</p>}
          </div>
          <button type="button" className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400" onClick={onClose} aria-label="بستن">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

type ChartPoint = { label: string; value: number; count?: number }

function useChartTheme() {
  const { darkMode } = useApp()
  return {
    grid: darkMode ? '#334155' : '#e2e8f0',
    tick: darkMode ? '#94a3b8' : '#64748b',
    tooltip: { backgroundColor: darkMode ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  }
}

export function BarChart({ data, testId }: { data: ChartPoint[]; testId?: string }) {
  const theme = useChartTheme()
  const rows = data.map((d) => ({ name: d.label, value: Number(d.value) || 0 }))
  return (
    <div className="h-64" data-testid={testId ?? 'bar-chart'}>
      {data.length === 0 ? <Empty text="داده‌ای برای نمودار نیست." /> : (
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.tick }} />
            <YAxis tick={{ fontSize: 11, fill: theme.tick }} />
            <Tooltip contentStyle={theme.tooltip} />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </ReBarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export function LineChart({ data, testId }: { data: ChartPoint[]; testId?: string }) {
  const theme = useChartTheme()
  const rows = data.map((d) => ({ name: d.label.length > 8 ? d.label.slice(-5) : d.label, value: Number(d.value) || 0 }))
  return (
    <div className="h-64" data-testid={testId ?? 'line-chart'}>
      {data.length === 0 ? <Empty text="داده‌ای برای نمودار نیست." /> : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows}>
            <defs>
              <linearGradient id="finopalArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.tick }} />
            <YAxis tick={{ fontSize: 11, fill: theme.tick }} />
            <Tooltip contentStyle={theme.tooltip} />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#finopalArea)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
