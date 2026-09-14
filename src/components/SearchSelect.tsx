import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../contexts/AppContext'

export type SearchOption = { value: string | number; label: string; keywords?: string }

function fold(value: string) {
  return value
    .normalize('NFKC')
    .replace(/ي/g, 'ی')
    .replace(/ى/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder,
  required,
  testId,
}: {
  value: string | number
  onChange: (value: string) => void
  options: SearchOption[]
  placeholder?: string
  required?: boolean
  testId?: string
}) {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => String(o.value) === String(value))
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    const needle = fold(q)
    return options.filter((o) =>
      fold(o.label).includes(needle)
      || fold(String(o.value)).includes(needle)
      || fold(o.keywords ?? '').includes(needle)
    )
  }, [options, query])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="relative" ref={box} data-testid={testId}>
      <button
        type="button"
        className="input w-full text-start flex justify-between gap-2"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? 'text-surface-800 dark:text-surface-100' : 'text-surface-400'}>
          {selected?.label || placeholder || t('searchPlaceholder')}
        </span>
        <span className="text-surface-400">▾</span>
      </button>
      {required && <input className="sr-only" tabIndex={-1} aria-hidden required value={value ? String(value) : ''} onChange={() => {}} />}
      {open && (
        <div className="absolute z-30 inset-s-0 top-full mt-1 w-full rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-800 shadow-xl p-2">
          <input
            autoFocus
            className="input mb-2"
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-56 overflow-auto">
            <button type="button" className="w-full text-start px-3 py-2 rounded-lg text-sm text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-700" onClick={() => { onChange(''); setOpen(false); setQuery('') }}>
              {placeholder || t('searchPlaceholder')}
            </button>
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`w-full text-start px-3 py-2 rounded-lg text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 ${String(o.value) === String(value) ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700' : 'text-surface-700 dark:text-surface-200'}`}
                onClick={() => { onChange(String(o.value)); setOpen(false); setQuery('') }}
              >
                {o.label}
              </button>
            ))}
            {filtered.length === 0 && <div className="px-3 py-2 text-sm text-surface-400">{t('noItems')}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
