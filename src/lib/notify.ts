import { currentLocale } from './format'
import { dashboardPath } from './roles'

const typePath: Record<string, string> = {
  'promotion.pending': 'promotions',
  'promotion.approved': 'promotions',
  'promotion.rejected': 'promotions',
  'shared_link.approval': 'referrals',
  'withdrawal.pending': 'withdrawals',
  'training.progress': 'training',
  'gateway.submitted': 'gateways',
  'gateway.inspected': 'gateways',
  'gateway.shaparak_confirmed': 'gateways',
  'gateway.rejected': 'gateways',
}

const titlesFa: Record<string, string> = {
  'promotion.pending': 'درخواست ارتقاء جدید',
  'promotion.approved': 'ارتقاء تایید شد',
  'promotion.rejected': 'ارتقاء رد شد',
  'shared_link.approval': 'تایید لینک اشتراکی',
  'withdrawal.pending': 'برداشت در انتظار تایید',
  'training.progress': 'پیشرفت آموزش شبکه',
  'gateway.submitted': 'درگاه جدید برای بازرسی',
  'gateway.inspected': 'درگاه آماده تایید شاپرک',
  'gateway.shaparak_confirmed': 'درگاه تایید شد',
  'gateway.rejected': 'درگاه رد شد',
  'system.info': 'راهنمای پنل',
}

const titlesEn: Record<string, string> = {
  'promotion.pending': 'New promotion request',
  'promotion.approved': 'Promotion approved',
  'promotion.rejected': 'Promotion rejected',
  'shared_link.approval': 'Shared-link approval',
  'withdrawal.pending': 'Withdrawal awaiting review',
  'training.progress': 'Network training progress',
  'gateway.submitted': 'New gateway awaiting inspection',
  'gateway.inspected': 'Gateway ready for Shaparak',
  'gateway.shaparak_confirmed': 'Gateway confirmed',
  'gateway.rejected': 'Gateway rejected',
  'system.info': 'Panel guide',
}

export type AppNotification = {
  id: number
  title: string
  body: string
  type?: string
  read_at?: string
  created_at: string
  data?: { link?: string; path?: string; note?: string }
}

export function notificationTitle(notification: Pick<AppNotification, 'type' | 'title'>) {
  const map = currentLocale() === 'en' ? titlesEn : titlesFa
  return (notification.type && map[notification.type]) || notification.title || '—'
}

export function notificationBody(notification: Pick<AppNotification, 'type' | 'body' | 'data'>) {
  const en = currentLocale() === 'en'
  if (notification.type === 'promotion.rejected' && notification.data?.note) {
    return en
      ? `Your promotion request was rejected. Reason: ${notification.data.note}`
      : `درخواست ارتقاء شما رد شد. علت: ${notification.data.note}`
  }
  if (notification.type === 'promotion.approved') {
    return en ? 'Your promotion request was approved.' : (notification.body || 'درخواست ارتقاء شما تایید شد.')
  }
  return notification.body ?? ''
}

export function notificationHref(
  notification: { type?: string; data?: { link?: string; path?: string } },
  roleSlug?: string | null,
  isSuperuser?: boolean,
) {
  if (notification.data?.link) return notification.data.link
  const path = notification.data?.path ?? typePath[notification.type ?? '']
  if (!path) return null
  if (isSuperuser) return path.startsWith('/') ? path : `/superuser/${path}`
  const base = dashboardPath(roleSlug)
  return `${base}/${path}`
}
