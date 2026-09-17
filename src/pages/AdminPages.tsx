import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Download, Filter, Mail, Phone, Repeat, Search, Shield, TrendingUp, UserPlus, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ExportBar } from '../components/ExportBar'
import { JalaliDatePicker } from '../components/JalaliDatePicker'
import { BulkBar, BulkButton, CheckBox, DeleteAction, EditAction, BlockAction, UnblockAction, RowActions, TablePager, ViewAction, exportSelected, useSelection } from '../components/table'
import { Badge, DateTimeText, Empty, FieldHint, Modal, PageHeader, StatCard } from '../components/ui'
import { api } from '../lib/api'
import { confirmAction } from '../lib/confirm'
import { auditLabel, dateTimeExport, entityName, label, money, permissionLabel, percent, settingLabel } from '../lib/format'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../stores/auth'

type RoleRow = { id: number; name: string; slug: string; is_organizational?: boolean; permissions?: Array<{ id: number; pivot?: { allowed?: boolean | number | string } }> }
type UserRow = { id: number; name: string; mobile: string; email?: string | null; avatar_url?: string | null; is_active: boolean; created_at?: string; roles?: Array<{ name: string; slug: string }> }
type CourseLevel = {
  id?: number
  title: string
  sort_order: number
  passing_score: number
  content_type?: string
  content_body?: string
  content_url?: string
  attachment_name?: string
  attachment_url?: string
  file?: File | null
}
type CourseRow = { id: number; title: string; description?: string; is_required_for_promotion: boolean; is_active?: boolean; levels?: CourseLevel[]; roles?: Array<{ id: number; name: string }> }
type SettingField = { key: string; label: string; hint?: string; type: string }
type SettingSchema = Record<string, { label: string; hint?: string; fields: SettingField[] }>
type PermRow = { id: number; slug: string; name: string }

const emptyUser = { name: '', mobile: '', email: '', password: 'Password123!', password_confirmation: 'Password123!', is_active: true, role_slugs: ['representative'] }
const emptyLevel = (): CourseLevel => ({ title: 'سطح ۱', sort_order: 1, passing_score: 70, content_type: 'text', content_body: '', content_url: '', file: null })
const emptyCourse = { title: '', description: '', is_required_for_promotion: true, role_ids: [] as number[], levels: [emptyLevel()] }
const CONTENT_TYPES = [
  { value: 'text', label: 'متن' },
  { value: 'html', label: 'متن غنی' },
  { value: 'video', label: 'ویدیو' },
  { value: 'pdf', label: 'PDF' },
  { value: 'file', label: 'فایل' },
]

function isGranted(role: RoleRow, permissionId: number) {
  return Boolean(role.permissions?.some((x) => x.id === permissionId && (x.pivot?.allowed === true || x.pivot?.allowed === 1 || x.pivot?.allowed === '1')))
}

function oneDecimal(value: string | number | null | undefined) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? String(Math.round(n * 10) / 10) : '0'
}

