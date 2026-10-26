import type { AuthUser } from './api'

export const PAGE_PERMISSION: Record<string, string> = {
  '': 'page.dashboard',
  team: 'page.team',
  gateways: 'page.gateways',
  transactions: 'page.transactions',
  commissions: 'page.commissions',
  'monthly-bonus': 'page.monthly_bonus',
  points: 'page.points',
  'bonus-default': 'page.points',
  wallet: 'page.wallet',
  finance: 'page.finance',
  withdrawals: 'page.withdrawals',
  transfers: 'page.transfers',
  referrals: 'page.referrals',
  promotions: 'page.promotions',
  training: 'page.training',
  courses: 'page.courses_manage',
  chat: 'page.chat',
  notifications: 'page.notifications',
  reports: 'page.reports',
  'goals-bank': 'page.goals_bank',
  'goals-access': 'page.goals_bank',
  'goals-monitor': 'page.goals_bank',
}

export function canAccessGoalsBank(user: AuthUser | null | undefined): boolean {
  if (!user) return false
  if (user.is_superuser || user.active_role?.slug === 'superuser' || user.active_role?.slug === 'senior_manager') return true
  return !!user.features?.goal_bank?.enabled
}

/** Normalize `/superuser/commissions` → `commissions` for permission lookup. */
export function pageAccessKey(pageKey: string): string {
  const raw = (pageKey ?? '').trim()
  if (!raw) return ''
  if (raw.startsWith('/superuser')) {
    const rest = raw.replace(/^\/superuser\/?/, '')
    return rest.split('/').filter(Boolean)[0] ?? ''
  }
  if (raw.startsWith('/')) {
    const parts = raw.split('/').filter(Boolean)
    return parts[parts.length - 1] ?? ''
  }
  return raw
}

export function canAccessPage(user: AuthUser | null | undefined, pageKey: string): boolean {
  if (!user) return false
  // پنل مدیر سامانه (از جمله پورسانت) مستقل از FINOPAL_PRODUCT_ORIENTED است
  if (user.is_superuser || user.active_role?.slug === 'superuser') return true
  const key = pageAccessKey(pageKey)
  // مسیر صفحه برای همه نقش‌ها باز است؛ خود صفحه اگر دسترسی نباشد پیام می‌دهد.
  // نمایش لینک منو همچنان با canAccessGoalsBank محدود می‌شود.
  if (key === 'goals-bank' || key === 'goals-access' || key === 'goals-monitor') return true
  const slug = PAGE_PERMISSION[key] ?? PAGE_PERMISSION[pageKey]
  if (!slug) return true
  if (user.permissions?.includes(slug)) return true
  const hasPageCatalog = (user.permissions ?? []).some((item) => item.startsWith('page.'))
  if (hasPageCatalog) return false
  if (slug === 'page.transfers' || slug === 'page.courses_manage' || slug === 'page.points' || slug === 'page.reports') {
    return user.active_role?.slug === 'senior_manager'
  }
  return true
}
