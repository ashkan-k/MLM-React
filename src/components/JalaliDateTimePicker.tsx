import { addDays, addMonths, format, getDay, getDaysInMonth, getMonth, getYear, setMonth, setYear, startOfMonth } from 'date-fns-jalali'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { jalaliPopStyle } from './JalaliDatePicker'

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function fromIso(value?: string) {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
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

function parts(value?: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value ?? '')
  return {
    date: fromIso(match?.[1]),
    hh: match?.[2] ?? '09',
    mm: match?.[3] ?? '00',
  }
}

export function JalaliDateTimePicker({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ و ساعت',
  testId,
}: {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  testId?: string
}) {
  const current = parts(value)
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(() => current.date ?? new Date())
  const [hh, setHh] = useState(current.hh)
  const [mm, setMm] = useState(current.mm)
  const [popStyle, setPopStyle] = useState<CSSProperties>({})
  const box = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const next = parts(value)
    setCursor(next.date ?? new Date())
    setHh(next.hh)
    setMm(next.mm)
  }, [open, value])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (box.current?.contains(target) || pop.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (!open) return
    const place = () => setPopStyle(jalaliPopStyle(box.current, 340))
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  const year = getYear(cursor)
  const month = getMonth(cursor)
  const years = useMemo(() => {
    const lo = Math.min(year - 2, year)
    const hi = Math.max(year + 5, year)
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
  }, [year])
  const first = startOfMonth(cursor)
  const cells = [...Array(weekdayIndex(first)).fill(null), ...Array.from({ length: getDaysInMonth(cursor) }, (_, i) => i + 1)]
  const label = current.date ? `${format(current.date, 'yyyy/MM/dd')}  ${current.hh}:${current.mm}` : placeholder

  return (
    <div className="jalali-picker" ref={box} data-testid={testId}>
      <button type="button" className="input jalali-trigger" onClick={() => setOpen((v) => !v)}>
        <span dir="ltr">{label}</span>
      </button>
      {open && createPortal(
        <div ref={pop} className="jalali-pop is-fixed" style={popStyle} role="dialog" aria-label="انتخاب تاریخ و ساعت شمسی">
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
          <div className="jalali-week">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="jalali-grid">
            {cells.map((day, i) => {
              if (!day) return <span key={`e-${i}`} />
              const candidate = addDays(first, day - 1)
              const isSelected = format(cursor, 'yyyy/MM/dd') === format(candidate, 'yyyy/MM/dd')
              return (
                <button key={`${year}-${month}-${day}`} type="button" className={`jalali-day ${isSelected ? 'is-selected' : ''}`} onClick={() => setCursor(candidate)}>
                  {day.toLocaleString('fa-IR')}
                </button>
              )
            })}
          </div>
          <div className="jalali-time">
            <label className="field">ساعت
              <select className="input" data-testid={testId ? `${testId}-hour` : undefined} value={hh} onChange={(e) => setHh(e.target.value)}>
                {HOURS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
              </select>
            </label>
            <label className="field">دقیقه
              <select className="input" data-testid={testId ? `${testId}-minute` : undefined} value={mm} onChange={(e) => setMm(e.target.value)}>
                {MINUTES.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
              </select>
            </label>
          </div>
          <div className="jalali-actions">
            <button
              type="button"
              className="btn btn-primary"
              data-testid={testId ? `${testId}-confirm` : undefined}
              onClick={() => {
                onChange(`${toIso(cursor)}T${hh}:${mm}`)
                setOpen(false)
              }}
            >
              تایید
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { onChange(''); setOpen(false) }}>پاک کردن</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
