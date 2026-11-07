import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { calculateCommission, mapApiRoles, type RoleSlug } from './commissionCalc'
import { FaqItem, Reveal, fa, faMoney } from './fx'
import './landing.css'

const RED = '#E8442E'
const BLUE = '#2743C7'
const GOLD = '#F0C33A'
const GREEN = '#1C7C46'
const PAPER = '#FAF9F4'
const INK = '#131313'
const REGISTER = '/register'
const LOGIN = '/login'

const ACCENTS = [RED, BLUE, GREEN, '#C77800', GOLD, '#0F766E'] as const

type CatalogProductPublic = {
  type: string
  label: string
  description?: string | null
  default_code?: string | null
  signup_url?: string | null
  requires_merchant?: boolean
  sale_points?: number
}

type LandingProduct = {
  type: string
  code: string
  href: string
  title: string
  desc: string
  color: string
  span: 'hero' | 'side' | 'card'
}

function productHref(p: CatalogProductPublic): string {
  const url = (p.signup_url ?? '').trim()
  if (url) return url
  if (p.type === 'gateway_profit' || p.requires_merchant) return 'https://finopal.ir/'
  if (p.type === 'ghalebazar') return 'https://ghalebazar.ir/'
  if (p.type === 'ticketing') return 'https://finopal.ir/panel/tickets'
  return REGISTER
}

/** پیش‌فرض توضیح کارت — اگر در پنل خالی باشد */
const DEFAULT_PRODUCT_DESC: Record<string, string> = {
  gateway_profit:
    'ارائه‌دهنده خدمات درگاه پرداخت اینترنتی به کسب‌وکارها و فروشگاه‌های آنلاین، با امکان مدیریت و پردازش هوشمند تراکنش‌ها.\nمدل درآمدزایی نماینده: دریافت سهم درآمد از تراکنش‌های درگاه‌های پرداخت ثبت‌شده و فعال‌شده توسط مشتریان معرفی‌شده؛ ایجاد درآمد مستمر با ادامه فعالیت پذیرندگان.',
  subscription:
    'مجموعه‌ای یکپارچه از خدمات پرداخت، استعلام و سرویس‌های کاربردی روزمره در قالب یک اپلیکیشن برای کاربران حقیقی و کسب‌وکارها.\nمدل درآمدزایی نماینده: دریافت سهم درآمد از تراکنش‌های پرداختی و خدمات استعلامی کاربران معرفی‌شده به فاپ.',
  finopol:
    'ارائه مجموعه‌ای از APIها و وب‌سرویس‌های مالی، هویتی و اطلاعاتی برای کسب‌وکارها، سامانه‌ها و توسعه‌دهندگان نرم‌افزار.\nمدل درآمدزایی نماینده: دریافت سهم درآمد از مصرف سرویس‌ها و تراکنش‌های کسب‌وکارهای معرفی‌شده؛ با ظرفیت ایجاد درآمد مستمر از مشتریان سازمانی.',
  finolo:
    'ابزاری کاربردی برای برنامه‌ریزی، مدیریت پروژه‌ها، سازمان‌دهی وظایف و افزایش بهره‌وری تیم‌ها و کسب‌وکارها.\nمدل درآمدزایی نماینده: دریافت پورسانت از فروش و تمدید اشتراک مشتریان معرفی‌شده.',
  ghalebazar:
    'مجموعه‌ای گسترده با بیش از ۶ هزار قالب و طرح مدرن وب‌سایت، مبتنی بر فناوری SPA، برای راه‌اندازی سریع و حرفه‌ای کسب‌وکارهای آنلاین.\nمدل درآمدزایی نماینده: دریافت پورسانت از فروش قالب‌های آماده و محصولات دیجیتال به مشتریان معرفی‌شده.',
  finoticket:
    'راهکاری حرفه‌ای برای مدیریت تیکت‌ها، ارتباط با مشتریان، پیگیری درخواست‌ها و سازمان‌دهی فرآیندهای پشتیبانی کسب‌وکارها.\nمدل درآمدزایی نماینده: دریافت پورسانت از فروش و تمدید اشتراک کسب‌وکارهای معرفی‌شده.',
  ticketing:
    'راهکاری حرفه‌ای برای مدیریت تیکت‌ها، ارتباط با مشتریان، پیگیری درخواست‌ها و سازمان‌دهی فرآیندهای پشتیبانی کسب‌وکارها.\nمدل درآمدزایی نماینده: دریافت پورسانت از فروش و تمدید اشتراک کسب‌وکارهای معرفی‌شده.',
}

