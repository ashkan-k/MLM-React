import { format as formatJalali } from 'date-fns-jalali'

export function currentLocale() {
  return localStorage.getItem('finopal.locale') === 'en' ? 'en' : 'fa'
}

export function localeTag() {
  return currentLocale() === 'en' ? 'en-US' : 'fa-IR'
}

export function money(value?: string | number | null) {
  const n = Number(value ?? 0)
  return new Intl.NumberFormat(localeTag()).format(n)
}

export function moneyHeader(base?: string) {
  const locale = currentLocale()
  const word = base ?? (locale === 'en' ? 'Amount' : 'مبلغ')
  return locale === 'en' ? `${word} (Toman)` : `${word} (تومان)`
}

export function parseGrouped(value: string) {
  return value.replace(/[^\d.]/g, '')
}

export function formatGrouped(value: string) {
  const raw = parseGrouped(value)
  if (!raw) return ''
  const [int, dec] = raw.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec !== undefined ? `${grouped}.${dec.slice(0, 3)}` : grouped
}

export function percent(value?: string | number | null) {
  const n = Number(value ?? 0)
  const mark = currentLocale() === 'en' ? '%' : '٪'
  const rounded = Math.round(n * 100) / 100
  return `${rounded.toLocaleString(localeTag(), { maximumFractionDigits: 2, minimumFractionDigits: 0 })}${mark}`
}

/** امتیاز کسب‌شده نسبت به حد نصاب — بدون / تا در RTL جابه‌جا نشود */
export function scorePairText(actual: number, required: number) {
  const a = Number(actual).toLocaleString(localeTag())
  const r = Number(required).toLocaleString(localeTag())
  return currentLocale() === 'en' ? `${a} of ${r}` : `${a} از ${r}`
}

export function dateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return formatJalali(date, 'yyyy/MM/dd HH:mm')
}

