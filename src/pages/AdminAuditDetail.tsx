import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ExportBar } from '../components/ExportBar'
import { Badge, DateTimeText, Empty, PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { auditLabel, dateTimeExport, entityName, formatExportValue, isDateLike } from '../lib/format'

const fieldNames: Record<string, string> = {
  name: 'نام',
  mobile: 'موبایل',
  email: 'ایمیل',
  is_active: 'فعال',
  title: 'عنوان',
  description: 'شرح',
  percent: 'درصد پایه',
  qualified_percent: 'درصد پاداش ماهانه',
  role: 'نقش',
  role_id: 'شناسه نقش',
  permission_id: 'شناسه دسترسی',
  allowed: 'مجاز',
  value: 'مقدار',
  soft: 'حذف نرم',
  version: 'نسخه',
  created_at: 'تاریخ ایجاد',
  updated_at: 'تاریخ به‌روزرسانی',
  effective_from: 'از تاریخ',
  effective_to: 'تا تاریخ',
  requested_at: 'تاریخ درخواست',
  completed_at: 'تاریخ تکمیل',
}

function pretty(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر'
  if (isDateLike(value)) return dateTimeExport(value).replace('\u200E', '')
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function ValueView({ value }: { value: unknown }) {
  if (isDateLike(value)) return <DateTimeText value={value} />
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([key]) => !['password', 'remember_token'].includes(key))
    if (entries.length === 0) return <span>—</span>
    return (
      <dl>
        {entries.map(([key, item]) => (
          <div className="kv" key={key}>
            <dt>{fieldNames[key] ?? key}</dt>
            <dd className="font-normal text-sm"><ValueView value={item} /></dd>
          </div>
        ))}
      </dl>
    )
  }
  return <pre className="m-0 whitespace-pre-wrap text-sm">{pretty(value)}</pre>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function labeled(key: string) {
  return fieldNames[key] ?? key
}

export function AdminAuditDetail() {
  const { id } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['audit', id],
    queryFn: async () => (await api.get(`/superuser/audits/${id}`)).data,
    enabled: Boolean(id),
  })

  if (isLoading) return <div className="p-6">در حال بارگذاری جزئیات رویداد...</div>
  if (!data) return <Empty text="رویداد پیدا نشد." />

  const oldValues = asRecord(data.old_values)
  const newValues = asRecord(data.new_values)
  const keys = Array.from(new Set([...Object.keys(oldValues), ...Object.keys(newValues)]))
  const related = data.related && typeof data.related === 'object' ? data.related as Record<string, unknown> : null
  const relatedEntries = related
    ? Object.entries(related).filter(([key]) => !['password', 'remember_token'].includes(key))
    : []
  const history = (data.history ?? []) as Array<{ id: number; action: string; action_label?: string; created_at: string; actor?: { name: string; mobile?: string } }>

  const sheets = [
    {
      title: 'خلاصه رویداد',
      rows: [
        { فیلد: 'شناسه رویداد', مقدار: data.id },
        { فیلد: 'اقدام', مقدار: data.action_label ?? auditLabel[data.action] ?? data.action },
        { فیلد: 'کد اقدام', مقدار: data.action },
        { فیلد: 'عامل', مقدار: data.actor?.name ?? 'سامانه' },
        { فیلد: 'موبایل عامل', مقدار: data.actor?.mobile ?? '' },
        { فیلد: 'ایمیل عامل', مقدار: data.actor?.email ?? '' },
        { فیلد: 'نوع موجودیت', مقدار: data.entity_label ?? entityName(data.auditable_type) },
        { فیلد: 'شناسه موجودیت', مقدار: data.auditable_id ?? '' },
        { فیلد: 'وضعیت موجودیت', مقدار: related ? 'موجود در سامانه' : 'حذف‌شده یا بدون رکورد جاری' },
        { فیلد: 'زمان', مقدار: dateTimeExport(data.created_at) },
        { فیلد: 'آی‌پی', مقدار: data.ip_address ?? '' },
        { فیلد: 'مرورگر', مقدار: data.user_agent ?? '' },
      ],
    },
    {
      title: 'تغییرات',
      rows: keys.map((key) => ({
        فیلد: labeled(key),
        'مقدار قبلی': formatExportValue(oldValues[key]),
        'مقدار جدید': formatExportValue(newValues[key]),
      })),
    },
    {
      title: 'وضعیت فعلی',
      rows: relatedEntries.map(([key, value]) => ({
        فیلد: labeled(key),
        مقدار: formatExportValue(value),
      })),
    },
    {
      title: 'تاریخچه موجودیت',
      rows: history.map((row) => ({
        شناسه: row.id,
        اقدام: row.action_label ?? auditLabel[row.action] ?? row.action,
        عامل: row.actor?.name ?? 'سامانه',
        زمان: dateTimeExport(row.created_at),
      })),
    },
  ]

  return (
    <div className="grid gap-4" data-testid="audit-detail">
      <PageHeader
        title={data.action_label ?? auditLabel[data.action] ?? data.action}
        subtitle={`رویداد شماره ${data.id} · ${entityName(data.auditable_type)} ${data.auditable_id ?? ''}`}
        action={<Link className="btn btn-ghost" to="/superuser/audits">بازگشت به فهرست</Link>}
      />

      <ExportBar filename={`رویداد-${data.id}`} sheets={sheets} testId="audit-detail-export" />

      <div className="flex flex-wrap gap-2">
        <Badge>{data.action}</Badge>
        <Badge tone="info">{data.entity_label ?? entityName(data.auditable_type)}</Badge>
        {data.ip_address && <Badge tone="muted">{data.ip_address}</Badge>}
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <div className="card p-5">
          <div className="font-bold mb-3">عامل و زمان</div>
          <dl>
            <div className="kv"><dt>عامل</dt><dd>{data.actor?.name ?? 'سامانه'}</dd></div>
            <div className="kv"><dt>موبایل عامل</dt><dd>{data.actor?.mobile ?? '—'}</dd></div>
            <div className="kv"><dt>ایمیل عامل</dt><dd>{data.actor?.email ?? '—'}</dd></div>
            <div className="kv"><dt>زمان</dt><dd><DateTimeText value={data.created_at} /></dd></div>
            <div className="kv"><dt>آی‌پی</dt><dd>{data.ip_address ?? '—'}</dd></div>
            <div className="kv"><dt>مرورگر</dt><dd className="text-sm font-normal">{data.user_agent ?? '—'}</dd></div>
          </dl>
        </div>
        <div className="card p-5">
          <div className="font-bold mb-3">موجودیت هدف</div>
          <dl>
            <div className="kv"><dt>نوع</dt><dd>{data.entity_label ?? entityName(data.auditable_type)}</dd></div>
            <div className="kv"><dt>شناسه</dt><dd>{data.auditable_id ?? '—'}</dd></div>
            <div className="kv"><dt>کد اقدام</dt><dd>{data.action}</dd></div>
            <div className="kv"><dt>وضعیت موجودیت</dt><dd>{related ? 'هنوز در سامانه موجود است' : 'حذف شده یا بدون رکورد جاری'}</dd></div>
          </dl>
        </div>
      </div>

      <div className="card overflow-auto">
        <div className="px-4 pt-4 font-bold">مقایسه تغییرات</div>
        <table className="table">
          <thead><tr><th>فیلد</th><th>مقدار قبلی</th><th>مقدار جدید</th></tr></thead>
          <tbody>
            {keys.length === 0 && <tr><td colSpan={3}>تغییر فیلدی ثبت نشده است.</td></tr>}
            {keys.map((key) => (
              <tr key={key}>
                <td>{labeled(key)}</td>
                <td><ValueView value={oldValues[key]} /></td>
                <td><ValueView value={newValues[key]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {related && (
        <div className="card p-5">
          <div className="font-bold mb-3">وضعیت فعلی موجودیت</div>
          <dl>
            {relatedEntries.map(([key, value]) => (
              <div className="kv" key={key}>
                <dt>{labeled(key)}</dt>
                <dd className="font-normal text-sm"><ValueView value={value} /></dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="card overflow-auto">
        <div className="px-4 pt-4 font-bold">سایر رویدادهای همین موجودیت</div>
        <table className="table">
          <thead><tr><th>شناسه</th><th>اقدام</th><th>عامل</th><th>زمان</th></tr></thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.id === data.id ? <Badge>{row.action_label ?? row.action}</Badge> : <Link to={`/superuser/audits/${row.id}`}>{row.action_label ?? auditLabel[row.action] ?? row.action}</Link>}</td>
                <td>{row.actor?.name ?? 'سامانه'}</td>
                <td><DateTimeText value={row.created_at} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