function productDesc(p: CatalogProductPublic): string {
  const fromPanel = (p.description ?? '').trim()
  if (fromPanel) return fromPanel
  if (DEFAULT_PRODUCT_DESC[p.type]) return DEFAULT_PRODUCT_DESC[p.type]
  if (p.requires_merchant) {
    return 'ارائه‌دهنده خدمات درگاه پرداخت اینترنتی به کسب‌وکارها؛ سهم نماینده از تراکنش‌های پذیرندگان معرفی‌شده.'
  }
  if ((p.sale_points ?? 0) > 0) {
    return `محصول فعال کاتالوگ سازمان فروش · ${fa(p.sale_points ?? 0)} امتیاز به ازای هر فروش موفق.`
  }
  return 'محصول و خدمت فینو در سبد فروش فینونت؛ منبع سهم نمایندگان از معرفی و فروش.'
}

function mapCatalogProducts(rows: CatalogProductPublic[]): LandingProduct[] {
  return rows.map((p, i) => {
    const code = (p.default_code?.trim() || p.type).toUpperCase()
    const span: LandingProduct['span'] = i === 0 ? 'hero' : i === 1 ? 'side' : 'card'
    return {
      type: p.type,
      code,
      href: productHref(p),
      title: p.label,
      desc: productDesc(p),
      color: ACCENTS[i % ACCENTS.length],
      span,
    }
  })
}

const WHY = [
  { n: '۰۱', c: RED, t: 'عضویت رایگان، بدون تله', d: 'ثبت‌نام و ورود به پنل سازمان فروش هزینه ندارد. درآمد از سهم فروش واقعی شکل می‌گیرد، نه حق عضویت پنهان یا تمدید خودکار.' },
  { n: '۰۲', c: BLUE, t: 'عدد شفاف، تصمیم روشن', d: 'نرخ هر نقش در پنل و ماشین‌حساب همین صفحه یکی است. قبل از عضویت می‌توانی برآورد دریافتی‌ات را ببینی.' },
  { n: '۰۳', c: RED, t: 'از روز اول پنل واقعی', d: 'بعد از ثبت‌نام، داشبورد، سوییچ نقش، گزارش و کیف پول در دسترس است — نه دموی محدود و نه نسخهٔ نمایشی.' },
  { n: '۰۴', c: BLUE, t: 'رشد با پاداش پایدار', d: 'با رسیدن به حد نصاب ماهانه، سهم پاداش روی فعالیت‌های واجد شرایط قفل می‌ماند و در تراکنش‌های بعدی هم لحاظ می‌شود.' },
] as const

const PATH = [
  { n: '۱', day: 'گام ۱', dayColor: BLUE, last: false, t: 'ثبت‌نام با کد معرف', d: 'از لینک دعوت یا صفحهٔ ثبت‌نام وارد شو؛ نقش نمایندگی برایت ساخته می‌شود و به پنل دسترسی پیدا می‌کنی.' },
  { n: '۲', day: 'گام ۲', dayColor: BLUE, last: false, t: 'فعال‌سازی فروش', d: 'محصول یا کانال فروش خودت را ثبت کن و مدارک لازم را برای بررسی مدیر ارشد بفرست.' },
  { n: '۳', day: 'گام ۳', dayColor: BLUE, last: false, t: 'اولین فروش و سهم', d: 'با ثبت فروش موفق، سهم پایه همان مسیر به کیف نقش‌های زنجیره واریز می‌شود.' },
  { n: '۴', day: 'گام ۴', dayColor: RED, last: true, t: 'رشد شبکه و پاداش', d: 'زیرمجموعه بساز، به حد نصاب برس و پاداش ماهانه را روی فعالیت‌های واجد شرایط فعال نگه دار.' },
] as const

const FAQS = [
  ['عضویت رایگان است؟', 'بله. ثبت‌نام و ورود به پنل سازمان فروش رایگان است. درآمد از سهم فروش واقعی شکل می‌گیرد، نه از حق عضویت یا تمدید پنهان.'],
  ['پورسانت چطور محاسبه می‌شود؟', 'هر نقش نرخ پایهٔ مشخصی روی سود فروش دارد. بعضی نقش‌ها با رسیدن به حد نصاب ماهانه، سهم پاداش اضافه هم می‌گیرند. جزئیات را در ماشین‌حساب همین صفحه می‌بینی.'],
  ['نقش معرف چیست؟', 'معرف سهم جداگانه‌ای از کل سود همان فروش می‌گیرد؛ این سهم از برش نماینده کم نمی‌شود و یک‌بار برای هر معرف لحاظ می‌شود.'],
  ['برای شروع چه چیزی لازم است؟', 'یک کد معرف معتبر. با دکمهٔ عضویت وارد ثبت‌نام شو؛ اگر از قبل حساب داری، از ورود به پنل استفاده کن.'],
  ['بعد از عضویت چه می‌بینم؟', 'داشبورد نقش فعال، گزارش فروش و سهم، کیف پول، و در صورت دسترسی، مدیریت تیم و محصولات. همه در همان پنل سازمان فروش.'],
] as const

const NAV = [
  ['محصولات', '#tool'],
  ['چرا فینونت؟', '#why'],
  ['ماشین‌حساب سود', '#calc'],
  ['مسیر عضویت', '#path'],
  ['سؤالات', '#faq'],
] as const

