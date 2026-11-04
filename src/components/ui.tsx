import { format as formatJalali } from 'date-fns-jalali'
import { ChevronDown, Search, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Area, AreaChart, Bar, BarChart as ReBarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../contexts/AppContext'
import { currentLocale, dateOnly, dateTime, jalaliDateOnly, jalaliMonth, localeTag, productLabel, productTone } from '../lib/format'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5 anim-up">
      <div className="min-w-0">
        <h1 className="text-[1.5rem] font-black tracking-tight leading-tight m-0 text-ink break-words">{title}</h1>
        {subtitle && <p className="text-sm text-mute mt-1 mb-0 leading-6 break-words">{subtitle}</p>}
      </div>
      {action ? <div className="flex items-center gap-2 flex-wrap shrink-0">{action}</div> : null}
    </div>
  )
}

export function PageHead(props: { title: string; desc?: string; actions?: ReactNode }) {
  return <PageHeader title={props.title} subtitle={props.desc} action={props.actions} />
}

type StatTone = 'prim' | 'ok' | 'warn' | 'bad' | 'info' | 'acc' | 'neutral'

function toneFromColor(color?: string): StatTone {
  if (!color) return 'prim'
  if (color.includes('bad')) return 'bad'
  if (color.includes('warn')) return 'warn'
  if (color.includes('info')) return 'info'
  if (color.includes('ok')) return 'ok'
  if (color.includes('acc')) return 'acc'
  return 'prim'
}

export function StatCard({
  title,
  value,
  hint,
  testId,
  icon: Icon,
  color,
  tone,
}: {
  title: string
  value: ReactNode
  hint?: string
  testId?: string
  icon?: LucideIcon
  /** @deprecated use tone — kept for call-site compatibility */
  color?: string
  tone?: StatTone
}) {
  const resolved = tone ?? toneFromColor(color)
  return (
    <div className="card card-hover p-5 relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-mute m-0">{title}</p>
          <p className="text-[1.55rem] font-extrabold mt-1.5 mb-0 leading-none num tracking-tight text-ink" data-testid={testId}>{value}</p>
          {hint && <p className="text-[0.72rem] text-faint mt-2 mb-0">{hint}</p>}
        </div>
        {Icon && (
          <span className={`badge tone-${resolved} !p-2.5 !rounded-xl shrink-0`}>
            <Icon size={20} />
          </span>
        )}
      </div>
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>
}

export function Badge({ tone = 'info', children, dot }: { tone?: 'ok' | 'warn' | 'info' | 'muted' | 'danger' | 'prim' | 'acc' | 'neutral' | 'bad'; children: ReactNode; dot?: boolean }) {
  const map: Record<string, string> = {
    ok: 'tone-ok',
    warn: 'tone-warn',
    info: 'tone-info',
    muted: 'tone-neutral',
    danger: 'tone-bad',
    bad: 'tone-bad',
    prim: 'tone-prim',
    acc: 'tone-acc',
    neutral: 'tone-neutral',
  }
  return (
    <span className={`badge ${map[tone] ?? 'tone-info'}`}>
      {dot ? <span className="dot" /> : null}
      {children}
    </span>
  )
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
      <bdi className="tabular-nums font-semibold text-ink" dir="ltr">{a}</bdi>
      <span className="text-faint text-[11px] font-normal">{en ? 'of' : 'از'}</span>
      <bdi className="tabular-nums text-mute" dir="ltr">{r}</bdi>
      {unit ? <span className="text-faint text-[11px]">{unit}</span> : null}
    </span>
  )
}

export function DateTimeText({ value }: { value?: string | null }) {
  return <time className="datetime-ltr" dir="ltr" dateTime={value ?? undefined}>{dateTime(value)}</time>
}

export function DateOnlyText({ value, shamsi = false }: { value?: string | null; shamsi?: boolean }) {
  const text = shamsi ? jalaliDateOnly(value) : dateOnly(value)
  const iso = text === '—' ? undefined : text
  return <time className="datetime-ltr" dir="ltr" dateTime={iso}>{text}</time>
}