/** فقط روز/ماه/سال — بدون ساعت (ISO را هم پشتیبانی می‌کند) */
export function dateOnly(value?: string | null) {
  if (!value) return '—'
  const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const y = date.getUTCFullYear()
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

const productLabelFa: Record<string, string> = {
  gateway_profit: 'سود درگاه پرداخت',
  gateway: 'سود درگاه پرداخت',
  ticketing: 'سیستم تیکتینگ فینوپال',
  subscription: 'اشتراک فاینوپال',
  monthly_bonus: 'پاداش ماهانه',
  monthly_bonus_residual: 'مابقی پاداش',
  organizational: 'سود درگاه پرداخت',
  custom: 'سود درگاه پرداخت',
}

const productLabelEn: Record<string, string> = {
  gateway_profit: 'Payment gateway profit',
  gateway: 'Payment gateway profit',
  ticketing: 'Finopal ticketing',
  subscription: 'Finopal subscription',
  monthly_bonus: 'Monthly bonus',
  monthly_bonus_residual: 'Residual bonus',
  organizational: 'Payment gateway profit',
  custom: 'Payment gateway profit',
}

export function productLabel(type?: string | null, fallback?: string | null) {
  if (fallback && fallback !== 'محصول سفارشی' && fallback.toLowerCase() !== 'custom product') {
    return fallback
  }
  const key = (type ?? 'gateway_profit').trim().toLowerCase().replace(/[-\s]+/g, '_')
  const map = currentLocale() === 'en' ? productLabelEn : productLabelFa
  return map[key] ?? map.gateway_profit
}

export function productTone(type?: string | null): 'ok' | 'warn' | 'info' | 'muted' | 'danger' {
  const key = (type ?? '').trim().toLowerCase().replace(/[-\s]+/g, '_')
  if (key === 'gateway_profit' || key === 'gateway') return 'info'
  if (key === 'ticketing') return 'ok'
  if (key === 'subscription') return 'warn'
  if (key === 'monthly_bonus' || key === 'organizational') return 'warn'
  return 'muted'
}

/** YYYY-MM یا تاریخ کامل → نام ماه شمسی + سال (مثلاً شهریور ۱۴۰۵) */
export function jalaliMonth(value?: string | null) {
  if (!value) return '—'
  const raw = value.length === 7 ? `${value}-01T12:00:00` : value
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return value
  const text = formatJalali(date, 'MMMM yyyy')
  if (currentLocale() === 'en') return text
  return text.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
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
  if (typeof value === 'boolean') return currentLocale() === 'en' ? (value ? 'Yes' : 'No') : (value ? 'بله' : 'خیر')
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
  pending_inspection: 'در انتظار بررسی مدارک (مدیر ارشد)',
  pending_shaparak: 'در انتظار تایید شاپرک',
  submitted: 'ارسال مدارک',
  inspected: 'تایید مدارک',
  shaparak_confirmed: 'تایید درگاه',
  commission_posted: 'ثبت پورسانت',
  successful: 'موفق',
  posted: 'ثبت‌شده',
  requested: 'ثبت درخواست',
  senior_manager_pending: 'در انتظار مدیر ارشد',
  superuser_pending: 'در انتظار مدیر سامانه',
  processing: 'در حال پردازش',
  completed: 'تکمیل‌شده',
  rejected: 'رد شده',
  cancelled: 'لغو شده',
  failed: 'ناموفق',
  pending: 'در انتظار',
  verified: 'تاییدشده',
  paid: 'پرداخت‌شده',
  approved: 'تایید شده',
  active: 'فعال',
  used: 'مصرف‌شده',
  not_started: 'شروع نشده',
  completed_level: 'قبول شده',
  failed_level: 'مردود',
  commission_credit: 'واریز پورسانت',
  monthly_bonus: 'پاداش ماهانه',
  monthly_bonus_residual: 'واریز پاداش اضافه',
  monthly_bonus_reversal: 'برگشت پاداش',
  withdrawal_hold: 'مسدود برداشت',
  withdrawal_release: 'آزادسازی مسدودی',
  withdrawal_debit: 'برداشت نهایی',
  reversal: 'برگشت',
  adjustment: 'اصلاح',
  transfer: 'انتقال',
  benefit_transfer_out: 'خروج موجودی به‌خاطر انتقال مزایا',
  benefit_transfer_in: 'ورود موجودی از انتقال مزایا',
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

const statusLabelEn: Record<string, string> = {
  pending_inspection: 'Pending document review (senior manager)',
  pending_shaparak: 'Pending Shaparak confirmation',
  submitted: 'Documents submitted',
  inspected: 'Documents inspected',
  shaparak_confirmed: 'Gateway confirmed',
  commission_posted: 'Commission posted',
  successful: 'Successful',
  posted: 'Posted',
  requested: 'Requested',
  senior_manager_pending: 'Pending senior manager',
  superuser_pending: 'Pending system manager',
  processing: 'Processing',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  failed: 'Failed',
  pending: 'Pending',
  verified: 'Verified',
  paid: 'Paid',
  approved: 'Approved',
  active: 'Active',
  used: 'Used',
  not_started: 'Not started',
  completed_level: 'Passed',
  failed_level: 'Failed',
  commission_credit: 'Commission credit',
  monthly_bonus: 'Monthly bonus',
  monthly_bonus_residual: 'Extra bonus credit',
  monthly_bonus_reversal: 'Bonus reversal',
  withdrawal_hold: 'Withdrawal hold',
  withdrawal_release: 'Hold released',
  withdrawal_debit: 'Final withdrawal',
  reversal: 'Reversal',
  adjustment: 'Adjustment',
  transfer: 'Transfer',
  benefit_transfer_out: 'Wallet outflow from benefit transfer',
  benefit_transfer_in: 'Wallet inflow from benefit transfer',
  all_future_benefits: 'All future benefits',
  gateway_share: 'Gateway share transfer',
  descendant: 'Downline',
  ancestor: 'Upline',
  self: 'Self',
  unrelated: 'Unrelated',
  processed: 'Processed',
  inbound: 'Inbound',
  outbound: 'Outbound',
}

export function label(value?: string | null) {
  if (!value) return '—'
  const en = currentLocale() === 'en'
  const status = en ? statusLabelEn : statusLabel
  const audit = en ? auditLabelEn : auditLabel
  return status[value] ?? audit[value] ?? value
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
  'senior_manager.gateway.inspect': 'مدیر ارشد / تایید درگاه و ثبت کد مرچنت فاینوپال',
  'superuser.commission_rules.update': 'مدیر سامانه / ویرایش قواعد پورسانت',
  'superuser.gateway.create': 'مدیر سامانه / ثبت فروش درگاه',
  'chat.cross_branch.message': 'چت بین‌شاخه‌ای',
  'page.dashboard': 'صفحه / داشبورد',
  'page.team': 'صفحه / شبکه و تیم',
  'page.gateways': 'صفحه / درگاه‌ها',
  'page.commissions': 'صفحه / پورسانت',
  'page.monthly_bonus': 'صفحه / پاداش ماهانه',
  'page.points': 'صفحه / مانیتورینگ امتیاز',
  'page.wallet': 'صفحه / کیف پول',
  'page.finance': 'صفحه / گزارش تجمیعی',
  'page.withdrawals': 'صفحه / برداشت',
  'page.transfers': 'صفحه / انتقال مالکیت مزایا',
  'page.referrals': 'صفحه / لینک معرف و اشتراکی',
  'page.promotions': 'صفحه / ارتقاء سمت',
  'page.training': 'صفحه / آموزش',
  'page.courses_manage': 'صفحه / مدیریت دوره‌ها',
  'page.chat': 'صفحه / گفتگو',
  'page.notifications': 'صفحه / اعلان‌ها',
}

const criterionLabelFa: Record<string, string> = {
  personal_points: 'امتیاز فروش شخصی',
  new_representatives: 'ثبت‌نام نمایندگان جدید',
  strong_representatives: 'نمایندگان با امتیاز بالا',
  senior_assessment: 'مصاحبه و تایید مدیر ارشد',
  tenure_years: 'سابقه مدیر فروش',
  registered_reps: 'مجموع نمایندگان ثبت‌شده',
  strong_reps: 'نمایندگان قوی',
  team_satisfaction: 'رضایت نمایندگان تیم',
  eligible_sales_managers: 'نمایندگان معرفی‌شده آماده مدیر فروش',
  required_training: 'تکمیل دوره‌های الزامی نقش',
}

const criterionLabelEn: Record<string, string> = {
  personal_points: 'Personal sales points',
  new_representatives: 'New representatives',
  strong_representatives: 'High-point representatives',
  senior_assessment: 'Senior manager interview',
  tenure_years: 'Sales-manager tenure',
  registered_reps: 'Registered representatives',
  strong_reps: 'Strong representatives',
  team_satisfaction: 'Team satisfaction',
  eligible_sales_managers: 'Referred reps ready for sales manager',
  required_training: 'Required role training',
}

export const criterionLabel: Record<string, string> = new Proxy({}, {
  get: (_t, key: string) => (currentLocale() === 'en' ? criterionLabelEn : criterionLabelFa)[key] ?? key,
}) as Record<string, string>

const criterionHintFa: Record<string, string> = {
  eligible_sales_managers: 'از افرادی که این شخص معرفی کرده، چند نفر همه شرط‌های عددی و آموزشی ارتقاء به مدیر فروش را دارند. مصاحبه مدیر ارشد در این شمارش نیست. حد نصاب پیش‌فرض ۲ نفر است.',
}

const criterionHintEn: Record<string, string> = {
  eligible_sales_managers: 'How many people this person referred already meet every numeric and training condition for sales manager. The senior interview is not counted. Default threshold is 2.',
}

export const criterionHint: Record<string, string> = new Proxy({}, {
  get: (_t, key: string) => (currentLocale() === 'en' ? criterionHintEn : criterionHintFa)[key] ?? '',
}) as Record<string, string>

/** Years stored as a fraction (1.015 = a little over one year) shown as years and days. */
export function formatTenure(years: number) {
  const totalDays = Math.max(0, Math.round(Number(years) * 365))
  const y = Math.floor(totalDays / 365)
  const d = totalDays % 365
  const n = (value: number) => value.toLocaleString(localeTag())
  if (currentLocale() === 'en') {
    const year = `${n(y)} year${y === 1 ? '' : 's'}`
    if (d === 0) return year
    return `${year}, ${n(d)} day${d === 1 ? '' : 's'}`
  }
  if (y === 0) return `${n(d)} روز`
  if (d === 0) return `${n(y)} سال`
  return `${n(y)} سال و ${n(d)} روز`
}

export const settingLabel: Record<string, string> = {
  qualification_thresholds: 'آستانه‌های پاداش ماهانه',
  promotion_criteria: 'معیارهای ارتقاء سازمانی',
  shared_link_features: 'لینک‌های اشتراکی',
}

const auditLabelEn: Record<string, string> = {
  'withdrawal.requested': 'Withdrawal requested',
  'withdrawal.approved': 'Withdrawal approved',
  'withdrawal.rejected': 'Withdrawal rejected',
  'promotion.approved': 'Promotion approved',
  'promotion.rejected': 'Promotion rejected',
  'user.created': 'User created',
  'role.assigned': 'Role assigned',
  'permission.role_assigned': 'Role permission granted',
  'permission.role_revoked': 'Role permission revoked',
  'permission.user_override': 'User permission granted',
  'permission.user_revoked': 'User permission revoked',
  'setting.updated': 'Setting updated',
  'commission_rule.versioned': 'Commission rule saved',
  'user.updated': 'User updated',
  'user.deleted': 'User deactivated',
  'user.blocked': 'User blocked',
  'user.unblocked': 'User unblocked',
  'course.updated': 'Course updated',
  'course.deleted': 'Course deleted',
  'benefit_transfer.all': 'Full benefit transfer',
  'benefit_transfer.share': 'Gateway share transfer',
  'gateway.submitted': 'Gateway submitted for inspection',
  'gateway.approved': 'Gateway approved with merchant code',
  'gateway.rejected': 'Gateway rejected',
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
  'user.blocked': 'مسدودسازی کاربر',
  'user.unblocked': 'رفع مسدودی کاربر',
  'course.updated': 'ویرایش دوره',
  'course.deleted': 'حذف دوره',
  'benefit_transfer.all': 'انتقال کامل مزایا',
  'benefit_transfer.share': 'انتقال سهم درگاه',
  'gateway.submitted': 'ثبت درگاه برای بازرسی',
  'gateway.approved': 'تایید درگاه با کد مرچنت فاینوپال',
  'gateway.rejected': 'رد درگاه',
}

export const entityLabel: Record<string, string> = {
  User: 'کاربر',
  Role: 'نقش',
  Course: 'دوره آموزشی',
  SystemSetting: 'تنظیمات',
  CommissionRule: 'قاعده پورسانت',
  WithdrawalRequest: 'برداشت',
  PromotionRequest: 'ارتقاء',
  GatewaySale: 'فروش درگاه',
}

export function entityName(type?: string | null) {
  if (!type) return 'سامانه'
  const short = type.split('\\').pop() ?? type
  return entityLabel[short] ?? short
}