const BARS = [
  { h: 22, bg: '#fff', delay: 0 },
  { h: 30, bg: '#fff', delay: 70 },
  { h: 26, bg: '#fff', delay: 140 },
  { h: 38, bg: '#fff', delay: 210 },
  { h: 34, bg: '#fff', delay: 280 },
  { h: 46, bg: '#fff', delay: 350 },
  { h: 42, bg: '#fff', delay: 420 },
  { h: 55, bg: '#fff', delay: 490 },
  { h: 50, bg: '#fff', delay: 560 },
  { h: 64, bg: '#fff', delay: 630 },
  { h: 60, bg: '#8FA0E8', delay: 700 },
  { h: 78, bg: '#8FA0E8', delay: 770 },
  { h: 72, bg: '#8FA0E8', delay: 840 },
  { h: 92, bg: RED, delay: 910, tip: '۲۰٪' },
]

function Beaker({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" className={className}>
      <path d="M13 4h6M14 4v8l-7 12a3 3 0 0 0 2.6 4.5h12.8A3 3 0 0 0 25 24L18 12V4" />
      <path d="M10.5 20h11" />
      <circle cx="15" cy="24" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19.5" cy="23" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke={INK} strokeWidth="2.6">
      <path d="m3 11 5 5 9-12" />
    </svg>
  )
}

function ProductCodeLink({ code, href, color }: { code: string; href: string; color: string }) {
  const external = href.startsWith('http')
  const cls = 'f-mono text-[10px] border border-[#131313] px-2 py-0.5 hover:underline underline-offset-2'
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls} style={{ color }} data-testid={`product-link-${code}`}>
        {code}
      </a>
    )
  }
  return (
    <Link to={href} className={cls} style={{ color }} data-testid={`product-link-${code}`}>
      {code}
    </Link>
  )
}