export function AdminHome() {
  const { t } = useApp()
  const { data } = useQuery({ queryKey: ['stats'], queryFn: async () => (await api.get('/superuser/stats')).data })
  const cards = [
    { key: 'users', value: data?.users, icon: Users, color: 'from-blue-500 to-blue-600' },
    { key: 'active_users', value: data?.active_users, icon: Shield, color: 'from-emerald-500 to-emerald-600' },
    { key: 'sales', value: data?.sales, icon: Repeat, color: 'from-purple-500 to-purple-600' },
    { key: 'commission_total', value: data?.commission_total, icon: TrendingUp, color: 'from-amber-500 to-amber-600' },
    { key: 'wallets', value: data?.wallets, icon: Wallet, color: 'from-cyan-500 to-cyan-600' },
    { key: 'wallet_balance', value: data?.wallet_balance, icon: BookOpen, color: 'from-rose-500 to-rose-600' },
  ] as const

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('adminStatsTitle')}
        subtitle={t('adminStatsSub')}
        action={<Link className="btn btn-primary" to="/superuser/reports">{t('adminReportsLink')}</Link>}
      />
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4" data-testid="admin-stats">
        {cards.map((card) => (
          <StatCard
            key={card.key}
            title={data?.labels?.[card.key] ?? settingLabel[card.key] ?? card.key}
            value={card.key.includes('total') || card.key.includes('balance') ? money(card.value as number) : card.value ?? 0}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </div>
    </div>
  )
}

export function AdminUsers() {
  const { t } = useApp()
  const qc = useQueryClient()
  const me = useAuth((s) => s.user)
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get('/superuser/roles')).data })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const { data } = useQuery({
    queryKey: ['admin-users', search, status, page],
    queryFn: async () => (await api.get('/superuser/users', {
      params: {
        q: search || undefined,
        page,
        is_active: status === 'all' ? undefined : status === 'active',
      },
    })).data,
  })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [detail, setDetail] = useState<UserRow | null>(null)
  const [form, setForm] = useState(emptyUser)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const rows: UserRow[] = data?.data ?? []
  const selection = useSelection(rows.map((u) => u.id))

  const openCreate = () => {
    setEditing(null)
    setForm(emptyUser)
    setAvatarFile(null)
    setAvatarPreview(null)
    setOpen(true)
  }
  const openEdit = (user: UserRow) => {
    setEditing(user)
    setForm({
      name: user.name,
      mobile: user.mobile,
      email: user.email ?? '',
      password: '',
      password_confirmation: '',
      is_active: user.is_active,
      role_slugs: user.roles?.map((r) => r.slug) ?? ['representative'],
    })
    setAvatarFile(null)
    setAvatarPreview(user.avatar_url ?? null)
    setOpen(true)
  }

  const save = async () => {
    if (!editing && !form.password) {
      toast.error('رمز عبور الزامی است.')
      return
    }
    if (form.password && form.password !== form.password_confirmation) {
      toast.error('رمز عبور و تکرار آن یکسان نیستند.')
      return
    }
    const payload = { ...form, password: form.password || undefined, password_confirmation: form.password ? form.password_confirmation : undefined }
    if (avatarFile) {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('mobile', form.mobile)
      if (form.email) fd.append('email', form.email)
      if (form.password) {
        fd.append('password', form.password)
        fd.append('password_confirmation', form.password_confirmation)
      }
      fd.append('is_active', form.is_active ? '1' : '0')
      form.role_slugs.forEach((slug) => fd.append('role_slugs[]', slug))
      fd.append('avatar', avatarFile)
      if (editing) await api.post(`/superuser/users/${editing.id}`, fd)
      else await api.post('/superuser/users', fd)
    } else if (editing) {
      await api.put(`/superuser/users/${editing.id}`, payload)
    } else {
      await api.post('/superuser/users', form)
    }
    toast.success(editing ? 'کاربر ویرایش شد' : 'کاربر ایجاد شد')
    setOpen(false)
    qc.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const remove = async (user: UserRow) => {
    if (!await confirmAction({
      title: 'حذف حساب',
      text: `حساب «${user.name}» حذف شود؟ اگر سابقه مالی داشته باشد فقط غیرفعال می‌شود.`,
      confirmText: 'حذف شود',
    })) return
    const { data: result } = await api.delete(`/superuser/users/${user.id}`)
    toast.success(result?.message ?? 'کاربر حذف شد')
    qc.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const toggleBlock = async (user: UserRow) => {
    if (user.id === me?.id) {
      toast.error('حساب فعلی را نمی‌توان مسدود کرد.')
      return
    }
    if (user.is_active) {
      if (!await confirmAction({ title: t('blockUser'), text: t('blockConfirm'), confirmText: t('blockUser') })) return
      try {
        await api.post(`/users/${user.id}/block`)
        toast.success(t('blockOk'))
      } catch {
        toast.error(t('blockFail'))
        return
      }
    } else {
      if (!await confirmAction({ title: t('unblockUser'), text: t('unblockConfirm'), confirmText: t('unblockUser'), danger: false })) return
      try {
        await api.post(`/users/${user.id}/unblock`)
        toast.success(t('unblockOk'))
      } catch {
        toast.error(t('blockFail'))
        return
      }
    }
    qc.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const bulk = async (action: 'delete' | 'activate' | 'deactivate') => {
    const ids = action === 'activate'
      ? selection.selected
      : selection.selected.filter((id) => id !== me?.id)
    if (!ids.length) {
      toast.error('حساب فعلی را نمی‌توان حذف یا غیرفعال کرد.')
      return
    }
    if (action === 'delete' && !await confirmAction({
      title: 'حذف دسته‌ای',
      text: `${ids.length} حساب انتخاب‌شده حذف یا غیرفعال شوند؟`,
      confirmText: 'انجام شود',
    })) return
    await api.post('/superuser/users/bulk', { action, ids })
    toast.success(action === 'delete' ? 'حذف دسته‌ای انجام شد' : 'وضعیت دسته‌ای به‌روز شد')
    selection.clear()
    qc.invalidateQueries({ queryKey: ['admin-users'] })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('adminUsersTitle')}
        subtitle={t('adminUsersSub')}
        action={<button className="btn btn-primary" onClick={openCreate}><UserPlus className="w-4 h-4" /> {t('adminNewUser')}</button>}
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard title={t('adminUsersAll')} value={Number(data?.total ?? rows.length).toLocaleString('fa-IR')} icon={Users} color="from-blue-500 to-blue-600" />
        <StatCard title={t('adminUsersPage')} value={rows.length.toLocaleString('fa-IR')} icon={Shield} color="from-emerald-500 to-emerald-600" />
      </div>
      <div className="bg-white dark:bg-surface-800 rounded-xl p-4 border border-surface-200 dark:border-surface-700">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t('adminUserSearch')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full ps-9 pe-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-sm text-surface-800 dark:text-surface-200 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 text-sm text-surface-700 dark:text-surface-300 outline-none"
            >
              <option value="all">{t('adminAllStatus')}</option>
              <option value="active">{t('adminActive')}</option>
              <option value="inactive">{t('adminInactive')}</option>
            </select>
            <button type="button" className="p-2 rounded-lg border border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-500" aria-label="فیلتر">
              <Filter className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 rounded-lg border border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 text-surface-500" aria-label="خروجی" onClick={() => exportSelected('کاربران', rows.map((u) => ({ شناسه: u.id, نام: u.name, موبایل: u.mobile, نقش: (u.roles ?? []).map((r) => r.name).join('، '), وضعیت: u.is_active ? 'فعال' : 'غیرفعال' })))}>
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
        <BulkBar count={selection.count}>
          <BulkButton tone="danger" onClick={() => bulk('delete')}>حذف دسته‌ای</BulkButton>
          <BulkButton tone="ok" onClick={() => bulk('activate')}>فعال‌سازی</BulkButton>
          <BulkButton tone="warn" onClick={() => bulk('deactivate')}>غیرفعال‌سازی</BulkButton>
        </BulkBar>
      </div>
      <div className="card overflow-hidden" data-testid="admin-users">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th><CheckBox checked={selection.allSelected} onChange={selection.toggleAll} label="انتخاب همه" /></th>
                <th>شناسه</th>
                <th>نام</th>
                <th>موبایل</th>
                <th>نقش‌ها</th>
                <th>وضعیت</th>
                <th>تاریخ ایجاد</th>
                <th className="text-center">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td><CheckBox checked={selection.selected.includes(u.id)} onChange={() => selection.toggle(u.id)} label={`انتخاب ردیف ${u.id}`} /></td>
                  <td>{u.id}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600 text-white text-xs font-bold flex items-center justify-center">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{u.name}</div>
                        {u.email && <div className="text-xs text-surface-400">{u.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td>{u.mobile}</td>
                  <td>{u.roles?.map((r) => r.name).join('، ')}</td>
                  <td><Badge tone={u.is_active ? 'ok' : 'danger'}>{u.is_active ? t('adminActive') : t('blocked')}</Badge></td>
                  <td><DateTimeText value={u.created_at} /></td>
                  <td>
                    <RowActions>
                      <ViewAction onClick={() => setDetail(u)} />
                      <EditAction onClick={() => openEdit(u)} />
                      {u.is_active
                        ? <BlockAction label={t('blockUser')} onClick={() => toggleBlock(u)} />
                        : <UnblockAction label={t('unblockUser')} onClick={() => toggleBlock(u)} />}
                      <DeleteAction onClick={() => remove(u)} />
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePager page={data?.current_page ?? 1} last={data?.last_page ?? 1} from={data?.from} to={data?.to} total={data?.total ?? rows.length} onPage={setPage} />
      </div>
      <Modal open={open} title={editing ? 'ویرایش کاربر' : 'ایجاد کاربر'} subtitle="یک حساب می‌تواند چند نقش همزمان داشته باشد." onClose={() => setOpen(false)}>
        <form className="grid gap-3" data-testid="user-form" onSubmit={async (e) => { e.preventDefault(); try { await save() } catch { toast.error('ثبت کاربر ناموفق بود') } }}>
          <label className="field">آواتار (اختیاری)
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
                {avatarPreview ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" /> : (form.name.charAt(0) || '؟')}
              </div>
              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setAvatarFile(file)
                  setAvatarPreview(file ? URL.createObjectURL(file) : (editing?.avatar_url ?? null))
                }}
              />
            </div>
          </label>
          <label className="field">نام<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label className="field">موبایل<input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required /></label>
          <label className="field">ایمیل<input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="field">{editing ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'}
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
          </label>
          {(!editing || form.password) && (
            <label className="field">تکرار رمز عبور
              <input className="input" type="password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} required={!editing || Boolean(form.password)} />
            </label>
          )}
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
      <Modal open={Boolean(detail)} title={detail?.name ?? ''} onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-3">
            <div className="text-center border-b border-surface-200 dark:border-surface-700 pb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                {detail.avatar_url ? <img src={detail.avatar_url} alt="" className="w-full h-full object-cover" /> : detail.name.charAt(0)}
              </div>
              <Badge tone={detail.is_active ? 'ok' : 'danger'}>{detail.is_active ? t('adminActive') : t('blocked')}</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-surface-400" /><span>{detail.email || '—'}</span></div>
            <div className="flex items-center gap-3 text-sm"><Phone className="w-4 h-4 text-surface-400" /><span>{detail.mobile}</span></div>
            <div className="flex items-center gap-3 text-sm"><Shield className="w-4 h-4 text-surface-400" /><span>نقش‌ها: {detail.roles?.map((r) => r.name).join('، ') || '—'}</span></div>
            <div className="flex items-center gap-3 text-sm"><Users className="w-4 h-4 text-surface-400" /><span>شناسه {detail.id}</span></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export function AdminPermissions() {
  const { t } = useApp()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'all' | 'pages' | 'ops' | 'role'>('all')
  const [roleId, setRoleId] = useState<number | null>(null)
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
  const allPerms: PermRow[] = perms ?? []
  const pagePerms = allPerms.filter((p) => p.slug.startsWith('page.'))
  const actionPerms = allPerms.filter((p) => !p.slug.startsWith('page.'))
  const selectedRole = orgRoles.find((r: RoleRow) => r.id === (roleId ?? orgRoles[0]?.id)) ?? orgRoles[0]

  const renderMatrix = (items: PermRow[]) => (
    <div className="overflow-auto">
      <table className="table perm-table">
        <thead>
          <tr>
            <th className="min-w-56 sticky start-0 bg-surface-50 dark:bg-surface-900 z-10">دسترسی</th>
            {orgRoles.map((r: RoleRow) => <th key={r.id} className="text-center whitespace-nowrap">{r.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} data-testid={`perm-${p.slug}`}>
              <td className="sticky start-0 bg-white dark:bg-surface-800 z-10">
                <div className="font-medium text-surface-800 dark:text-surface-100">{permissionLabel[p.slug] ?? p.name}</div>
                <div className="text-xs text-surface-400">{p.slug}</div>
              </td>
              {orgRoles.map((r: RoleRow) => {
                const allowed = isGranted(r, p.id)
                return (
                  <td key={`${r.id}-${p.id}`} className="text-center">
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
  )

  return (
    <div className="space-y-4">
      <PageHeader title={t('adminPermTitle')} subtitle={t('adminPermSub')} />
      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'همه دسترسی‌ها'],
          ['pages', t('adminPermPages')],
          ['ops', t('adminPermOps')],
          ['role', t('adminPermByRole')],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className={`btn ${tab === id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="card p-2" data-testid="permissions-admin">
        {tab === 'all' && (
          <div className="grid gap-6">
            <div>
              <div className="px-3 pt-2 font-bold text-surface-800 dark:text-surface-100">{t('adminPermPages')}</div>
              {renderMatrix(pagePerms)}
            </div>
            <div>
              <div className="px-3 pt-2 font-bold text-surface-800 dark:text-surface-100">{t('adminPermOps')}</div>
              {renderMatrix(actionPerms)}
            </div>
          </div>
        )}
        {tab === 'pages' && renderMatrix(pagePerms)}
        {tab === 'ops' && renderMatrix(actionPerms)}
        {tab === 'role' && selectedRole && (
          <div className="p-3 grid gap-4">
            <p className="text-sm text-surface-500 m-0">{t('adminPermPickRole')}</p>
            <div className="flex flex-wrap gap-2">
              {orgRoles.map((r: RoleRow) => (
                <button key={r.id} type="button" className={`btn ${selectedRole.id === r.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRoleId(r.id)}>
                  {r.name}
                </button>
              ))}
            </div>
            {[{ title: t('adminPermPages'), items: pagePerms }, { title: t('adminPermOps'), items: actionPerms }].map((group) => (
              <div key={group.title} className="rounded-xl border border-surface-200 dark:border-surface-700 p-3">
                <div className="font-bold mb-3 text-surface-800 dark:text-surface-100">{group.title} · {selectedRole.name}</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {group.items.map((p) => (
                    <label key={p.id} className="flex items-start gap-2 rounded-lg p-2 hover:bg-surface-50 dark:hover:bg-surface-900">
                      <input
                        type="checkbox"
                        className="mt-1"
                        data-testid={`perm-toggle-${selectedRole.slug}-${p.slug}`}
                        checked={isGranted(selectedRole, p.id)}
                        onChange={(e) => assign.mutate({ role_id: selectedRole.id, permission_id: p.id, allowed: e.target.checked })}
                      />
                      <span>
                        <span className="block font-medium">{permissionLabel[p.slug] ?? p.name}</span>
                        <span className="block text-xs text-surface-400">{p.slug}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function AdminRules() {
  const { t } = useApp()
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['rules'], queryFn: async () => (await api.get('/superuser/commission-rules')).data })
  const [drafts, setDrafts] = useState<Record<number, { percent: string; qualified_percent: string }>>({})

  return (
    <div className="space-y-4">
      <PageHeader title={t('adminRulesTitle')} subtitle={t('adminRulesSub')} />
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
                  <div className="text-xs text-surface-400">نسخه جاری {current?.version ?? 1} · پایه {percent(current?.percent ?? r.default_percent)}</div>
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
  const { t } = useApp()
  const qc = useQueryClient()
  const { data: roles } = useQuery({ queryKey: ['manage-roles'], queryFn: async () => (await api.get('/manage/roles')).data })
  const { data } = useQuery({ queryKey: ['admin-courses'], queryFn: async () => (await api.get('/manage/courses')).data })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CourseRow | null>(null)
  const [form, setForm] = useState(emptyCourse)

  const setLevel = (index: number, patch: Partial<CourseLevel>) => {
    setForm((prev) => ({ ...prev, levels: prev.levels.map((level, i) => i === index ? { ...level, ...patch } : level) }))
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyCourse, levels: [emptyLevel()] })
    setOpen(true)
  }
  const openEdit = (course: CourseRow) => {
    setEditing(course)
    setForm({
      title: course.title,
      description: course.description ?? '',
      is_required_for_promotion: course.is_required_for_promotion,
      role_ids: course.roles?.map((r) => r.id) ?? [],
      levels: (course.levels ?? []).map((l, i) => ({
        id: l.id,
        title: l.title,
        sort_order: l.sort_order ?? i + 1,
        passing_score: Number(l.passing_score),
        content_type: l.content_type ?? 'text',
        content_body: l.content_body ?? '',
        content_url: l.content_url ?? '',
        attachment_name: l.attachment_name,
        attachment_url: l.attachment_url,
        file: null,
      })),
    })
    setOpen(true)
  }

  const save = async () => {
    const payload = {
      title: form.title,
      description: form.description,
      is_required_for_promotion: form.is_required_for_promotion,
      role_ids: form.role_ids,
      levels: form.levels.map((l, i) => ({
        id: l.id,
        title: l.title,
        sort_order: i + 1,
        passing_score: l.passing_score,
        content_type: l.content_type ?? 'text',
        content_body: l.content_body ?? '',
        content_url: l.content_url ?? '',
      })),
    }
    const saved = editing
      ? (await api.put(`/manage/courses/${editing.id}`, payload)).data
      : (await api.post('/manage/courses', payload)).data
    for (const [index, level] of form.levels.entries()) {
      if (!level.file) continue
      const id = saved?.levels?.[index]?.id
      if (!id) continue
      const fd = new FormData()
      fd.append('file', level.file)
      await api.post(`/manage/course-levels/${id}/file`, fd)
    }
    toast.success(editing ? 'دوره ویرایش شد' : 'دوره ساخته شد')
    setOpen(false)
    qc.invalidateQueries({ queryKey: ['admin-courses'] })
  }

  const remove = async (course: CourseRow) => {
    if (!await confirmAction({ title: 'حذف دوره', text: `دوره «${course.title}» حذف شود؟`, confirmText: 'حذف شود' })) return
    await api.delete(`/manage/courses/${course.id}`)
    toast.success('دوره حذف شد')
    qc.invalidateQueries({ queryKey: ['admin-courses'] })
  }

  const courses: CourseRow[] = data ?? []
  const courseSel = useSelection(courses.map((c) => c.id))

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('adminCoursesTitle')}
        subtitle={t('adminCoursesSub')}
        action={<button className="btn btn-primary" onClick={openCreate}>دوره جدید</button>}
      />
      <BulkBar count={courseSel.count}>
        <BulkButton tone="danger" onClick={async () => {
          if (!await confirmAction({ title: 'حذف دسته‌ای دوره‌ها', text: `${courseSel.count} دوره حذف شوند؟`, confirmText: 'حذف شوند' })) return
          await api.post('/manage/courses/bulk', { action: 'delete', ids: courseSel.selected })
          toast.success('حذف دسته‌ای انجام شد')
          courseSel.clear()
          qc.invalidateQueries({ queryKey: ['admin-courses'] })
        }}>حذف دسته‌ای</BulkButton>
      </BulkBar>
      <div className="card overflow-auto">
        <table className="table">
          <thead>
            <tr>
              <th><CheckBox checked={courseSel.allSelected} onChange={courseSel.toggleAll} label="انتخاب همه" /></th>
              <th>دوره</th>
              <th>نقش‌ها</th>
              <th>سطوح</th>
              <th className="text-center">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id}>
                <td><CheckBox checked={courseSel.selected.includes(c.id)} onChange={() => courseSel.toggle(c.id)} label={`انتخاب ${c.title}`} /></td>
                <td>
                  <div className="font-extrabold">{c.title}</div>
                  <div className="text-sm text-surface-500">{c.description || 'بدون شرح'}</div>
                </td>
                <td><div className="flex gap-2 flex-wrap">{c.roles?.map((r) => <Badge key={r.name}>{r.name}</Badge>)}</div></td>
                <td className="text-sm">{c.levels?.map((l) => `${l.title} (${CONTENT_TYPES.find((x) => x.value === (l.content_type ?? 'text'))?.label ?? 'متن'} · قبولی ${l.passing_score})`).join('، ') || '—'}</td>
                <td>
                  <RowActions>
                    <EditAction onClick={() => openEdit(c)} />
                    <DeleteAction onClick={() => remove(c)} />
                  </RowActions>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {courses.length === 0 && <Empty text="دوره‌ای ثبت نشده است." />}
      </div>
      <Modal wide open={open} title={editing ? 'ویرایش دوره' : 'ایجاد دوره'} subtitle="برای هر سطح نوع محتوا، متن، لینک ویدیو یا فایل مشخص کنید." onClose={() => setOpen(false)}>
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
            <FieldHint>دوره فقط برای نقش‌های انتخاب‌شده در پنل آموزش دیده می‌شود و برای ارتقاء همان نقش‌ها الزامی است.</FieldHint>
            <div className="flex flex-wrap gap-3">
              {(roles ?? []).map((r: { id: number; name: string }) => (
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
              <div key={i} className="card p-3 grid gap-3">
                <div className="grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                  <label className="field">عنوان سطح
                    <input className="input" value={level.title} onChange={(e) => setLevel(i, { title: e.target.value })} />
                  </label>
                  <label className="field">نوع محتوا
                    <select className="input" value={level.content_type ?? 'text'} onChange={(e) => setLevel(i, { content_type: e.target.value })}>
                      {CONTENT_TYPES.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </label>
                  <label className="field">نمره قبولی (از ۱۰۰)
                    <input className="input" type="number" min={0} max={100} value={level.passing_score} onChange={(e) => setLevel(i, { passing_score: Number(e.target.value) })} />
                  </label>
                  <button type="button" className="btn btn-ghost whitespace-nowrap" onClick={() => setForm({ ...form, levels: form.levels.filter((_, idx) => idx !== i) })}>حذف سطح</button>
                </div>
                <label className="field">متن آموزشی
                  <textarea className="input min-h-24" value={level.content_body ?? ''} onChange={(e) => setLevel(i, { content_body: e.target.value })} />
                </label>
                <label className="field">لینک ویدیو یا فایل آنلاین
                  <input className="input" dir="ltr" placeholder="https://..." value={level.content_url ?? ''} onChange={(e) => setLevel(i, { content_url: e.target.value })} />
                </label>
                <div className="grid gap-2">
                  <label className="field">آپلود فایل جدید (PDF، ویدیو، تصویر، ...)
                    <input className="input" type="file" onChange={(e) => setLevel(i, { file: e.target.files?.[0] ?? null })} />
                  </label>
                  {level.attachment_url && (
                    <a
                      className="text-sm text-primary-600 font-semibold w-fit"
                      href={level.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      فایل فعلی: {level.attachment_name || 'دانلود / باز کردن'}
                    </a>
                  )}
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-ghost w-fit" onClick={() => setForm({ ...form, levels: [...form.levels, { ...emptyLevel(), title: `سطح ${form.levels.length + 1}`, sort_order: form.levels.length + 1 }] })}>افزودن سطح جدید</button>
          </div>
          <button className="btn btn-primary" type="submit">{editing ? 'ذخیره تغییرات' : 'ثبت دوره'}</button>
        </form>
      </Modal>
    </div>
  )
}

export function AdminSettings() {
  const { t } = useApp()
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get('/superuser/settings')).data })
  const items = Array.isArray(data) ? data : data?.items ?? []
  const schema: SettingSchema = data?.schema ?? {}
  const [edits, setEdits] = useState<Record<string, Record<string, string | number | boolean>>>({})

  return (
    <div className="grid gap-3">
      <PageHeader title={t('adminSettingsTitle')} subtitle={t('adminSettingsSub')} />
      {items.map((s: { id: number; key: string; value: Record<string, unknown> }) => {
        const meta = schema[s.key]
        const current = edits[s.key] ?? Object.fromEntries(Object.entries(s.value ?? {}).map(([k, v]) => [k, v as string | number | boolean]))
        const fields = meta?.fields ?? Object.keys(s.value ?? {}).map((key) => ({ key, label: key, type: 'number' }))
        return (
          <form key={s.id} className="card p-5 grid gap-3" data-testid={`setting-${s.key}`} onSubmit={async (e) => {
            e.preventDefault()
            const value = Object.fromEntries(fields.map((f) => {
              if (f.type === 'number') return [f.key, Number(current[f.key] ?? 0)]
              if (f.type === 'boolean') return [f.key, Boolean(current[f.key])]
              return [f.key, current[f.key]]
            }))
            await api.post('/superuser/settings', { key: s.key, value })
            toast.success('تنظیمات ذخیره شد')
            qc.invalidateQueries({ queryKey: ['settings'] })
            await useAuth.getState().hydrate()
          }}>
            <div>
              <div className="font-bold">{meta?.label ?? settingLabel[s.key] ?? s.key}</div>
              {meta?.hint && <FieldHint>{meta.hint}</FieldHint>}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {fields.map((field) => (
                field.type === 'boolean' ? (
                  <label key={field.key} className="field flex flex-row items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-primary-600"
                      checked={Boolean(current[field.key])}
                      onChange={(e) => setEdits({ ...edits, [s.key]: { ...current, [field.key]: e.target.checked } })}
                    />
                    <span>
                      <div>{field.label}</div>
                      {field.hint && <FieldHint>{field.hint}</FieldHint>}
                    </span>
                  </label>
                ) : (
                  <label key={field.key} className="field">
                    {field.label}
                    <input
                      className="input"
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={String(current[field.key] ?? '')}
                      onChange={(e) => setEdits({ ...edits, [s.key]: { ...current, [field.key]: e.target.value } })}
                    />
                    {field.hint && <FieldHint>{field.hint}</FieldHint>}
                  </label>
                )
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
  const { t } = useApp()
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

  const rows: AuditRow[] = data?.data ?? []
  const sel = useSelection(rows.map((a) => a.id))
  const selectedRows = rows.filter((a) => sel.selected.includes(a.id))

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('adminAuditsTitle')}
        subtitle={t('adminAuditsSub')}
        action={<ExportBar filename="رویدادها" sheets={auditSheets(exportLogs?.data ?? rows)} testId="audit-export" />}
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
        <BulkBar count={sel.count}>
          <BulkButton tone="info" onClick={() => exportSelected('رویدادهای-انتخابی', auditSheets(selectedRows)[0].rows)}>خروجی انتخاب‌شده</BulkButton>
        </BulkBar>
      </form>
      <div className="card overflow-auto" data-testid="audit-log">
        <table className="table">
          <thead><tr><th><CheckBox checked={sel.allSelected} onChange={sel.toggleAll} label="انتخاب همه" /></th><th>اقدام</th><th>عامل</th><th>موجودیت</th><th>شناسه</th><th>آی‌پی</th><th>زمان</th><th className="text-center">عملیات</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td><CheckBox checked={sel.selected.includes(a.id)} onChange={() => sel.toggle(a.id)} label={`انتخاب رویداد ${a.id}`} /></td>
                <td>{a.action_label ?? auditLabel[a.action] ?? a.action}</td>
                <td>{a.actor?.name ?? 'سامانه'}{a.actor?.mobile ? ` · ${a.actor.mobile}` : ''}</td>
                <td>{a.entity_label ?? entityName(a.auditable_type)}</td>
                <td>{a.auditable_id ?? '—'}</td>
                <td>{a.ip_address ?? '—'}</td>
                <td><DateTimeText value={a.created_at} /></td>
                <td><RowActions><ViewAction to={`/superuser/audits/${a.id}`} /></RowActions></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminFraSoft() {
  const { t } = useApp()
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['fs'], queryFn: async () => (await api.get('/superuser/frasoft/logs')).data })
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState('09120002222')
  const [name, setName] = useState('نماینده فراسافت')

  const logs: Array<{ id: number; event_type: string; direction: string; status: string; created_at: string }> = data?.data ?? []
  const sel = useSelection(logs.map((l) => l.id))

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('adminFrasoftTitle')}
        subtitle={t('adminFrasoftSub')}
        action={<button className="btn btn-primary" onClick={() => setOpen(true)}>همگام‌سازی نماینده</button>}
      />
      <BulkBar count={sel.count}>
        <BulkButton tone="info" onClick={() => exportSelected('فراسافت', logs.filter((l) => sel.selected.includes(l.id)).map((l) => ({ رویداد: l.event_type, جهت: label(l.direction), وضعیت: label(l.status) })))}>خروجی انتخاب‌شده</BulkButton>
      </BulkBar>
      <div className="card overflow-auto">
        <table className="table">
          <thead><tr><th><CheckBox checked={sel.allSelected} onChange={sel.toggleAll} label="انتخاب همه" /></th><th>رویداد</th><th>جهت</th><th>وضعیت</th><th>زمان</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td><CheckBox checked={sel.selected.includes(l.id)} onChange={() => sel.toggle(l.id)} label={`انتخاب ${l.id}`} /></td>
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