export function ProductBadge({ type, label }: { type?: string | null; label?: string | null }) {
  return <Badge tone={productTone(type)}>{productLabel(type, label)}</Badge>
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

export function Field({ label, error, hint, req, children }: { label: string; error?: string; hint?: string; req?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="lbl">
        {label} {req ? <span className="text-bad">*</span> : null}
      </label>
      {children}
      {error ? <p className="text-[0.72rem] text-bad font-medium mt-1 mb-0">{error}</p> : hint ? <p className="text-[0.72rem] text-faint mt-1 mb-0">{hint}</p> : null}
    </div>
  )
}

export function Input({ className = '', icon: Ic, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon; invalid?: boolean }) {
  if (Ic) {
    return (
      <div className="relative">
        <Ic size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
        <input className={`input ps-9 ${invalid ? 'input-err' : ''} ${className}`} {...rest} />
      </div>
    )
  }
  return <input className={`input ${invalid ? 'input-err' : ''} ${className}`} {...rest} />
}

export function SearchInput({ value, onChange, placeholder = 'جستجو…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <Input icon={Search} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
}

export function Select({
  options,
  className = '',
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options?: { v: string; l: string }[] | string[] }) {
  return (
    <div className="relative">
      <select className={`input appearance-none pe-9 cursor-pointer ${className}`} {...rest}>
        {options
          ? options.map((o) => {
              const opt = typeof o === 'string' ? { v: o, l: o } : o
              return <option key={opt.v} value={opt.v}>{opt.l}</option>
            })
          : children}
      </select>
      <ChevronDown size={15} className="absolute end-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>
}

const AV_COLORS = ['#12a07c', '#e9b44c', '#5ea5d6', '#c9705f', '#7fb5ae', '#8d7ac9']
export function Avatar({ name, size = 38, status, className = '' }: { name: string; size?: number; status?: 'online' | 'offline'; className?: string }) {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length
  const initials = name.split(' ').slice(0, 2).map((w) => w[0]).join('‌')
  return (
    <span className={`relative inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 ${className}`} style={{ width: size, height: size, background: AV_COLORS[idx], fontSize: size * 0.36 }}>
      {initials}
      {status && <span className={`absolute bottom-0 end-0 w-[26%] h-[26%] rounded-full border-2 border-surface ${status === 'online' ? 'bg-ok' : 'bg-faint'}`} />}
    </span>
  )
}

export function Menu({
  button,
  items,
  align = 'end',
}: {
  button: ReactNode
  items: { label: string; icon?: LucideIcon; danger?: boolean; onClick?: () => void; node?: ReactNode }[]
  align?: 'start' | 'end'
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const place = () => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const width = 220
    const rtl = document.documentElement.dir === 'rtl'
    let left = align === 'end'
      ? (rtl ? rect.left : rect.right - width)
      : (rtl ? rect.right - width : rect.left)
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
    let top = rect.bottom + 6
    const menuH = menuRef.current?.offsetHeight ?? 120
    if (top + menuH > window.innerHeight - 8) top = Math.max(8, rect.top - menuH - 6)
    setPos({ top, left })
  }

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!open) return
    place()
    const onReposition = () => place()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, align])

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => {
        setOpen((o) => {
          const next = !o
            if (next) requestAnimationFrame(place)
          else setPos(null)
          return next
        })
      }}>{button}</div>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="fixed card !rounded-xl p-1.5 min-w-[220px] z-[110] anim-pop shadow-lg"
          style={{ top: pos.top, left: pos.left }}
        >
          {items.map((it, i) =>
            it.node ? (
              <div key={i}>{it.node}</div>
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => { setOpen(false); it.onClick?.() }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${it.danger ? 'text-bad hover:bg-badsoft' : 'text-ink hover:bg-surface3'}`}
              >
                {it.icon && <it.icon size={15} className={it.danger ? 'text-bad' : 'text-mute'} />}
                {it.label}
              </button>
            ),
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}

export function Drawer({ open, onClose, title, children, w = 440 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; w?: number }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/40 anim-in" onClick={onClose} />
      <div className="absolute inset-y-0 start-0 bg-surface border-e border-line anim-slide shadow-xl flex flex-col w-full" style={{ maxWidth: w }}>
        <header className="flex items-center gap-3 px-5 py-4 border-b border-line shrink-0">
          <h3 className="font-bold flex-1 truncate m-0">{title}</h3>
          <button type="button" className="icon-btn icon-btn-sm" onClick={onClose}><X size={17} /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide,
  preventClose,
  footer,
  size,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  /** When true, backdrop / X cannot dismiss (e.g. while saving / uploading). */
  preventClose?: boolean
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !preventClose) onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose, preventClose])

  if (!open) return null
  const requestClose = () => {
    if (preventClose) return
    onClose()
  }
  const sizeClass = size
    ? { sm: 'is-sm', md: '', lg: 'is-lg', xl: 'is-xl' }[size]
    : (wide ? 'is-wide' : '')
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose() }}
    >
      <div className="absolute inset-0 bg-black/45 anim-in" onClick={requestClose} />
      <div
        className={`relative modal-panel ${sizeClass} anim-pop max-h-[88vh] flex flex-col overflow-hidden`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-3 px-5 py-4 border-b border-line shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold m-0 text-ink">{title}</h3>
            {subtitle && <p className="text-sm text-mute mt-1 mb-0">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn icon-btn-sm disabled:opacity-40" onClick={requestClose} disabled={preventClose} aria-label="بستن">
            <X size={17} />
          </button>
        </header>
        <div className="p-5 overflow-y-auto min-h-0">{children}</div>
        {footer ? <footer className="px-5 py-3.5 border-t border-line flex items-center justify-end gap-2 shrink-0">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}

type ChartPoint = { label: string; value: number; count?: number }

function useChartTheme() {
  const { darkMode } = useApp()
  return {
    grid: darkMode ? '#233029' : '#e2e8e0',
    tick: darkMode ? '#9aaca0' : '#5d6e63',
    tooltip: { backgroundColor: darkMode ? '#111915' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 8px 30px rgba(13, 26, 21, 0.12)' },
    stroke: darkMode ? '#2cb98f' : '#0e8467',
  }
}

function chartAxisLabel(raw: string) {
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return raw
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  if (Number.isNaN(date.getTime())) return raw
  return currentLocale() === 'en' ? `${m[2]}/${m[3]}` : formatJalali(date, 'MM/dd')
}

function chartSeriesName(valueLabel?: string) {
  if (valueLabel) return valueLabel
  return currentLocale() === 'en' ? 'Amount' : 'مقدار'
}

function formatChartValue(value: number | string) {
  return Number(value ?? 0).toLocaleString(localeTag())
}

export function BarChart({ data, testId, valueLabel }: { data: ChartPoint[]; testId?: string; valueLabel?: string }) {
  const theme = useChartTheme()
  const series = chartSeriesName(valueLabel)
  const rows = data.map((d) => ({ name: chartAxisLabel(d.label), value: Number(d.value) || 0 }))
  return (
    <div className="h-64" data-testid={testId ?? 'bar-chart'}>
      {data.length === 0 ? <Empty text="داده‌ای برای نمودار نیست." /> : (
        <ResponsiveContainer width="100%" height="100%">
          <ReBarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.tick }} />
            <YAxis tick={{ fontSize: 11, fill: theme.tick }} width={56} />
            <Tooltip
              contentStyle={theme.tooltip}
              formatter={(value) => [formatChartValue(Number(value ?? 0)), series]}
              labelFormatter={(label) => String(label)}
            />
            <Bar dataKey="value" name={series} fill={theme.stroke} radius={[4, 4, 0, 0]} />
          </ReBarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export function LineChart({ data, testId, valueLabel }: { data: ChartPoint[]; testId?: string; valueLabel?: string }) {
  const theme = useChartTheme()
  const series = chartSeriesName(valueLabel)
  const rows = data.map((d) => {
    const full = chartAxisLabel(d.label)
    return { name: full.length > 10 ? full.slice(-5) : full, value: Number(d.value) || 0 }
  })
  return (
    <div className="h-64" data-testid={testId ?? 'line-chart'}>
      {data.length === 0 ? <Empty text="داده‌ای برای نمودار نیست." /> : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows}>
            <defs>
              <linearGradient id="finopalArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.stroke} stopOpacity={0.3} />
                <stop offset="95%" stopColor={theme.stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.tick }} />
            <YAxis tick={{ fontSize: 11, fill: theme.tick }} width={56} />
            <Tooltip
              contentStyle={theme.tooltip}
              formatter={(value) => [formatChartValue(Number(value ?? 0)), series]}
              labelFormatter={(label) => String(label)}
            />
            <Area type="monotone" dataKey="value" name={series} stroke={theme.stroke} fill="url(#finopalArea)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
