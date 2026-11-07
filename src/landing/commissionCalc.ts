/** نرخ‌های پایه و پاداش — از API عمومی یا پیش‌فرض هم‌راستا با پنل سوپریوزر */

export type RoleSlug =
  | 'representative'
  | 'representative_referrer'
  | 'sales_manager'
  | 'development_manager'
  | 'senior_manager'

export type RoleOption = {
  slug: RoleSlug
  label: string
  basePercent: number
  bonusDeltaPercent: number
  /** حد نصاب امتیاز ماهانه برای واجدشرایطی پاداش؛ null = بدون پاداش ماهانه */
  pointsThreshold: number | null
  pointsPerGateway: number
}

/** پیش‌فرض محلی — فقط تا وقتی API لود نشده / خطا */
export const ROLE_OPTIONS: RoleOption[] = [
  {
    slug: 'representative',
    label: 'نماینده',
    basePercent: 15,
    bonusDeltaPercent: 5,
    pointsThreshold: 1000,
    pointsPerGateway: 100,
  },
  {
    slug: 'representative_referrer',
    label: 'نماینده معرف',
    basePercent: 2,
    bonusDeltaPercent: 0,
    pointsThreshold: null,
    pointsPerGateway: 100,
  },
  {
    slug: 'sales_manager',
    label: 'مدیر فروش',
    basePercent: 6,
    bonusDeltaPercent: 2,
    pointsThreshold: 5000,
    pointsPerGateway: 100,
  },
  {
    slug: 'development_manager',
    label: 'مدیر توسعه',
    basePercent: 4.5,
    bonusDeltaPercent: 1.5,
    pointsThreshold: 20000,
    pointsPerGateway: 100,
  },
  {
    slug: 'senior_manager',
    label: 'مدیر ارشد',
    basePercent: 4,
    bonusDeltaPercent: 0,
    pointsThreshold: null,
    pointsPerGateway: 100,
  },
]

export type ApiCommissionRole = {
  slug: string
  label: string
  base_percent: number
  qualified_percent: number
  bonus_delta_percent: number
  points_threshold: number | null
  points_per_gateway: number
  qualification_type?: string | null
}

export type ApiCommissionRates = {
  roles: ApiCommissionRole[]
  points_per_gateway?: number
}

const SLUGS = new Set<RoleSlug>([
  'representative',
  'representative_referrer',
  'sales_manager',
  'development_manager',
  'senior_manager',
])

export function mapApiRoles(payload: ApiCommissionRates | null | undefined): RoleOption[] {
  const rows = payload?.roles ?? []
  if (!rows.length) return ROLE_OPTIONS
  const mapped = rows
    .filter((r): r is ApiCommissionRole & { slug: RoleSlug } => SLUGS.has(r.slug as RoleSlug))
    .map((r) => {
      const base = Number(r.base_percent) || 0
      const bonus = Math.max(0, Number(r.bonus_delta_percent) || 0)
      return {
        slug: r.slug,
        label: r.label || r.slug,
        basePercent: base,
        bonusDeltaPercent: bonus,
        pointsThreshold: bonus > 0 ? (r.points_threshold ?? null) : null,
        pointsPerGateway: Number(r.points_per_gateway) || payload?.points_per_gateway || 100,
      } satisfies RoleOption
    })
  return mapped.length ? mapped : ROLE_OPTIONS
}

export type CalcInput = {
  role: RoleSlug
  /** سود ماهانه تراکنش‌های منتسب به نقش (تومان) */
  monthlyProfit: number
  /** تعداد درگاه ثبت‌شده در ماه جاری */
  gatewaysThisMonth: number
  /** آیا درگاه‌ها از قبل واجد شرایط پاداش دائمی هستند */
  assumeQualified: boolean
  roles?: RoleOption[]
}

export type CalcResult = {
  role: RoleOption
  baseAmount: number
  bonusAmount: number
  totalAmount: number
  effectivePercent: number
  qualified: boolean
  pointsEarned: number
  pointsNeeded: number | null
  gatewaysNeededForBonus: number | null
}

export function calculateCommission(input: CalcInput): CalcResult {
  const catalog = input.roles?.length ? input.roles : ROLE_OPTIONS
  const role = catalog.find((r) => r.slug === input.role) ?? catalog[0] ?? ROLE_OPTIONS[0]
  const profit = Math.max(0, Number(input.monthlyProfit) || 0)
  const gateways = Math.max(0, Math.floor(Number(input.gatewaysThisMonth) || 0))
  const pointsEarned = gateways * role.pointsPerGateway

  const qualified =
    role.pointsThreshold == null || role.bonusDeltaPercent <= 0
      ? false
      : input.assumeQualified || pointsEarned >= role.pointsThreshold

  const baseAmount = (profit * role.basePercent) / 100
  const bonusAmount = qualified ? (profit * role.bonusDeltaPercent) / 100 : 0
  const totalAmount = baseAmount + bonusAmount
  const effectivePercent = role.basePercent + (qualified ? role.bonusDeltaPercent : 0)

  const pointsNeeded = role.bonusDeltaPercent > 0 ? role.pointsThreshold : null
  const gatewaysNeededForBonus =
    pointsNeeded == null ? null : Math.ceil(pointsNeeded / role.pointsPerGateway)

  return {
    role,
    baseAmount,
    bonusAmount,
    totalAmount,
    effectivePercent,
    qualified,
    pointsEarned,
    pointsNeeded,
    gatewaysNeededForBonus,
  }
}

/** جمع پایهٔ زنجیره برای یک سود تراکنش (سناریوی انفرادی + معرف) */
export function chainBaseTotal(profit: number, roles: RoleOption[] = ROLE_OPTIONS): number {
  const order: RoleSlug[] = [
    'representative',
    'representative_referrer',
    'sales_manager',
    'development_manager',
    'senior_manager',
  ]
  return order.reduce((sum, slug) => {
    const role = roles.find((r) => r.slug === slug)
    return sum + (profit * (role?.basePercent ?? 0)) / 100
  }, 0)
}