function CommissionCalculator() {
  const [role, setRole] = useState<RoleSlug>('representative')
  const [profit, setProfit] = useState(100_000_000)
  const [gateways, setGateways] = useState(10)
  const [assumeQualified, setAssumeQualified] = useState(false)
  const { data: ratesPayload } = useQuery({
    queryKey: ['public-commission-rates'],
    queryFn: async () => (await api.get('/public/commission-rates')).data as import('./commissionCalc').ApiCommissionRates,
    staleTime: 60_000,
  })
  const roles = useMemo(() => mapApiRoles(ratesPayload), [ratesPayload])

  const result = useMemo(
    () => calculateCommission({ role, monthlyProfit: profit, gatewaysThisMonth: gateways, assumeQualified, roles }),
    [role, profit, gateways, assumeQualified, roles],
  )

  useEffect(() => {
    if (!roles.some((r) => r.slug === role) && roles[0]) {
      setRole(roles[0].slug)
    }
  }, [roles, role])

  const profitPct = Math.min(100, Math.max(0, ((profit - 10_000_000) / (500_000_000 - 10_000_000)) * 100))
  const gwPct = Math.min(100, Math.max(0, (gateways / 50) * 100))

  return (
    <div className="border-2 border-[#131313] bg-white shadow-[10px_10px_0_#131313] p-6 md:p-9" data-testid="landing-calculator">
      <div className="flex justify-between items-center mb-7">
        <h3 className="f-lalezar text-2xl">ورودی‌های آزمایش</h3>
        <span className="f-mono text-[11px] border border-[#131313] px-2 py-1" style={{ background: GOLD }}>LIVE</span>
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2.5">
          <label className="text-sm font-medium">نقش فعال در سازمان</label>
          <span className="f-mono text-xs font-semibold border border-[#131313]/30 px-2 py-0.5" style={{ color: BLUE }}>
            {result.role.label}
          </span>
        </div>
        <select
          className="w-full border-2 border-[#131313] bg-[#FAF9F4] px-3 py-2.5 text-sm font-medium"
          value={role}
          onChange={(e) => setRole(e.target.value as RoleSlug)}
          data-testid="calc-role"
        >
          {roles.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.label} — پایه {fa(r.basePercent)}٪{r.bonusDeltaPercent ? ` + پاداش ${fa(r.bonusDeltaPercent)}٪` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2.5">
          <label className="text-sm font-medium">سود ماهانهٔ تراکنش‌ها</label>
          <span className="f-mono text-xs font-semibold border border-[#131313]/30 px-2 py-0.5" style={{ color: BLUE }} data-testid="calc-profit-value">
            {faMoney(profit)} تومان
          </span>
        </div>
        <input
          type="range"
          dir="ltr"
          min={10_000_000}
          max={500_000_000}
          step={1_000_000}
          value={profit}
          onChange={(e) => setProfit(Number(e.target.value))}
          className="w-full"
          aria-label="سود ماهانه تراکنش‌ها"
          style={{ '--pct': `${profitPct}%`, '--fill': RED } as CSSProperties}
          data-testid="calc-profit"
        />
      </div>

      <div className="mb-6">
        <div className="flex justify-between mb-2.5">
          <label className="text-sm font-medium">درگاه ثبت‌شده این ماه</label>
          <span className="f-mono text-xs font-semibold border border-[#131313]/30 px-2 py-0.5" style={{ color: BLUE }} data-testid="calc-gateways-value">
            {fa(gateways)}
          </span>
        </div>
        <input
          type="range"
          dir="ltr"
          min={0}
          max={50}
          step={1}
          value={gateways}
          onChange={(e) => setGateways(Number(e.target.value))}
          className="w-full"
          aria-label="تعداد درگاه این ماه"
          style={{ '--pct': `${gwPct}%`, '--fill': RED } as CSSProperties}
          data-testid="calc-gateways"
          disabled={result.role.pointsThreshold == null}
        />
      </div>

      {result.role.bonusDeltaPercent > 0 && (
        <label className="flex items-center gap-2 text-sm mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={assumeQualified}
            onChange={(e) => setAssumeQualified(e.target.checked)}
            className="accent-[#E8442E]"
            data-testid="calc-qualified"
          />
          درگاه‌های قبلی واجد شرایط پاداش دائمی هستند
        </label>
      )}

      <div className="border-t-2 border-dashed border-[#131313]/25 pt-6 space-y-3">
        <div className="flex justify-between text-sm" data-testid="calc-base">
          <span className="text-[#131313]/60">پورسانت پایه ({fa(result.role.basePercent)}٪)</span>
          <span className="f-mono font-semibold">{faMoney(result.baseAmount)} تومان</span>
        </div>
        <div className="flex justify-between text-sm" data-testid="calc-bonus">
          <span className="text-[#131313]/60">پاداش ماهانه{result.qualified ? '' : ' (غیرفعال)'}</span>
          <span className="f-mono font-semibold" style={{ color: BLUE }}>{faMoney(result.bonusAmount)} تومان</span>
        </div>
        <div className="flex justify-between items-center border-2 border-[#131313] p-4 mt-4" style={{ background: '#D8F3E3' }} data-testid="calc-total">
          <span className="f-lalezar text-xl">جمع دریافتی</span>
          <span className="f-lalezar text-2xl md:text-3xl" style={{ color: GREEN }}>{faMoney(result.totalAmount)}+</span>
        </div>
        <Link
          to={REGISTER}
          className="mt-5 block text-center f-changa font-bold text-lg py-3.5 border-2 border-[#131313] shadow-[5px_5px_0_#131313] hover:shadow-[1px_1px_0_#131313] hover:translate-x-1 hover:translate-y-1 transition-all"
          style={{ background: RED, color: '#fff' }}
          data-testid="calc-cta"
        >
          این عدد را در پنل واقعی ببین — ثبت‌نام
        </Link>
      </div>
    </div>
  )
}

export function LabLanding() {
  const [openFaq, setOpenFaq] = useState(0)
  const { data: catalog = [], isLoading: catalogLoading, isError: catalogError } = useQuery({
    queryKey: ['public-catalog-products'],
    queryFn: async () => (await api.get('/public/catalog/products')).data as CatalogProductPublic[],
    staleTime: 60_000,
  })
  const products = useMemo(() => mapCatalogProducts(catalog), [catalog])
  const hero = products.find((p) => p.span === 'hero')
  const side = products.find((p) => p.span === 'side')
  const cards = products.filter((p) => p.span === 'card')

  return (
    <div dir="rtl" className="landing-root f-vazir min-h-screen" style={{ background: PAPER, color: INK }} data-testid="lab-landing">
      {/* header */}
      <header className="sticky top-0 z-40 border-b-2 border-[#131313]" style={{ background: PAPER }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 grid place-items-center border-2 border-[#131313] group-hover:rotate-6 transition-transform" style={{ background: RED, color: PAPER }}>
              <span className="w-5 h-5"><Beaker className="w-full h-full" /></span>
            </span>
            <span className="f-lalezar text-2xl leading-none pt-1">فینونت</span>
          </a>
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {NAV.map(([t, h]) => (
              <a key={h} href={h} className="relative after:absolute after:bottom-[-4px] after:right-0 after:h-[3px] after:w-0 hover:after:w-full after:bg-[#E8442E] after:transition-all">
                {t}
              </a>
            ))}
          </nav>
          <Link
            to={REGISTER}
            className="f-changa font-bold text-sm md:text-base px-4 md:px-6 py-2 border-2 border-[#131313] shadow-[4px_4px_0_#131313] hover:shadow-[1px_1px_0_#131313] hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            style={{ background: RED, color: '#fff' }}
            data-testid="nav-register"
          >
            شروع عضویت
          </Link>
        </div>
      </header>

      {/* HERO — identical structure to raw */}
      <section id="top" className="relative bg-grid-paper overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-14 md:pt-20 pb-14 grid lg:grid-cols-12 gap-10 items-center">
          <Reveal className="lg:col-span-7 relative z-10">
            <p className="f-mono text-xs md:text-sm flex items-center gap-3 mb-6">
              <span className="inline-block w-2.5 h-2.5 rounded-full anim-pulse-dot" style={{ background: RED }} />
              سازمان فروش فینونت — عضویت نمایندگی
            </p>
            <h1 className="f-lalezar font-normal leading-[1.2] text-[10vw] sm:text-5xl md:text-6xl xl:text-[68px]">
              فینونت؛{' '}
              <span className="relative inline-block">
                بستری برای درآمدی ماندگار
                <span className="absolute right-0 left-0 bottom-1 h-[10px] md:h-[14px] -z-10" style={{ background: '#F5C9C1' }} />
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base md:text-lg leading-8 text-[#131313]/75">
              فینونت مسیر فروش پلکانی را یکجا جمع کرده: محصولات، پورسانت نقش‌محور، پاداش ماهانه و پنل واقعی نمایندگان.
              <strong className="text-[#131313]"> عضویت رایگان</strong>.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                to={REGISTER}
                className="f-changa font-bold text-lg px-8 py-3.5 border-2 border-[#131313] shadow-[6px_6px_0_#131313] hover:shadow-[2px_2px_0_#131313] hover:translate-x-1 hover:translate-y-1 transition-all"
                style={{ background: RED, color: '#fff' }}
                data-testid="hero-activate"
              >
                شروع عضویت ←
              </Link>
              <a
                href="#calc"
                className="f-changa font-bold text-lg px-8 py-3.5 border-2 border-[#131313] bg-[#131313]/0 hover:bg-[#131313] hover:text-[#FAF9F4] transition-colors"
                data-testid="hero-calc"
              >
                محاسبهٔ سود من
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
              {[
                ['۵ نقش', 'سلسله‌مراتب فروش'],
                ['۱۵٪', 'پایهٔ نماینده'],
                ['۴+', 'محصول پورسانتی'],
              ].map(([n, l]) => (
                <div key={l} className="flex items-baseline gap-3">
                  <span className="f-lalezar text-3xl md:text-4xl" style={{ color: BLUE }}>{n}</span>
                  <span className="text-sm text-[#131313]/60">{l}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={150} className="lg:col-span-5 relative">
            <div className="absolute -top-8 -left-2 md:-left-8 z-20 w-28 h-28 md:w-36 md:h-36 anim-spin-slow">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <path id="c1circ" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
                </defs>
                <circle cx="50" cy="50" r="47" fill={RED} />
                <circle cx="50" cy="50" r="30" fill="none" stroke="#fff" strokeDasharray="3 3" />
                <text fontSize="10.5" fill="#fff" fontWeight="700" letterSpacing="1">
                  <textPath href="#c1circ">عضویت رایگان • پورسانت شفاف • پنل واقعی • </textPath>
                </text>
                <text x="50" y="56" textAnchor="middle" fontSize="17" fontWeight="800" fill="#fff" fontFamily="Lalezar">رایگان</text>
              </svg>
            </div>

            <div className="border-2 border-[#131313] bg-white shadow-[10px_10px_0_#131313] relative">
              <div className="flex items-center justify-between border-b-2 border-[#131313] px-5 py-3">
                <span className="f-mono text-xs">FINONET / نمای شبکه</span>
                <span className="flex gap-1.5">
                  <i className="w-3 h-3 rounded-full border border-[#131313]" style={{ background: RED }} />
                  <i className="w-3 h-3 rounded-full border border-[#131313]" style={{ background: BLUE }} />
                  <i className="w-3 h-3 rounded-full border border-[#131313]" style={{ background: GOLD }} />
                </span>
              </div>
              <div className="p-5 md:p-7">
                <div className="flex justify-between items-end mb-1">
                  <span className="f-lalezar text-xl">نرخ مؤثر پورسانت — نماینده</span>
                  <span className="f-mono text-[11px] px-2 py-0.5 border border-[#131313]" style={{ background: '#D8F3E3' }}>+۵٪ ▲</span>
                </div>
                <div className="flex items-end gap-2 h-40 border-b-2 border-[#131313] pb-0">
                  {BARS.map((b, i) => (
                    <div
                      key={i}
                      className="flex-1 bar-grow border border-[#131313] relative"
                      style={{ height: `${b.h}%`, background: b.bg, animationDelay: `${b.delay}ms` }}
                    >
                      {b.tip ? (
                        <span className="absolute -top-7 right-1/2 translate-x-1/2 f-mono text-[10px] whitespace-nowrap border border-[#131313] bg-white px-1">{b.tip}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between f-mono text-[10px] text-[#131313]/60 mt-1.5">
                  <span>پایه ۱۵٪</span><span>حد نصاب</span><span>با پاداش ۲۰٪</span>
                </div>
                <div className="mt-5 space-y-2.5 f-mono text-xs">
                  <div className="flex justify-between border-b border-dashed border-[#131313]/25 pb-2">
                    <span className="text-[#131313]/60">وضعیت</span>
                    <span className="font-semibold" style={{ color: GREEN }}>موفق ✔</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-[#131313]/25 pb-2">
                    <span className="text-[#131313]/60">هزینهٔ عضویت</span>
                    <span className="font-semibold" style={{ color: BLUE }}>۰ تومان</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-[#131313]/25 pb-2">
                    <span className="text-[#131313]/60">دادهٔ لازم</span>
                    <span className="font-semibold">کد معرف + پنل</span>
                  </div>
                </div>
              </div>
              <div className="border-t-2 border-[#131313] px-5 py-3 f-mono text-[11px] flex justify-between">
                <span>finonet.ir</span>
                <span className="anim-blink">آمادهٔ عضویت…▌</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* TOOL — same grid as raw */}
      <section id="tool" className="py-20 md:py-28 border-t-2 border-[#131313]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <Reveal className="mb-12 max-w-3xl">
            <p className="f-mono text-xs mb-3" style={{ color: RED }}>// سبد محصولات و خدمات فینو</p>
            <h2 className="f-lalezar font-normal text-4xl md:text-6xl leading-tight">سبد محصولات و خدمات فینو</h2>
            <p className="mt-5 text-sm md:text-base leading-8 text-[#131313]/70">
              با معرفی محصولات فینو، یک جریان درآمدی مستمر برای خود ایجاد کنید. با عضویت در شبکه فروش فینونت، مجموعه‌ای متنوع از محصولات و خدمات مالی، پرداختی و فناوری فینو را به مشتریان و کسب‌وکارها معرفی کنید و از فعالیت و خرید مشتریان معرفی‌شده، درآمد کسب کنید.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-6 gap-4 md:gap-5" data-testid="landing-products">
            {catalogLoading ? (
              <div className="md:col-span-6 border-2 border-[#131313] bg-white p-8 f-mono text-sm text-[#131313]/60" data-testid="landing-products-loading">
                در حال بارگذاری محصولات کاتالوگ…
              </div>
            ) : null}

            {catalogError ? (
              <div className="md:col-span-6 border-2 border-[#131313] bg-white p-8 text-sm text-[#131313]/70" data-testid="landing-products-error">
                دریافت لیست محصولات از کاتالوگ ممکن نشد. بعداً دوباره تلاش کنید.
              </div>
            ) : null}

            {!catalogLoading && !catalogError && products.length === 0 ? (
              <div className="md:col-span-6 border-2 border-[#131313] bg-white p-8 text-sm text-[#131313]/70" data-testid="landing-products-empty">
                هنوز محصول فعالی در کاتالوگ سازمان فروش ثبت نشده است.
              </div>
            ) : null}

            {hero ? (
              <Reveal className="md:col-span-4 border-2 border-[#131313] bg-white shadow-[8px_8px_0_#131313] p-6 md:p-8 relative overflow-hidden group">
                <div className="flex flex-wrap gap-8 items-center">
                  <div className="min-w-[200px] flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-10 h-10 inline-block" style={{ color: hero.color }}>
                        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-full h-full">
                          <path d="M5 6h22l-8.5 10v8.5L13.5 27v-11L5 6Z" />
                        </svg>
                      </span>
                      <ProductCodeLink code={hero.code} href={hero.href} color={hero.color} />
                    </div>
                    <h3 className="f-lalezar text-2xl md:text-3xl mb-3">{hero.title}</h3>
                    <p className="text-sm md:text-[15px] leading-7 text-[#131313]/70 whitespace-pre-line">{hero.desc}</p>
                    <Link to={REGISTER} className="inline-block mt-4 f-mono text-xs underline underline-offset-4 hover:no-underline" style={{ color: BLUE }}>
                      عضویت رایگان ←
                    </Link>
                  </div>
                  <div className="flex-1 space-y-2.5 min-w-[220px]">
                    {[
                      ['ثبت درگاه', '100%', INK],
                      ['تأیید ارشد', '62%', BLUE],
                      ['تراکنش موفق', '41%', '#8FA0E8'],
                      ['پورسانت واریزی', '27%', RED],
                    ].map(([lab, w, c], i) => (
                      <div key={lab} className="flex items-center gap-3">
                        <div className="flex-1 h-8 border border-[#131313] bg-white p-1">
                          <div className="h-full transition-all duration-1000 group-hover:opacity-90" style={{ width: w, background: c, transitionDelay: `${i * 120}ms` }} />
                        </div>
                        <span className="f-mono text-[11px] w-24 shrink-0">{lab}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ) : null}

            {side ? (
              <Reveal delay={100} className="md:col-span-2 border-2 border-[#131313] shadow-[8px_8px_0_#131313] p-6 md:p-8 flex flex-col" style={{ background: PAPER }}>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <span className="w-10 h-10" style={{ color: side.color }}>
                    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-full h-full">
                      <circle cx="7" cy="8" r="3" /><circle cx="25" cy="8" r="3" /><circle cx="16" cy="25" r="3" />
                      <path d="M9.5 10 14 22M22.5 10 18 22M10 8h12" />
                    </svg>
                  </span>
                  <ProductCodeLink code={side.code} href={side.href} color={side.color} />
                </div>
                <h3 className="f-lalezar text-2xl mb-2">{side.title}</h3>
                <p className="text-sm leading-7 text-[#131313]/70 flex-1 whitespace-pre-line">{side.desc}</p>
              </Reveal>
            ) : null}

            {cards.map((p, i) => (
              <Reveal key={`${p.type}-${p.code}`} delay={i * 90} className="md:col-span-3 lg:col-span-3 border-2 border-[#131313] bg-white shadow-[8px_8px_0_#131313] p-6 md:p-7 hover:-translate-y-1.5 transition-transform">
                <div className="flex items-start justify-between">
                  <span className="w-9 h-9" style={{ color: p.color }}>
                    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-full h-full">
                      <rect x="4" y="7" width="24" height="18" /><path d="m4 9 12 9L28 9" />
                    </svg>
                  </span>
                  <ProductCodeLink code={p.code} href={p.href} color={p.color} />
                </div>
                <h3 className="f-lalezar text-xl md:text-2xl mt-4 mb-1.5">{p.title}</h3>
                <p className="text-sm leading-7 text-[#131313]/70 whitespace-pre-line">{p.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHY — numbered list layout */}
      <section id="why" className="border-y-2 border-[#131313] py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-10">
          <Reveal className="lg:col-span-4">
            <p className="f-mono text-xs mb-3" style={{ color: BLUE }}>// سؤال اصلی</p>
            <h2 className="f-lalezar font-normal text-4xl md:text-5xl leading-[1.2]">چرا فینونت؟ چون به مدل فروش شک نداریم.</h2>
            <p className="mt-6 leading-8 text-[#131313]/70 text-sm md:text-base">بیشتر سیستم‌ها فقط وعده می‌دهند؛ اینجا پنل واقعی سازمان فروش را می‌بینی. این چهار دلیل پشت این اعتماد است:</p>
            <Link
              to={REGISTER}
              className="mt-8 inline-block f-changa font-bold px-7 py-3 border-2 border-[#131313] shadow-[5px_5px_0_#131313] hover:shadow-[1px_1px_0_#131313] hover:translate-x-1 hover:translate-y-1 transition-all"
              style={{ background: GOLD }}
            >
              شروع عضویت
            </Link>
          </Reveal>
          <div className="lg:col-span-8">
            {WHY.map((item, i) => (
              <Reveal key={item.n} delay={i * 80} className="group grid sm:grid-cols-[90px_1fr] gap-4 md:gap-8 py-7 border-b-2 border-[#131313]/12 last:border-0">
                <span className="f-lalezar text-5xl md:text-6xl leading-none transition-colors" data-n={item.n}>
                  <span className="group-hover:hidden text-[#131313]/15">{item.n}</span>
                  <span className="hidden group-hover:inline" style={{ color: item.c }}>{item.n}</span>
                </span>
                <div>
                  <h3 className="f-lalezar text-2xl mb-2">{item.t}</h3>
                  <p className="leading-8 text-[#131313]/70 text-sm md:text-[15px]">{item.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CALC — 2-col raw layout */}
      <section id="calc" className="py-20 md:py-28 border-t-2 border-[#131313] bg-grid-paper">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <p className="f-mono text-xs mb-3" style={{ color: RED }}>// برآورد روی عدد خودت</p>
            <h2 className="f-lalezar font-normal text-4xl md:text-6xl leading-[1.15]">ماشین‌حساب سود: عددِ خودت را ببین</h2>
            <p className="mt-6 leading-8 text-[#131313]/70 text-sm md:text-base max-w-lg">
              نقش و سود ماهانه را تنظیم کن تا سهم پایه و پاداش با نرخ رسمی سازمان فروش محاسبه شود —
              از نماینده تا مدیر ارشد، همان چیزی که در پنل می‌بینی.
            </p>
            <ul className="mt-8 space-y-4">
              <li className="flex gap-4 items-start">
                <span className="w-8 h-8 shrink-0 border-2 border-[#131313] grid place-items-center" style={{ background: GOLD }}><CheckIcon /></span>
                <div>
                  <strong className="block">قبل از عضویت</strong>
                  <span className="text-sm text-[#131313]/60">برآورد رایگان است؛ هیچ تعهد مالی برای ورود به شبکه نیست.</span>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <span className="w-8 h-8 shrink-0 border-2 border-[#131313] grid place-items-center" style={{ background: GOLD }}><CheckIcon /></span>
                <div>
                  <strong className="block">بعد از عضویت</strong>
                  <span className="text-sm text-[#131313]/60">همان نرخ‌ها در پنل اعمال می‌شود؛ فقط فروش واقعی را ثبت می‌کنی.</span>
                </div>
              </li>
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <CommissionCalculator />
          </Reveal>
        </div>
      </section>

      {/* PATH — vertical timeline like raw */}
      <section id="path" className="py-20 md:py-28 bg-white border-t-2 border-[#131313]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <Reveal className="mb-14 text-center">
            <p className="f-mono text-xs mb-3" style={{ color: RED }}>// مسیر ورود به شبکه</p>
            <h2 className="f-lalezar font-normal text-4xl md:text-6xl">مسیر عضویت، قدم‌به‌قدم</h2>
          </Reveal>
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute right-[27px] md:right-[31px] top-2 bottom-2 w-[3px] bg-[#131313]/15" />
            {PATH.map((step, i) => (
              <Reveal key={step.n} delay={i * 120} className="relative flex gap-6 md:gap-8 pb-12 last:pb-0">
                <span
                  className="relative z-10 w-14 h-14 md:w-16 md:h-16 shrink-0 border-2 border-[#131313] grid place-items-center f-lalezar text-xl md:text-2xl shadow-[4px_4px_0_#131313]"
                  style={{ background: step.last ? RED : PAPER, color: step.last ? '#fff' : INK }}
                >
                  {step.n}
                </span>
                <div className="pt-1">
                  <p className="f-mono text-xs mb-1.5" style={{ color: step.dayColor }}>{step.day}</p>
                  <h3 className="f-lalezar text-2xl md:text-3xl mb-2">{step.t}</h3>
                  <p className="leading-8 text-[#131313]/70 text-sm md:text-[15px] max-w-xl">{step.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — raw 4+8 layout, no pricing/testimonials/form */}
      <section id="faq" className="py-20 md:py-28 bg-grid-paper border-t-2 border-[#131313]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid lg:grid-cols-12 gap-10">
          <Reveal className="lg:col-span-4">
            <p className="f-mono text-xs mb-3" style={{ color: BLUE }}>// ابهام‌زدایی</p>
            <h2 className="f-lalezar font-normal text-4xl md:text-5xl leading-[1.2]">سؤالاتی که همه می‌پرسند</h2>
            <p className="mt-5 text-sm leading-7 text-[#131313]/65">
              پاسخ دقیق‌تر را بعد از ورود به پنل، از پشتیبانی سازمان فروش بگیر.
            </p>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-8">
            <div data-testid="landing-faq">
              {FAQS.map(([q, a], i) => (
                <FaqItem key={q} q={q} a={a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* footer — light like raw */}
      <footer className="border-t-2 border-[#131313] pt-14 pb-8 overflow-hidden" data-testid="landing-footer">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-3 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-9 h-9 grid place-items-center border-2 border-[#131313]" style={{ background: RED, color: PAPER }}>
                  <span className="w-5 h-5"><Beaker className="w-full h-full" /></span>
                </span>
                <span className="f-lalezar text-2xl">فینونت</span>
              </div>
              <p className="text-sm leading-7 text-[#131313]/60 max-w-xs">
                سازمان فروش پلکانی فینونت — شبکه نمایندگان، پورسانت شفاف و پنل نقش‌محور.
              </p>
            </div>
            <div>
              <p className="f-mono text-xs mb-4 text-[#131313]/50">/ فهرست سایت</p>
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {NAV.map(([t, h]) => (
                  <li key={h}><a href={h} className="hover:underline underline-offset-4">{t}</a></li>
                ))}
                <li><Link to={REGISTER} className="hover:underline underline-offset-4">ثبت‌نام</Link></li>
                <li><Link to={LOGIN} className="hover:underline underline-offset-4">ورود</Link></li>
              </ul>
            </div>
            <div>
              <p className="f-mono text-xs mb-4 text-[#131313]/50">/ ارتباط</p>
              <ul className="space-y-2 text-sm">
                <li className="f-mono" dir="ltr">https://finonet.ir</li>
                <li>پشتیبانی سازمان فروش فینونت</li>
                <li>شنبه تا پنج‌شنبه، ۹ تا ۱۸</li>
              </ul>
            </div>
          </div>
          <div className="f-lalezar text-[18vw] md:text-[11rem] leading-[0.9] text-center text-outline opacity-20 select-none" aria-hidden>
            فینونت
          </div>
          <div className="flex flex-wrap justify-between gap-3 border-t border-[#131313]/15 pt-6 f-mono text-[11px] text-[#131313]/50">
            <span>© فینونت — سازمان فروش</span>
            <span>سازمان فروش پلکانی · finonet.ir</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LabLanding
