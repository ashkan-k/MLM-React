import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

const FA = '۰۱۲۳۴۵۶۷۸۹'
export const fa = (v: string | number): string =>
  String(v).replace(/[0-9]/g, (d) => FA[+d]).replace(/\./g, '٫').replace(/,/g, '٬')

export const faMoney = (n: number): string => fa(Math.round(n).toLocaleString('en-US'))

export function useInView<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true)
            obs.disconnect()
          }
        })
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

export function Reveal({
  children,
  className = '',
  delay = 0,
  style,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  style?: CSSProperties
  as?: 'div' | 'section' | 'li' | 'figure' | 'article' | 'span' | 'header' | 'footer' | 'aside'
}) {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${inView ? 'in-view' : ''} ${className}`}
      style={{ '--rd': `${delay}ms`, ...style } as CSSProperties}
    >
      {children}
    </Tag>
  )
}

export function FaqItem({
  q,
  a,
  open,
  onToggle,
  accent = '#E8442E',
}: {
  q: string
  a: string
  open: boolean
  onToggle: () => void
  accent?: string
}) {
  return (
    <div className="border-b border-[#141414]/15">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 py-5 text-start group"
      >
        <span className="font-bold text-base md:text-lg leading-8">{q}</span>
        <span
          className="shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{
            borderColor: accent,
            color: open ? '#fff' : accent,
            background: open ? accent : 'transparent',
            transform: open ? 'rotate(45deg)' : undefined,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M7 1v12M1 7h12" />
          </svg>
        </span>
      </button>
      <div className={`acc-body ${open ? 'open' : ''}`}>
        <div className="acc-inner">
          <p className="pb-6 leading-8 text-[15px] text-[#141414]/70">{a}</p>
        </div>
      </div>
    </div>
  )
}
