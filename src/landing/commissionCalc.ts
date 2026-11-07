/** نرخ‌های پایه و پاداش سازمان فروش فینونت (هم‌راستا با CommissionEngine / QaBaseSeeder) */

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

export type CalcInput = {
  role: RoleSlug
  /** سود ماهانه تراکنش‌های منتسب به نقش (تومان) */
  monthlyProfit: number
  /** تعداد درگاه ثبت‌شده در ماه جاری */
  gatewaysThisMonth: number
  /** آیا درگاه‌ها از قبل واجد شرایط پاداش دائمی هستند */
  assumeQualified: boolean
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
  const role = ROLE_OPTIONS.find((r) => r.slug === input.role) ?? ROLE_OPTIONS[0]
  const profit = Math.max(0, Number(input.monthlyProfit) || 0)
  const gateways = Math.max(0, Math.floor(Number(input.gatewaysThisMonth) || 0))
  const pointsEarned = gateways * role.pointsPerGateway

  const qualified =
    role.pointsThreshold == null
      ? false
      : input.assumeQualified || pointsEarned >= role.pointsThreshold

  const baseAmount = (profit * role.basePercent) / 100
  const bonusAmount = qualified ? (profit * role.bonusDeltaPercent) / 100 : 0
  const totalAmount = baseAmount + bonusAmount
  const effectivePercent = role.basePercent + (qualified ? role.bonusDeltaPercent : 0)

  const pointsNeeded = role.pointsThreshold
  const gatewaysNeededForBonus =
    role.pointsThreshold == null ? null : Math.ceil(role.pointsThreshold / role.pointsPerGateway)

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
export function chainBaseTotal(profit: number): number {
  const order: RoleSlug[] = [
    'representative',
    'representative_referrer',
    'sales_manager',
    'development_manager',
    'senior_manager',
  ]
  return order.reduce((sum, slug) => {
    const role = ROLE_OPTIONS.find((r) => r.slug === slug)
    return sum + (profit * (role?.basePercent ?? 0)) / 100
  }, 0)
}
