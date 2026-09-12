import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ExportBar } from '../components/ExportBar'
import { JalaliDatePicker } from '../components/JalaliDatePicker'
import { Badge, DateTimeText, Empty, FieldHint, Modal, PageHeader, StatCard } from '../components/ui'
import { api } from '../lib/api'
import { auditLabel, dateTimeExport, entityName, money, permissionLabel, percent, settingLabel } from '../lib/format'

type RoleRow = { id: number; name: string; slug: string; is_organizational?: boolean; permissions?: Array<{ id: number; pivot?: { allowed?: boolean | number | string } }> }
type UserRow = { id: number; name: string; mobile: string; email?: string | null; is_active: boolean; created_at?: string; roles?: Array<{ name: string; slug: string }> }
type CourseLevel = { id?: number; title: string; sort_order: number; passing_score: number }
type CourseRow = { id: number; title: string; description?: string; is_required_for_promotion: boolean; is_active?: boolean; levels?: CourseLevel[]; roles?: Array<{ id: number; name: string }> }
type SettingField = { key: string; label: string; hint?: string; type: string }
type SettingSchema = Record<string, { label: string; hint?: string; fields: SettingField[] }>

const emptyUser = { name: '', mobile: '', email: '', password: 'Password123!', is_active: true, role_slugs: ['representative'] }
const emptyCourse = { title: '', description: '', is_required_for_promotion: true, role_ids: [] as number[], levels: [{ title: 'سطح ۱', sort_order: 1, passing_score: 70 }] }

function isGranted(role: RoleRow, permissionId: number) {
  return Boolean(role.permissions?.some((x) => x.id === permissionId && (x.pivot?.allowed === true || x.pivot?.allowed === 1 || x.pivot?.allowed === '1')))
}

function oneDecimal(value: string | number | null | undefined) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? String(Math.round(n * 10) / 10) : '0'
}

export function AdminHome() {
  const { data } = useQuery({ queryKey: ['stats'], queryFn: async () => (await api.get('/superuser/stats')).data })
  const cards = [
    ['users', data?.users],
    ['active_users', data?.active_users],
    ['sales', data?.sales],
    ['commission_total', data?.commission_total],
    ['wallets', data?.wallets],
    ['wallet_balance', data?.wallet_balance],
  ] as const

  return (
    <div>
      <PageHeader
        title="آمار کل سامانه"
        subtitle="نمای سریع مدیریت. جزئیات کامل در صفحه گزارشات است."
        action={<Link className="btn btn-primary" to="/superuser/reports">مشاهده گزارشات کامل</Link>}
      />
      <div className="grid md:grid-cols-3 gap-3" data-testid="admin-stats">
        {cards.map(([key, value]) => (
          <StatCard
            key={key}
            title={data?.labels?.[key] ?? settingLabel[key] ?? key}
            value={key.includes('total') || key.includes('balance') ? money(value as number) : value ?? 0}
          />
        ))}
      </div>
    </div>
  )
}

