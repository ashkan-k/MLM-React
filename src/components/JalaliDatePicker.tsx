import { addDays, addMonths, format, getDay, getDaysInMonth, getMonth, getYear, setMonth, setYear, startOfMonth } from 'date-fns-jalali'
import { useEffect, useMemo, useRef, useState } from 'react'

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

function fromIso(value?: string) {
  if (!value) return null
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function toIso(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function weekdayIndex(date: Date) {
  return (getDay(date) + 1) % 7
}

export function JalaliDatePicker({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  allowClear = true,
  testId,
  fromYear,
  toYear,
}: {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  allowClear?: boolean
  testId?: string
  fromYear?: number
  toYear?: number
}) {
  const selected = fromIso(value)
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(() => selected ?? new Date())
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selected) setCursor(selected)
  }, [value])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const year = getYear(cursor)
  const month = getMonth(cursor)
  const years = useMemo(() => {
    const start = fromYear ?? year - 10
    const end = toYear ?? year + 10
    const lo = Math.min(start, year)
    const hi = Math.max(end, year)
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
  }, [fromYear, toYear, year])
  const first = startOfMonth(cursor)
  const blanks = weekdayIndex(first)
  const days = getDaysInMonth(cursor)
  const cells = [...Array(blanks).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]

  return (
    <div className="jalali-picker" ref={box} data-testid={testId ?? 'jalali-datepicker'}>
      <button type="button" className="input jalali-trigger" onClick={() => setOpen((v) => !v)}>
        <span dir="ltr">{selected ? format(selected, 'yyyy/MM/dd') : placeholder}</span>
      </button>
      {open && (
        <div className="jalali-pop" role="dialog" aria-label="انتخاب تاریخ شمسی">
          <div className="jalali-nav">
            <button type="button" className="btn btn-ghost" onClick={() => setCursor(addMonths(cursor, -1))}>ماه قبل</button>
            <div className="jalali-selects">
              <select className="input" value={month} onChange={(e) => setCursor(setMonth(cursor, Number(e.target.value)))}>
                {MONTHS.map((name, i) => <option key={name} value={i}>{name}</option>)}
              </select>
              <select className="input" value={year} onChange={(e) => setCursor(setYear(cursor, Number(e.target.value)))}>
                {years.map((y) => <option key={y} value={y}>{y.toLocaleString('fa-IR', { useGrouping: false })}</option>)}
              </select>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setCursor(addMonths(cursor, 1))}>ماه بعد</button>
          </div>
          <div className="jalali-week">
            {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="jalali-grid">
            {cells.map((day, i) => {
              if (!day) return <span key={`e-${i}`} />
              const candidate = addDays(first, day - 1)
              const isSelected = selected ? format(selected, 'yyyy/MM/dd') === format(candidate, 'yyyy/MM/dd') : false
              return (
                <button
                  key={`${year}-${month}-${day}`}
                  type="button"
                  className={`jalali-day ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(toIso(candidate))
                    setOpen(false)
                  }}
                >
                  {day.toLocaleString('fa-IR')}
                </button>
              )
            })}
          </div>
          <div className="jalali-actions">
            <button type="button" className="btn btn-ghost" onClick={() => { onChange(toIso(new Date())); setOpen(false) }}>امروز</button>
            {allowClear && <button type="button" className="btn btn-ghost" onClick={() => { onChange(''); setOpen(false) }}>پاک کردن</button>}
          </div>
        </div>
      )}
    </div>
  )
}
