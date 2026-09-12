import { format as formatJalali } from 'date-fns-jalali'

export function money(value?: string | number | null) {
  const n = Number(value ?? 0)
  return new Intl.NumberFormat('fa-IR').format(n)
}

export function percent(value?: string | number | null) {
  const n = Number(value ?? 0)
  return `${n.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`
}

export function dateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return formatJalali(date, 'yyyy/MM/dd HH:mm')
}

export function isDateLike(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 8) return false
  if (!/^\d{4}-\d{2}-\d{2}/.test(value) && !/^\d{4}\/\d{2}\/\d{2}/.test(value)) return false
  return !Number.isNaN(new Date(value).getTime())
}

export function dateTimeExport(value?: string | null) {
  const text = dateTime(value)
  return text === '—' ? '' : `\u200E${text}`
}

export function formatExportValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر'
  if (isDateLike(value)) return dateTimeExport(value)
  if (Array.isArray(value)) return value.map((item) => formatExportValue(item)).join('، ')
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !['password', 'remember_token'].includes(key))
      .map(([key, item]) => `${key}: ${formatExportValue(item)}`)
      .join(' | ')
  }
  return String(value)
}

export const statusLabel: Record<string, string> = {
  successful: 'موفق',
  posted: 'ثبت‌شده',
  requested: 'ثبت درخواست',
  senior_manager_pending: 'در انتظار مدیر ارشد',
  superuser_pending: 'در انتظار سوپریوزر',
  processing: 'در حال پردازش',
  completed: 'تکمیل‌شده',
  rejected: 'رد شده',
  cancelled: 'لغو شده',
  failed: 'ناموفق',
  pending: 'در انتظار',
  approved: 'تایید شده',
  active: 'فعال',
  used: 'مصرف‌شده',
  not_started: 'شروع نشده',
  completed_level: 'قبول شده',
  failed_level: 'مردود',
  commission_credit: 'واریز پورسانت',
  withdrawal_hold: 'مسدود برداشت',
  withdrawal_release: 'آزادسازی مسدودی',
  withdrawal_debit: 'برداشت نهایی',
  reversal: 'برگشت',
  adjustment: 'اصلاح',
  transfer: 'انتقال',
  all_future_benefits: 'انتقال تمام مزایای آینده',
  gateway_share: 'انتقال سهم درگاه',
  descendant: 'زیرمجموعه',
  ancestor: 'مافوق',
  self: 'خودم',
  unrelated: 'نامرتبط',
  processed: 'انجام شده',
  inbound: 'ورودی',
  outbound: 'خروجی',
}

export function label(value?: string | null) {
  if (!value) return '—'
  return statusLabel[value] ?? value
}

export const permissionLabel: Record<string, string> = {
  'representative.gateway.view': 'نماینده / مشاهده درگاه',
  'representative.gateway.create': 'نماینده / ایجاد درگاه',
  'representative_referrer.team.view': 'معرف / مشاهده تیم',
  'sales_manager.team.view': 'مدیر فروش / مشاهده تیم',
  'sales_manager.team.message': 'مدیر فروش / پیام به تیم',
  'development_manager.team.view': 'مدیر توسعه / مشاهده تیم',
  'senior_manager.withdrawal.approve': 'مدیر ارشد / تایید برداشت',
  'senior_manager.benefit_transfer.create': 'مدیر ارشد / انتقال مزایا',
  'senior_manager.promotion.decide': 'مدیر ارشد / تصمیم ارتقاء',
  'superuser.commission_rules.update': 'سوپریوزر / ویرایش قواعد پورسانت',
  'superuser.gateway.create': 'سوپریوزر / ثبت فروش درگاه',
  'chat.cross_branch.message': 'چت بین‌شاخه‌ای',
}

export const criterionLabel: Record<string, string> = {
  personal_points: 'امتیاز فروش شخصی',
  new_representatives: 'ثبت‌نام نمایندگان جدید',
  strong_representatives: 'نمایندگان با امتیاز بالا',
  senior_assessment: 'مصاحبه و تایید مدیر ارشد',
  tenure_years: 'سابقه مدیر فروشی (سال)',
  registered_reps: 'مجموع نمایندگان ثبت‌شده',
  strong_reps: 'نمایندگان قوی',
  team_satisfaction: 'رضایت نمایندگان تیم',
  eligible_sales_managers: 'نمایندگان واجد شرایط مدیر فروش',
}

export const settingLabel: Record<string, string> = {
  qualification_thresholds: 'آستانه‌های پاداش ماهانه',
  promotion_criteria: 'معیارهای ارتقاء سازمانی',
}

export const auditLabel: Record<string, string> = {
  'withdrawal.requested': 'ثبت درخواست برداشت',
  'withdrawal.approved': 'تایید برداشت',
  'withdrawal.rejected': 'رد برداشت',
  'promotion.approved': 'تایید ارتقاء',
  'promotion.rejected': 'رد ارتقاء',
  'user.created': 'ایجاد کاربر',
  'role.assigned': 'اختصاص نقش',
  'permission.role_assigned': 'اعطای دسترسی به نقش',
  'permission.role_revoked': 'سلب دسترسی از نقش',
  'permission.user_override': 'اعطای دسترسی به کاربر',
  'permission.user_revoked': 'سلب دسترسی کاربر',
  'setting.updated': 'تغییر تنظیمات',
  'commission_rule.versioned': 'ذخیره قاعده پورسانت',
  'user.updated': 'ویرایش کاربر',
  'user.deleted': 'حذف یا غیرفعال‌سازی کاربر',
  'course.updated': 'ویرایش دوره',
  'course.deleted': 'حذف دوره',
  'benefit_transfer.all': 'انتقال کامل مزایا',
  'benefit_transfer.share': 'انتقال سهم درگاه',
}

export const entityLabel: Record<string, string> = {
  User: 'کاربر',
  Role: 'نقش',
  Course: 'دوره آموزشی',
  SystemSetting: 'تنظیمات',
  CommissionRule: 'قاعده پورسانت',
  WithdrawalRequest: 'برداشت',
  PromotionRequest: 'ارتقاء',
}

export function entityName(type?: string | null) {
  if (!type) return 'سامانه'
  const short = type.split('\\').pop() ?? type
  return entityLabel[short] ?? short
}