export function AdminUsers() {
  const qc = useQueryClient()
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get('/superuser/roles')).data })
  const [search, setSearch] = useState('')
  const { data } = useQuery({ queryKey: ['admin-users', search], queryFn: async () => (await api.get('/superuser/users', { params: { q: search || undefined } })).data })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [form, setForm] = useState(emptyUser)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyUser)
    setOpen(true)
  }
  const openEdit = (user: UserRow) => {
    setEditing(user)
    setForm({
      name: user.name,
      mobile: user.mobile,
      email: user.email ?? '',
      password: '',
      is_active: user.is_active,
      role_slugs: user.roles?.map((r) => r.slug) ?? ['representative'],
    })
    setOpen(true)
  }

  const save = async () => {
    if (editing) {
      await api.put(`/superuser/users/${editing.id}`, { ...form, password: form.password || undefined })
      toast.success('کاربر ویرایش شد')
    } else {
      await api.post('/superuser/users', form)
      toast.success('کاربر ایجاد شد')
    }
    setOpen(false)
    qc.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const remove = async (user: UserRow) => {
    if (!confirm(`حساب «${user.name}» حذف شود؟ اگر سابقه مالی داشته باشد فقط غیرفعال می‌شود.`)) return
    const { data: result } = await api.delete(`/superuser/users/${user.id}`)
    toast.success(result?.message ?? 'کاربر حذف شد')
    qc.invalidateQueries({ queryKey: ['admin-users'] })
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="کاربران و نقش‌ها"
        subtitle="ایجاد، ویرایش، فعال/غیرفعال و حذف حساب‌ها با شناسه عددی یکتا."
        action={<button className="btn btn-primary" onClick={openCreate}>کاربر جدید</button>}
      />
      <div className="card p-4">
        <label className="field">جستجو
          <input className="input" placeholder="نام، موبایل یا شناسه" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      <div className="card overflow-auto" data-testid="admin-users">
        <table className="table">
          <thead><tr><th>شناسه</th><th>نام</th><th>موبایل</th><th>نقش‌ها</th><th>وضعیت</th><th>تاریخ ایجاد</th><th>اقدام</th></tr></thead>
          <tbody>
            {(data?.data ?? []).map((u: UserRow) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.mobile}</td>
                <td>{u.roles?.map((r) => r.name).join('، ')}</td>
                <td><Badge tone={u.is_active ? 'ok' : 'danger'}>{u.is_active ? 'فعال' : 'غیرفعال'}</Badge></td>
                <td><DateTimeText value={u.created_at} /></td>
                <td className="flex gap-2">
                  <button className="btn btn-ghost" onClick={() => openEdit(u)}>ویرایش</button>
                  <button className="btn btn-danger" onClick={() => remove(u)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} title={editing ? 'ویرایش کاربر' : 'ایجاد کاربر'} subtitle="یک حساب می‌تواند چند نقش همزمان داشته باشد." onClose={() => setOpen(false)}>
        <form className="grid gap-3" data-testid="user-form" onSubmit={async (e) => { e.preventDefault(); try { await save() } catch { toast.error('ثبت کاربر ناموفق بود') } }}>
          <label className="field">نام<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label className="field">موبایل<input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required /></label>
          <label className="field">ایمیل<input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="field">{editing ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'}
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            حساب فعال باشد
          </label>
          <div className="field">نقش‌ها
            <div className="flex flex-wrap gap-2">
              {(roles ?? []).map((r: { slug: string; name: string }) => (
                <label key={r.slug} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.role_slugs.includes(r.slug)} onChange={(e) => {
                    setForm({
                      ...form,
                      role_slugs: e.target.checked ? [...form.role_slugs, r.slug] : form.role_slugs.filter((s) => s !== r.slug),
                    })
                  }} />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" type="submit">{editing ? 'ذخیره تغییرات' : 'ایجاد کاربر'}</button>
        </form>
      </Modal>
    </div>
  )
}

export function AdminPermissions() {
  const qc = useQueryClient()
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get('/superuser/roles')).data })
  const { data: perms } = useQuery({ queryKey: ['perms'], queryFn: async () => (await api.get('/superuser/permissions')).data })
  const assign = useMutation({
    mutationFn: async (payload: { role_id: number; permission_id: number; allowed: boolean }) =>
      api.post('/superuser/permissions/assign', payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['roles'] })
      const previous = qc.getQueryData<RoleRow[]>(['roles'])
      qc.setQueryData<RoleRow[]>(['roles'], (roles) => (roles ?? []).map((role) => {
        if (role.id !== payload.role_id) return role
        const current = role.permissions ?? []
        if (payload.allowed) {
          const exists = current.some((p) => p.id === payload.permission_id)
          return {
            ...role,
            permissions: exists
              ? current.map((p) => p.id === payload.permission_id ? { ...p, pivot: { allowed: true } } : p)
              : [...current, { id: payload.permission_id, pivot: { allowed: true } }],
          }
        }
        return { ...role, permissions: current.filter((p) => p.id !== payload.permission_id) }
      }))
      return { previous }
    },
    onSuccess: (res, payload) => {
      if (res.data?.roles) qc.setQueryData(['roles'], res.data.roles)
      toast.success(payload.allowed ? 'دسترسی اعطا شد' : 'دسترسی سلب شد')
    },
    onError: (_err, _payload, ctx) => {
      if (ctx?.previous) qc.setQueryData(['roles'], ctx.previous)
      toast.error('تغییر دسترسی انجام نشد')
    },
  })

  const orgRoles = (roles ?? []).filter((r: RoleRow) => r.slug !== 'superuser')

  return (
    <div>
      <PageHeader title="تعیین دسترسی نقش‌ها" subtitle="با هر تیک، دسترسی همان نقش فعال یا سلب می‌شود. سوپریوزر همیشه دسترسی کامل دارد." />
      <div className="card overflow-auto p-2" data-testid="permissions-admin">
        <table className="table">
          <thead>
            <tr>
              <th>دسترسی</th>
              {orgRoles.map((r: RoleRow) => <th key={r.id}>{r.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {(perms ?? []).map((p: { id: number; slug: string; name: string }) => (
              <tr key={p.id} data-testid={`perm-${p.slug}`}>
                <td>
                  <div className="font-medium">{permissionLabel[p.slug] ?? p.name}</div>
                  <div className="text-xs text-[var(--muted)]">{p.slug}</div>
                </td>
                {orgRoles.map((r: RoleRow) => {
                  const allowed = isGranted(r, p.id)
                  return (
                    <td key={`${r.id}-${p.id}`}>
                      <input
                        type="checkbox"
                        data-testid={`perm-toggle-${r.slug}-${p.slug}`}
                        checked={allowed}
                        onChange={(e) => assign.mutate({ role_id: r.id, permission_id: p.id, allowed: e.target.checked })}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminRules() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['rules'], queryFn: async () => (await api.get('/superuser/commission-rules')).data })
  const [drafts, setDrafts] = useState<Record<number, { percent: string; qualified_percent: string }>>({})

  return (
    <div>
      <PageHeader title="قواعد و درصدهای پورسانت" subtitle="هر ذخیره یک نسخه تاریخ‌دار می‌سازد؛ محاسبات قبلی عوض نمی‌شوند. درصدها با یک رقم اعشار ذخیره می‌شوند." />
      <div className="grid gap-3" data-testid="commission-rules">
        {(data ?? []).map((r: { id: number; name: string; default_percent: string; versions?: Array<{ percent: string; qualified_percent?: string; version: number }> }) => {
          const current = r.versions?.[r.versions.length - 1]
          const draft = drafts[r.id] ?? {
            percent: oneDecimal(current?.percent ?? r.default_percent),
            qualified_percent: oneDecimal(current?.qualified_percent ?? current?.percent ?? r.default_percent),
          }
          return (
            <form key={r.id} className="card rule-card" onSubmit={async (e) => {
              e.preventDefault()
              await api.post(`/superuser/commission-rules/${r.id}`, {
                percent: Number(oneDecimal(draft.percent)),
                qualified_percent: Number(oneDecimal(draft.qualified_percent)),
              })
              toast.success('ذخیره شد')
              qc.invalidateQueries({ queryKey: ['rules'] })
            }}>
              <div className="rule-card-head">
                <div>
                  <div className="font-extrabold">{r.name}</div>
                  <div className="text-xs text-[var(--muted)]">نسخه جاری {current?.version ?? 1} · پایه {percent(current?.percent ?? r.default_percent)}</div>
                </div>
                <button className="btn btn-primary" type="submit">ذخیره</button>
              </div>
              <div className="rule-fields">
                <label className="field">درصد پایه
                  <input className="input" type="number" step="0.1" value={draft.percent} onChange={(e) => setDrafts({ ...drafts, [r.id]: { ...draft, percent: e.target.value } })} />
                  <FieldHint>درصد پیش‌فرض همین نقش قبل از رسیدن به حد نصاب پاداش.</FieldHint>
                </label>
                <label className="field">درصد از پاداش
                  <input className="input" type="number" step="0.1" value={draft.qualified_percent} onChange={(e) => setDrafts({ ...drafts, [r.id]: { ...draft, qualified_percent: e.target.value } })} />
                  <FieldHint>درصدی که بعد از رسیدن به حد نصاب پاداش، از مبلغ پاداش محاسبه می‌شود.</FieldHint>
                </label>
              </div>
            </form>
          )
        })}
      </div>
    </div>
  )
}

export function AdminCourses() {
  const qc = useQueryClient()
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get('/superuser/roles')).data })
  const { data } = useQuery({ queryKey: ['admin-courses'], queryFn: async () => (await api.get('/superuser/courses')).data })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CourseRow | null>(null)
  const [form, setForm] = useState(emptyCourse)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyCourse)
    setOpen(true)
  }
  const openEdit = (course: CourseRow) => {
    setEditing(course)
    setForm({
      title: course.title,
      description: course.description ?? '',
      is_required_for_promotion: course.is_required_for_promotion,
      role_ids: course.roles?.map((r) => r.id) ?? [],
      levels: (course.levels ?? []).map((l, i) => ({ id: l.id, title: l.title, sort_order: l.sort_order ?? i + 1, passing_score: Number(l.passing_score) })),
    })
    setOpen(true)
  }

  const save = async () => {
    const payload = { ...form, levels: form.levels.map((l, i) => ({ ...l, sort_order: i + 1 })) }
    if (editing) {
      await api.put(`/superuser/courses/${editing.id}`, payload)
      toast.success('دوره ویرایش شد')
    } else {
      await api.post('/superuser/courses', payload)
      toast.success('دوره ساخته شد')
    }
    setOpen(false)
    qc.invalidateQueries({ queryKey: ['admin-courses'] })
  }

  const remove = async (course: CourseRow) => {
    if (!confirm(`دوره «${course.title}» حذف شود؟`)) return
    await api.delete(`/superuser/courses/${course.id}`)
    toast.success('دوره حذف شد')
    qc.invalidateQueries({ queryKey: ['admin-courses'] })
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="دوره‌ها و سطوح پویا"
        subtitle="هر دوره چند سطح و چند نقش هدف دارد. نمره قبولی همان حد نصاب آزمون سطح است."
        action={<button className="btn btn-primary" onClick={openCreate}>دوره جدید</button>}
      />
      {(data ?? []).map((c: CourseRow) => (
        <div key={c.id} className="card p-4 flex flex-wrap justify-between gap-3">
          <div>
            <div className="font-extrabold">{c.title}</div>
            <div className="text-sm text-[var(--muted)]">{c.description || 'بدون شرح'}</div>
            <div className="mt-2 flex gap-2 flex-wrap">{c.roles?.map((r) => <Badge key={r.name}>{r.name}</Badge>)}</div>
            <div className="text-sm mt-2">سطوح: {c.levels?.map((l) => `${l.title} (قبولی ${l.passing_score})`).join('، ') || '—'}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => openEdit(c)}>ویرایش</button>
            <button className="btn btn-danger" onClick={() => remove(c)}>حذف</button>
          </div>
        </div>
      ))}
      {(!data || data.length === 0) && <Empty text="دوره‌ای ثبت نشده است." />}
      <Modal wide open={open} title={editing ? 'ویرایش دوره' : 'ایجاد دوره'} subtitle="سطح‌ها را با عنوان، نمره قبولی و ترتیب مشخص کنید." onClose={() => setOpen(false)}>
        <form className="grid gap-3" data-testid="course-form" onSubmit={async (e) => { e.preventDefault(); await save() }}>
          <label className="field">عنوان دوره
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <label className="field">شرح دوره
            <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_required_for_promotion} onChange={(e) => setForm({ ...form, is_required_for_promotion: e.target.checked })} />
            برای ارتقاء الزامی باشد
          </label>
          <div className="field">نقش‌های هدف
            <FieldHint>دوره فقط برای نقش‌های انتخاب‌شده در پنل آموزش دیده می‌شود.</FieldHint>
            <div className="flex flex-wrap gap-3">
              {(roles ?? []).filter((r: { is_organizational: boolean }) => r.is_organizational).map((r: { id: number; name: string }) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.role_ids.includes(r.id)} onChange={(e) => setForm({ ...form, role_ids: e.target.checked ? [...form.role_ids, r.id] : form.role_ids.filter((id) => id !== r.id) })} />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            <div className="font-bold">سطح‌های دوره</div>
            {form.levels.map((level, i) => (
              <div key={i} className="card p-3 grid md:grid-cols-3 gap-3">
                <label className="field">عنوان سطح
                  <input className="input" value={level.title} onChange={(e) => setForm({ ...form, levels: form.levels.map((l, idx) => idx === i ? { ...l, title: e.target.value } : l) })} />
                  <FieldHint>مثلاً آشنایی با محصول یا آزمون عملی</FieldHint>
                </label>
                <label className="field">نمره قبولی (از ۱۰۰)
                  <input className="input" type="number" min={0} max={100} value={level.passing_score} onChange={(e) => setForm({ ...form, levels: form.levels.map((l, idx) => idx === i ? { ...l, passing_score: Number(e.target.value) } : l) })} />
                  <FieldHint>حداقل نمره‌ای که کاربر باید بگیرد تا این سطح قبول شود. مقدار ۷۰ یعنی نمره ۷۰ از ۱۰۰.</FieldHint>
                </label>
                <div className="flex items-end">
                  <button type="button" className="btn btn-ghost w-full" onClick={() => setForm({ ...form, levels: form.levels.filter((_, idx) => idx !== i) })}>حذف سطح</button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-ghost w-fit" onClick={() => setForm({ ...form, levels: [...form.levels, { title: `سطح ${form.levels.length + 1}`, sort_order: form.levels.length + 1, passing_score: 70 }] })}>افزودن سطح جدید</button>
          </div>
          <button className="btn btn-primary" type="submit">{editing ? 'ذخیره تغییرات' : 'ثبت دوره'}</button>
        </form>
      </Modal>
    </div>
  )
}

export function AdminSettings() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get('/superuser/settings')).data })
  const items = Array.isArray(data) ? data : data?.items ?? []
  const schema: SettingSchema = data?.schema ?? {}
  const [edits, setEdits] = useState<Record<string, Record<string, string | number>>>({})

  return (
    <div className="grid gap-3">
      <PageHeader title="تنظیمات سامانه" subtitle="مقادیر را با فیلدهای مشخص و راهنما تغییر دهید؛ نیازی به ویرایش خام نیست." />
      {items.map((s: { id: number; key: string; value: Record<string, unknown> }) => {
        const meta = schema[s.key]
        const current = edits[s.key] ?? Object.fromEntries(Object.entries(s.value ?? {}).map(([k, v]) => [k, v as string | number]))
        const fields = meta?.fields ?? Object.keys(s.value ?? {}).map((key) => ({ key, label: key, type: 'number' }))
        return (
          <form key={s.id} className="card p-5 grid gap-3" data-testid={`setting-${s.key}`} onSubmit={async (e) => {
            e.preventDefault()
            const value = Object.fromEntries(fields.map((f) => [f.key, f.type === 'number' ? Number(current[f.key] ?? 0) : current[f.key]]))
            await api.post('/superuser/settings', { key: s.key, value })
            toast.success('تنظیمات ذخیره شد')
            qc.invalidateQueries({ queryKey: ['settings'] })
          }}>
            <div>
              <div className="font-bold">{meta?.label ?? settingLabel[s.key] ?? s.key}</div>
              {meta?.hint && <FieldHint>{meta.hint}</FieldHint>}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {fields.map((field) => (
                <label key={field.key} className="field">
                  {field.label}
                  <input
                    className="input"
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={current[field.key] ?? ''}
                    onChange={(e) => setEdits({ ...edits, [s.key]: { ...current, [field.key]: e.target.value } })}
                  />
                  {field.hint && <FieldHint>{field.hint}</FieldHint>}
                </label>
              ))}
            </div>
            <button className="btn btn-primary w-fit" type="submit">ذخیره</button>
          </form>
        )
      })}
      {items.length === 0 && <Empty text="تنظیماتی ثبت نشده است." />}
    </div>
  )
}

type AuditRow = {
  id: number
  action: string
  action_label?: string
  entity_label?: string
  auditable_type?: string
  auditable_id?: number
  ip_address?: string
  user_agent?: string
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  created_at: string
  actor?: { name: string; mobile?: string }
}

function auditSheets(rows: AuditRow[]) {
  return [{
    title: 'رویدادها',
    rows: rows.map((a) => ({
      شناسه: a.id,
      اقدام: a.action_label ?? auditLabel[a.action] ?? a.action,
      کد: a.action,
      عامل: a.actor?.name ?? 'سامانه',
      موبایل: a.actor?.mobile ?? '',
      موجودیت: a.entity_label ?? entityName(a.auditable_type),
      'شناسه موجودیت': a.auditable_id ?? '',
      آی‌پی: a.ip_address ?? '',
      مرورگر: a.user_agent ?? '',
      زمان: dateTimeExport(a.created_at),
      'مقدار قبلی': a.old_values ? JSON.stringify(a.old_values) : '',
      'مقدار جدید': a.new_values ? JSON.stringify(a.new_values) : '',
    })),
  }]
}

export function AdminAudits() {
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const filters = { action: action || undefined, from: from || undefined, to: to || undefined }
  const { data } = useQuery({
    queryKey: ['audits', action, from, to],
    queryFn: async () => (await api.get('/superuser/audits', { params: filters })).data,
  })
  const { data: exportLogs } = useQuery({
    queryKey: ['audits-export', action, from, to],
    queryFn: async () => (await api.get('/superuser/audits/export', { params: filters })).data,
  })

  return (
    <div className="grid gap-4">
      <PageHeader
        title="گزارش رویدادها"
        subtitle="لاگ کامل اقدامات حساس سامانه. اگر فیلتر بگذارید، همان نتایج در خروجی هم می‌آید."
        action={<ExportBar filename="رویدادها" sheets={auditSheets(exportLogs?.data ?? data?.data ?? [])} testId="audit-export" />}
      />
      <form className="card p-4 grid md:grid-cols-3 gap-3" onSubmit={(e) => e.preventDefault()}>
        <label className="field">نوع اقدام
          <input className="input" placeholder="مثلا user یا withdrawal" value={action} onChange={(e) => setAction(e.target.value)} />
        </label>
        <label className="field">از تاریخ
          <JalaliDatePicker value={from} onChange={setFrom} />
        </label>
        <label className="field">تا تاریخ
          <JalaliDatePicker value={to} onChange={setTo} />
        </label>
      </form>
      <div className="card overflow-auto" data-testid="audit-log">
        <table className="table">
          <thead><tr><th>اقدام</th><th>عامل</th><th>موجودیت</th><th>شناسه</th><th>آی‌پی</th><th>زمان</th><th></th></tr></thead>
          <tbody>
            {(data?.data ?? []).map((a: AuditRow) => (
              <tr key={a.id}>
                <td>{a.action_label ?? auditLabel[a.action] ?? a.action}</td>
                <td>{a.actor?.name ?? 'سامانه'}{a.actor?.mobile ? ` · ${a.actor.mobile}` : ''}</td>
                <td>{a.entity_label ?? entityName(a.auditable_type)}</td>
                <td>{a.auditable_id ?? '—'}</td>
                <td>{a.ip_address ?? '—'}</td>
                <td><DateTimeText value={a.created_at} /></td>
                <td><Link className="btn btn-ghost" to={`/superuser/audits/${a.id}`}>جزئیات</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminFraSoft() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['fs'], queryFn: async () => (await api.get('/superuser/frasoft/logs')).data })
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState('09120002222')
  const [name, setName] = useState('نماینده فراسافت')

  return (
    <div className="grid gap-3">
      <PageHeader
        title="همگام‌سازی فراسافت"
        subtitle="رویدادها با کلید تکرارناپذیر ثبت می‌شوند تا دوباره‌کاری مالی رخ ندهد."
        action={<button className="btn btn-primary" onClick={() => setOpen(true)}>همگام‌سازی نماینده</button>}
      />
      <div className="card overflow-auto">
        <table className="table">
          <thead><tr><th>رویداد</th><th>جهت</th><th>وضعیت</th><th>زمان</th></tr></thead>
          <tbody>
            {(data?.data ?? []).map((l: { id: number; event_type: string; direction: string; status: string; created_at: string }) => (
              <tr key={l.id}>
                <td>{l.event_type === 'user.upsert' ? 'به‌روزرسانی کاربر' : l.event_type}</td>
                <td>{l.direction === 'inbound' ? 'ورودی' : 'خروجی'}</td>
                <td><Badge tone={l.status === 'processed' ? 'ok' : 'warn'}>{l.status === 'processed' ? 'انجام شده' : 'ناموفق'}</Badge></td>
                <td><DateTimeText value={l.created_at} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} title="همگام‌سازی نماینده فراسافت" onClose={() => setOpen(false)}>
        <form className="grid gap-3" onSubmit={async (e) => {
          e.preventDefault()
          await api.post('/superuser/frasoft/sync', {
            event: 'user.upsert',
            payload: { id: `FS-${mobile}`, name, mobile, roles: ['representative'] },
            idempotency_key: `ui-${mobile}`,
          })
          toast.success('همگام‌سازی ارسال شد')
          setOpen(false)
          qc.invalidateQueries({ queryKey: ['fs'] })
        }}>
          <label className="field">نام<input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field">موبایل<input className="input" value={mobile} onChange={(e) => setMobile(e.target.value)} /></label>
          <button className="btn btn-primary" type="submit">ارسال همگام‌سازی</button>
        </form>
      </Modal>
    </div>
  )
}
