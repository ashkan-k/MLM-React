import type { AuthUser } from './api'

export const PAGE_PERMISSION: Record<string, string> = {
  '': 'page.dashboard',
  team: 'page.team',
  gateways: 'page.gateways',
  commissions: 'page.commissions',
  'monthly-bonus': 'page.monthly_bonus',
  points: 'page.points',
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
}

export function canAccessPage(user: AuthUser | null | undefined, pageKey: string): boolean {
  if (!user) return false
  if (user.is_superuser) return true
  const slug = PAGE_PERMISSION[pageKey]
  if (!slug) return true
  if (user.permissions?.includes(slug)) return true
  const hasPageCatalog = (user.permissions ?? []).some((item) => item.startsWith('page.'))
  if (hasPageCatalog) return false
  if (slug === 'page.transfers' || slug === 'page.courses_manage' || slug === 'page.points') {
    return user.active_role?.slug === 'senior_manager'
  }
  return true
}
