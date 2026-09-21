import { format as formatJalali, getMonth, getYear, setMonth, setYear } from 'date-fns-jalali'
import { useMemo } from 'react'

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

function fromYm(value?: string) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return new Date()
  const date = new Date(`${value}-15T12:00:00`)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function toYm(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** انتخاب ماه/سال شمسی → مقدار API به‌صورت YYYY-MM میلادی */
export function JalaliMonthPicker({
  value,
  onChange,
  fromYear,
  toYear,
}: {
  value: string
  onChange: (ym: string) => void
  fromYear?: number
  toYear?: number
}) {
  const cursor = fromYm(value)
  const jy = getYear(cursor)
  const jm = getMonth(cursor)

  const years = useMemo(() => {
    const start = fromYear ?? jy - 3
    const end = toYear ?? jy + 1
    const lo = Math.min(start, jy)
    const hi = Math.max(end, jy)
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
  }, [fromYear, toYear, jy])

  return (
    <div className="flex gap-2 items-center" data-testid="jalali-month-picker" title={formatJalali(cursor, 'MMMM yyyy')}>
      <select
        className="input !w-auto min-w-[7.5rem]"
        value={jm}
        aria-label="ماه شمسی"
        onChange={(e) => onChange(toYm(setMonth(cursor, Number(e.target.value))))}
      >
        {MONTHS.map((name, i) => (
          <option key={name} value={i}>{name}</option>
        ))}
      </select>
      <select
        className="input !w-auto min-w-[5.5rem]"
        value={jy}
        aria-label="سال شمسی"
        onChange={(e) => onChange(toYm(setYear(cursor, Number(e.target.value))))}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y.toLocaleString('fa-IR', { useGrouping: false })}</option>
        ))}
      </select>
    </div>
  )
}
