import type { ReactNode } from 'react'
import { dateTime } from '../lib/format'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h2 className="text-[22px] font-extrabold m-0">{title}</h2>
        {subtitle && <p className="text-sm text-[var(--muted)] mt-1 mb-0">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ title, value, hint, testId }: { title: string; value: ReactNode; hint?: string; testId?: string }) {
  return (
    <div className="card stat">
      <div className="label">{title}</div>
      <div className="value" data-testid={testId}>{value}</div>
      {hint && <div className="text-xs text-[var(--muted)] mt-2">{hint}</div>}
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

export function DateTimeText({ value }: { value?: string | null }) {
  return <time className="datetime-ltr" dir="ltr" dateTime={value ?? undefined}>{dateTime(value)}</time>
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <p className="field-hint">{children}</p>
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
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="بستن">بستن</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

type ChartPoint = { label: string; value: number; count?: number }

export function BarChart({ data, testId }: { data: ChartPoint[]; testId?: string }) {
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1)
  return (
    <div className="chart-bars" data-testid={testId ?? 'bar-chart'}>
      {data.length === 0 && <div className="empty">داده‌ای برای نمودار نیست.</div>}
      {data.map((d) => (
        <div key={d.label} className="chart-bar-row">
          <div className="chart-bar-label">{d.label}</div>
          <div className="chart-bar-track">
            <span style={{ width: `${Math.max(4, (Number(d.value) / max) * 100)}%` }} />
          </div>
          <div className="chart-bar-value">{Number(d.value).toLocaleString('fa-IR')}</div>
        </div>
      ))}
    </div>
  )
}

export function LineChart({ data, testId }: { data: ChartPoint[]; testId?: string }) {
  const width = 560
  const height = 180
  const pad = 24
  const values = data.map((d) => Number(d.value) || 0)
  const max = Math.max(...values, 1)
  const stepX = data.length > 1 ? (width - pad * 2) / (data.length - 1) : 0
  const points = data.map((d, i) => {
    const x = pad + i * stepX
    const y = height - pad - ((Number(d.value) || 0) / max) * (height - pad * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="chart-line" data-testid={testId ?? 'line-chart'}>
      {data.length === 0 ? <div className="empty">داده‌ای برای نمودار نیست.</div> : (
        <svg viewBox={`0 0 ${width} ${height}`} className="line-svg" role="img">
          <polyline fill="none" stroke="#0e7a6a" strokeWidth="3" points={points} />
          {data.map((d, i) => {
            const x = pad + i * stepX
            const y = height - pad - ((Number(d.value) || 0) / max) * (height - pad * 2)
            return <circle key={d.label + i} cx={x} cy={y} r="4" fill="#0e7a6a" />
          })}
        </svg>
      )}
      <div className="chart-line-labels">
        {data.slice(0, 8).map((d) => <span key={d.label}>{d.label.slice(5)}</span>)}
      </div>
    </div>
  )
}
