import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../lib/api'
import { dashboardPath } from '../lib/roles'
import { useAuth } from '../stores/auth'
import { Badge, Empty, FieldHint, Modal, PageHeader, StatCard } from '../components/ui'
import { TablePager } from '../components/table'
import { SearchSelect } from '../components/SearchSelect'

type GoalStatus = 'available' | 'in_progress' | 'completed' | 'failed'
type GoalsSection = 'bank' | 'access' | 'monitor'

type GoalItem = {
  id: number
  name: string
  platform: string
  platform_url?: string | null
  audience_count?: number | null
  description?: string | null
  province?: string | null
  city?: string | null
  address?: string | null
  phone?: string | null
  mobile?: string | null
  status: GoalStatus
  claimed_at?: string | null
  disposed_at?: string | null
  work_report?: string | null
  failure_reason?: string | null
  claimant?: { id: number; name: string; mobile: string } | null
  claim_role?: { id: number; name: string; slug: string } | null
}

type GoalBankState = {
  enabled: boolean
  max_concurrent: number
  in_progress: number
  can_claim_more: boolean
  can_receive_batch?: boolean
  remaining_slots: number
  batch_size?: number
  is_manager?: boolean
}

type AccessRow = {
  user_id: number
  name: string
  mobile: string
  national_id?: string | null
  enabled: boolean
  max_concurrent: number
  in_progress: number
  province?: string | null
  city?: string | null
  roles: Array<{
    role_id: number
    role_slug: string
    role_name: string
  }>
}

type VipOption = { id: string | number; title: string }

const emptyForm = {
  name: '',
  platform: '',
  platform_url: '',
  audience_count: '',
  description: '',
  province: '',
  city: '',
  state_id: '',
  city_id: '',
  address: '',
  phone: '',
  mobile: '',
}

const statusLabel: Record<GoalStatus, string> = {
  available: 'آزاد',
  in_progress: 'در حال انجام',
  completed: 'انجام‌شده',
  failed: 'انجام‌نشده',
}

const statusTone: Record<GoalStatus, 'ok' | 'warn' | 'danger' | 'muted'> = {
  available: 'ok',
  in_progress: 'warn',
  completed: 'ok',
  failed: 'danger',
}

function apiErr(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
  const first = Object.values(err?.response?.data?.errors ?? {})?.[0]?.[0]
  return err?.response?.data?.message || first || fallback
}

function FieldBlock({
  label,
  value,
  dir,
  testId,
}: {
  label: string
  value?: string | null
  dir?: 'ltr' | 'rtl'
  testId?: string
}) {
  const empty = value == null || value === ''
  return (
    <div className="min-w-0 py-2 border-b border-surface-100/90 dark:border-surface-700/80 last:border-b-0" data-testid={testId}>
      <div className="text-[11px] font-medium tracking-wide text-surface-400 mb-0.5">{label}</div>
      {empty ? (
        <div className="text-sm text-surface-300">—</div>
      ) : (
        <div className="text-sm text-surface-800 dark:text-surface-100 break-words whitespace-pre-wrap" dir={dir}>{value}</div>
      )}
    </div>
  )
}

function GoalPartCard({ item, footer }: { item: GoalItem; footer?: ReactNode }) {
  const location = [item.province, item.city].filter(Boolean).join(' / ') || null
  return (
    <article
      className="card p-4 sm:p-5 flex flex-col h-full min-w-0 hover:border-primary-200/80 transition-colors"
      data-testid={`goal-item-${item.id}`}
    >
      <header className="flex items-start justify-between gap-3 shrink-0 pb-3 border-b border-surface-100 dark:border-surface-700">
        <div className="min-w-0 flex-1">
          <h3 className="m-0 font-semibold text-[15px] leading-snug text-surface-900 dark:text-surface-50 break-words">
            {item.name}
          </h3>
          <p className="m-0 mt-1 text-xs text-surface-500 break-all">
            <span>{item.platform}</span>
            {item.platform_url ? (
              <>
                <span className="mx-1 opacity-40">·</span>
                <a href={item.platform_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline break-all" dir="ltr">
                  {item.platform_url.replace(/^https?:\/\//, '')}
                </a>
              </>
            ) : null}
          </p>
        </div>
        <span className="shrink-0 whitespace-nowrap pt-0.5">
          <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
        </span>
      </header>

      <div className="flex-1 min-w-0 mt-1">
        <div className="grid grid-cols-2 gap-x-4">
          <FieldBlock label="مخاطبین" value={item.audience_count != null ? item.audience_count.toLocaleString('fa-IR') : null} />
          <FieldBlock label="موقعیت" value={location} />
        </div>
        <FieldBlock label="شماره تماس" value={item.phone} dir="ltr" testId={`goal-phone-${item.id}`} />
        <FieldBlock label="شماره موبایل" value={item.mobile} dir="ltr" testId={`goal-mobile-${item.id}`} />
        <FieldBlock label="آدرس" value={item.address} />
        <FieldBlock label="توضیحات" value={item.description} />
        {item.claimant && (
          <FieldBlock
            label="گیرنده"
            value={`${item.claimant.name}${item.claim_role?.name ? ` · ${item.claim_role.name}` : ''}`}
          />
        )}
        {item.work_report && <FieldBlock label="گزارش کار" value={item.work_report} />}
        {item.failure_reason && <FieldBlock label="علت انجام‌نشدن" value={item.failure_reason} />}
      </div>

      {footer && (
        <div className="flex flex-wrap gap-2 pt-3 mt-auto border-t border-surface-100 dark:border-surface-700 shrink-0">
          {footer}
        </div>
      )}
    </article>
  )
}

function AccessGeoFields({
  row,
  states,
  onSave,
}: {
  row: AccessRow
  states: VipOption[]
  onSave: (province: string | null, city: string | null) => void
}) {
  const [stateId, setStateId] = useState('')
  const [cityId, setCityId] = useState('')

  useEffect(() => {
    if (!row.province || states.length === 0) {
      if (!row.province) setStateId('')
      return
    }
    const match = states.find((s) => s.title === row.province)
    if (match) setStateId(String(match.id))
  }, [row.user_id, row.province, states])

  const { data: cityRows } = useQuery({
    queryKey: ['finopal-vip-cities', stateId],
    enabled: Boolean(stateId),
    staleTime: 60_000,
    queryFn: async () => (await api.get('/finopal-vip/cities', { params: { state_id: stateId } })).data as VipOption[],
  })
  const cities = cityRows ?? []

  useEffect(() => {
    if (!row.city || cities.length === 0) {
      if (!row.city) setCityId('')
      return
    }
    const match = cities.find((c) => c.title === row.city)
    if (match) setCityId(String(match.id))
  }, [row.user_id, row.city, cities])

  return (
    <>
      <label className="field !mb-0">
        استان
        <SearchSelect
          value={stateId}
          placeholder={states.length ? 'انتخاب استان' : 'در حال دریافت…'}
          options={states.map((s) => ({ value: String(s.id), label: s.title }))}
          onChange={(id) => {
            const title = states.find((s) => String(s.id) === id)?.title ?? ''
            setStateId(id)
            setCityId('')
            if ((title || null) === (row.province ?? null) && !row.city) return
            onSave(title || null, null)
          }}
          testId={`goals-access-province-${row.user_id}`}
        />
      </label>
      <label className="field !mb-0">
        شهر
        <SearchSelect
          value={cityId}
          disabled={!stateId}
          placeholder={stateId ? 'انتخاب شهر' : 'اول استان'}
          options={cities.map((c) => ({ value: String(c.id), label: c.title }))}
          onChange={(id) => {
            const title = cities.find((c) => String(c.id) === id)?.title ?? ''
            setCityId(id)
            const province = states.find((s) => String(s.id) === stateId)?.title ?? row.province ?? null
            if ((title || null) === (row.city ?? null)) return
            onSave(province, title || null)
          }}
          testId={`goals-access-city-${row.user_id}`}
        />
      </label>
    </>
  )
}

function GoalsBankSection({ section }: { section: GoalsSection }) {
  const user = useAuth((s) => s.user)
  const qc = useQueryClient()
  const isManager = !!(user?.is_superuser || user?.active_role?.slug === 'senior_manager' || user?.features?.goal_bank?.is_manager)
  const [scope, setScope] = useState(isManager ? 'all' : 'in_progress')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<GoalItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [disposeItem, setDisposeItem] = useState<GoalItem | null>(null)
  const [disposeMode, setDisposeMode] = useState<'complete' | 'fail'>('complete')
  const [disposeText, setDisposeText] = useState('')
  const [accessSearch, setAccessSearch] = useState('')
  const [accessSearchQ, setAccessSearchQ] = useState('')
  const [accessPage, setAccessPage] = useState(1)
  const [monitorSearch, setMonitorSearch] = useState('')
  const [monitorSearchQ, setMonitorSearchQ] = useState('')
  const [monitorUsersPage, setMonitorUsersPage] = useState(1)
  const [monitorUser, setMonitorUser] = useState<AccessRow | null>(null)
  const [monitorStatus, setMonitorStatus] = useState<'' | GoalStatus>('')
  const [monitorPage, setMonitorPage] = useState(1)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setAccessSearchQ(accessSearch.trim())
      setAccessPage(1)
    }, 350)
    return () => window.clearTimeout(t)
  }, [accessSearch])

  useEffect(() => {
    const t = window.setTimeout(() => {
      setMonitorSearchQ(monitorSearch.trim())
      setMonitorUsersPage(1)
    }, 350)
    return () => window.clearTimeout(t)
  }, [monitorSearch])

  const listQ = useQuery({
    queryKey: ['goals-bank', scope, search, page],
    enabled: section === 'bank',
    queryFn: async () => {
      const { data } = await api.get('/goals/bank', {
        params: { scope, search: search || undefined, page, per_page: 12 },
      })
      return data as { data: GoalItem[]; meta: { current_page: number; last_page: number; total: number }; goal_bank: GoalBankState }
    },
  })

  const accessQ = useQuery({
    queryKey: ['goals-access', accessSearchQ, accessPage],
    enabled: isManager && section === 'access',
    queryFn: async () => {
      const { data } = await api.get('/goals/access', {
        params: { search: accessSearchQ || undefined, page: accessPage, per_page: 20 },
      })
      return data as {
        data: AccessRow[]
        meta: { current_page: number; last_page: number; total: number; from?: number; to?: number }
      }
    },
    placeholderData: (prev) => prev,
  })

  const monitorUsersQ = useQuery({
    queryKey: ['goals-monitor-users', monitorSearchQ, monitorUsersPage],
    enabled: isManager && section === 'monitor',
    queryFn: async () => {
      const { data } = await api.get('/goals/access', {
        params: {
          search: monitorSearchQ || undefined,
          page: monitorUsersPage,
          per_page: 15,
        },
      })
      return data as {
        data: AccessRow[]
        meta: { current_page: number; last_page: number; total: number; per_page: number }
      }
    },
    placeholderData: (prev) => prev,
  })

  const monitorPartsQ = useQuery({
    queryKey: ['goals-monitor-parts', monitorUser?.user_id, monitorStatus, monitorPage],
    enabled: isManager && section === 'monitor' && !!monitorUser,
    queryFn: async () => {
      const { data } = await api.get('/goals/bank', {
        params: {
          user_id: monitorUser!.user_id,
          status: monitorStatus || undefined,
          page: monitorPage,
          per_page: 12,
        },
      })
      return data as { data: GoalItem[]; meta: { current_page: number; last_page: number; total: number } }
    },
  })

  const meQ = useQuery({
    queryKey: ['goals-bank-me'],
    enabled: section !== 'bank',
    queryFn: async () => (await api.get('/goals/me')).data as { goal_bank: GoalBankState },
    staleTime: 30_000,
  })

  const { data: vipRef } = useQuery({
    queryKey: ['finopal-vip-reference'],
    enabled: isManager && (formOpen || section === 'access'),
    staleTime: 60_000,
    queryFn: async () => (await api.get('/finopal-vip/reference')).data as { states?: VipOption[] },
  })
  const states = vipRef?.states ?? []

  useEffect(() => {
    if (!formOpen || !form.province || form.state_id || states.length === 0) return
    const match = states.find((s) => s.title === form.province)
    if (match) setForm((prev) => ({ ...prev, state_id: String(match.id) }))
  }, [formOpen, form.province, form.state_id, states])

  const { data: cityRows } = useQuery({
    queryKey: ['finopal-vip-cities', form.state_id],
    enabled: Boolean(form.state_id) && formOpen,
    queryFn: async () => (await api.get('/finopal-vip/cities', { params: { state_id: form.state_id } })).data as VipOption[],
  })
  const cities = cityRows ?? []

  useEffect(() => {
    if (!formOpen || !form.city || form.city_id || cities.length === 0) return
    const match = cities.find((c) => c.title === form.city)
    if (match) setForm((prev) => ({ ...prev, city_id: String(match.id) }))
  }, [formOpen, form.city, form.city_id, cities])

  const state = listQ.data?.goal_bank ?? meQ.data?.goal_bank ?? (user?.features?.goal_bank as GoalBankState | undefined)
  const items = listQ.data?.data ?? []
  const canReceive = !!(state?.can_receive_batch ?? state?.can_claim_more)
  const batchSize = state?.batch_size ?? state?.max_concurrent ?? 10

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        platform: form.platform,
        platform_url: form.platform_url || null,
        audience_count: form.audience_count === '' ? null : Number(form.audience_count),
        description: form.description || null,
        province: form.province || null,
        city: form.city || null,
        address: form.address || null,
        phone: form.phone || null,
        mobile: form.mobile || null,
      }
      if (editing) return api.put(`/goals/bank/${editing.id}`, payload)
      return api.post('/goals/bank', payload)
    },
    onSuccess: async () => {
      const wasEdit = !!editing
      setFormOpen(false)
      setEditing(null)
      setForm(emptyForm)
      toast.success(wasEdit ? 'پارت با موفقیت ویرایش شد.' : 'پارت جدید با موفقیت ثبت شد.')
      await qc.invalidateQueries({ queryKey: ['goals-bank'] })
      await useAuth.getState().hydrate()
    },
    onError: (e: unknown) => toast.error(apiErr(e, 'خطا در ذخیره پارت')),
  })

  const assignMut = useMutation({
    mutationFn: () => api.post('/goals/bank/assign'),
    onSuccess: async (res) => {
      const count = (res.data as { assigned_count?: number; message?: string })?.assigned_count ?? 0
      toast.success((res.data as { message?: string })?.message || `${count} پارت به شما تخصیص داده شد.`)
      await qc.invalidateQueries({ queryKey: ['goals-bank'] })
      await useAuth.getState().hydrate()
    },
    onError: (e: unknown) => toast.error(apiErr(e, 'خطا در دریافت نوبت')),
  })

  const disposeMut = useMutation({
    mutationFn: async () => {
      if (!disposeItem) return
      if (disposeMode === 'complete') {
        return api.post(`/goals/bank/${disposeItem.id}/complete`, { work_report: disposeText })
      }
      return api.post(`/goals/bank/${disposeItem.id}/fail`, { failure_reason: disposeText })
    },
    onSuccess: async () => {
      const okMsg = disposeMode === 'complete' ? 'انجام‌شدن پارت ثبت شد.' : 'انجام‌نشدن پارت ثبت شد.'
      setDisposeItem(null)
      setDisposeText('')
      toast.success(okMsg)
      await qc.invalidateQueries({ queryKey: ['goals-bank'] })
      await qc.invalidateQueries({ queryKey: ['goals-monitor-parts'] })
      await useAuth.getState().hydrate()
    },
    onError: (e: unknown) => toast.error(apiErr(e, 'خطا در تعیین‌تکلیف')),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/goals/bank/${id}`),
    onSuccess: async () => {
      toast.success('پارت حذف شد.')
      await qc.invalidateQueries({ queryKey: ['goals-bank'] })
    },
    onError: (e: unknown) => toast.error(apiErr(e, 'حذف ممکن نیست')),
  })

  const accessMut = useMutation({
    mutationFn: (payload: {
      user_id: number
      enabled: boolean
      max_concurrent: number
      province?: string | null
      city?: string | null
      role_id?: number
    }) => api.post('/goals/access', payload),
    onSuccess: async (_res, vars) => {
      toast.success(vars.enabled
        ? `دسترسی فعال شد (مشترک همهٔ نقش‌ها) — هر نوبت ${vars.max_concurrent} پارت.`
        : 'دسترسی غیرفعال شد.')
      await qc.invalidateQueries({ queryKey: ['goals-access'] })
      await qc.invalidateQueries({ queryKey: ['goals-monitor-users'] })
    },
    onError: (e: unknown) => toast.error(apiErr(e, 'خطا در ذخیره دسترسی')),
  })

  const importMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/goals/bank/import', fd)
      return data as { imported: number; skipped: number; errors: string[]; message: string }
    },
    onSuccess: async (data) => {
      toast.success(data.message || `${data.imported} پارت وارد شد.`)
      if (data.errors?.length) {
        toast.message(data.errors.slice(0, 3).join(' · '))
      }
      setImportOpen(false)
      await qc.invalidateQueries({ queryKey: ['goals-bank'] })
    },
    onError: (e: unknown) => toast.error(apiErr(e, 'وارد کردن فایل ممکن نشد')),
  })

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/goals/bank/import-template', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'goal-bank-parts-sample.xlsx'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('نمونه اکسل دانلود شد.')
    } catch (e) {
      toast.error(apiErr(e, 'دانلود نمونه ممکن نشد'))
    }
  }

  const mineInProgress = useMemo(
    () => items.filter((i) => i.status === 'in_progress' && i.claimant?.id === user?.id),
    [items, user?.id],
  )

  if ((section === 'access' || section === 'monitor') && !isManager) {
    return <Navigate to={`${dashboardPath(user?.active_role?.slug)}/goals-bank`} replace />
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (item: GoalItem) => {
    setEditing(item)
    setForm({
      name: item.name,
      platform: item.platform,
      platform_url: item.platform_url ?? '',
      audience_count: item.audience_count != null ? String(item.audience_count) : '',
      description: item.description ?? '',
      province: item.province ?? '',
      city: item.city ?? '',
      state_id: '',
      city_id: '',
      address: item.address ?? '',
      phone: item.phone ?? '',
      mobile: item.mobile ?? '',
    })
    setFormOpen(true)
  }

  const cardActions = (item: GoalItem) => {
    const mine = item.claimant?.id === user?.id && item.status === 'in_progress'
    const buttons: ReactNode[] = []
    if (mine) {
      buttons.push(
        <button key="c" type="button" className="btn btn-primary" data-testid={`goal-complete-${item.id}`} onClick={() => { setDisposeItem(item); setDisposeMode('complete'); setDisposeText('') }}>انجام شد</button>,
        <button key="f" type="button" className="btn btn-ghost" data-testid={`goal-fail-${item.id}`} onClick={() => { setDisposeItem(item); setDisposeMode('fail'); setDisposeText('') }}>انجام نشد</button>,
      )
    }
    if (isManager && item.status === 'available') {
      buttons.push(
        <button key="e" type="button" className="btn btn-ghost" onClick={() => openEdit(item)}>ویرایش</button>,
        <button key="d" type="button" className="btn btn-ghost text-rose-600" onClick={() => deleteMut.mutate(item.id)}>حذف</button>,
      )
    }
    return buttons.length ? buttons : null
  }

  if (!isManager && state && !state.enabled) {
    return (
      <div className="space-y-4" data-testid="goals-bank-page">
        <PageHeader title="بانک اهداف" subtitle="دسترسی بانک اهداف برای شما هنوز فعال نشده است (مشترک بین همهٔ نقش‌ها)." />
        <Empty text="دسترسی ندارید" />
      </div>
    )
  }

  const pageTitle = section === 'access'
    ? 'دسترسی بانک اهداف'
    : section === 'monitor'
      ? 'مانیتورینگ پارت‌ها'
      : 'بانک اهداف'

  const pageSub = section === 'access'
    ? 'یک دسترسی مشترک برای هر کاربر (همهٔ نقش‌ها) · استان/شهر برای اولویت تخصیص جغرافیایی.'
    : section === 'monitor'
      ? 'انتخاب کاربر و مشاهده جزئیات پارت‌ها با فیلتر وضعیت.'
      : isManager
        ? 'تعریف پارت‌ها و تخصیص خودکار با اولویت هم‌استان و شهرهای اطراف.'
        : 'سیستم نوبت را با اولویت موقعیت مکانی می‌دهد؛ پس از تعیین‌تکلیف همه، نوبت بعدی آزاد می‌شود.'

  return (
    <div className="space-y-4" data-testid={section === 'bank' ? 'goals-bank-page' : section === 'access' ? 'goals-access-page' : 'goals-monitor-page'}>
      <PageHeader title={pageTitle} subtitle={pageSub} />

      {section === 'bank' && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="تعداد مجاز هر نوبت" value={String(state?.max_concurrent ?? 10)} />
            <StatCard title="در حال انجام" value={String(state?.in_progress ?? 0)} />
            <StatCard title="اندازه نوبت بعدی" value={canReceive ? String(batchSize) : '—'} />
            <StatCard title="مجاز به دریافت نوبت" value={canReceive ? 'بله' : 'خیر'} />
          </div>
          <p className="text-xs text-surface-500 -mt-1 leading-relaxed">
            «تعداد مجاز هر نوبت» یعنی در هر بار دریافت، سیستم همین تعداد پارت آزاد را از اول صف برمی‌دارد و به شما می‌دهد.
          </p>

          <div className="card p-4 flex flex-wrap gap-3 items-end">
            <label className="field grow min-w-[10rem]">
              جستجو
              <input className="input" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="نام، پلتفرم، شهر…" data-testid="goals-search" />
            </label>
            <label className="field">
              محدوده
              <select className="input" value={scope} onChange={(e) => { setScope(e.target.value); setPage(1) }} data-testid="goals-scope">
                {isManager && <option value="all">همه پارت‌ها</option>}
                {isManager && <option value="available">آزاد در صف</option>}
                <option value="in_progress">{isManager ? 'در حال انجام (کل)' : 'نوبت جاری'}</option>
                {!isManager && <option value="history">تاریخچه (انجام‌شده / نشده)</option>}
                {!isManager && <option value="all">همه وضعیت‌های من</option>}
                {isManager && <option value="mine">پارت‌های دریافتی خودم</option>}
              </select>
            </label>
            <button type="button" className="btn btn-primary" data-testid="goals-assign" disabled={!canReceive || assignMut.isPending} onClick={() => assignMut.mutate()}>
              {assignMut.isPending ? 'در حال تخصیص…' : `دریافت نوبت (${batchSize} پارت)`}
            </button>
            {isManager && (
              <>
                <button type="button" className="btn btn-ghost" data-testid="goals-create" onClick={openCreate}>تعریف پارت جدید</button>
                <button type="button" className="btn btn-ghost" data-testid="goals-import" onClick={() => setImportOpen(true)}>ورود یکجای اکسل</button>
              </>
            )}
          </div>

          {!canReceive && (state?.in_progress ?? 0) > 0 && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              نوبت جاری باز است ({state?.in_progress}/{state?.max_concurrent}). ابتدا همهٔ پارت‌های در حال انجام را تعیین‌تکلیف کنید.
            </div>
          )}

          {items.length === 0 ? (
            <Empty text={isManager ? 'موردی نیست' : 'هنوز پارتی به شما تخصیص داده نشده. با دکمهٔ «دریافت نوبت» شروع کنید.'} />
          ) : (
            <div className="grid gap-4 grid-cols-1 xl:grid-cols-2 items-stretch">
              {items.map((item) => <GoalPartCard key={item.id} item={item} footer={cardActions(item)} />)}
            </div>
          )}

          {listQ.data?.meta && listQ.data.meta.total > 0 && (
            <TablePager page={listQ.data.meta.current_page} last={listQ.data.meta.last_page} total={listQ.data.meta.total} onPage={setPage} />
          )}
          {mineInProgress.length > 0 && <div className="text-xs text-surface-500">پارت‌های جاری شما در این صفحه: {mineInProgress.length}</div>}
        </>
      )}

      {section === 'access' && isManager && (
        <div className="space-y-4" data-testid="goals-access-panel">
          <div className="card p-4 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="field grow min-w-[14rem]">
                جستجوی کاربر
                <input className="input" value={accessSearch} onChange={(e) => setAccessSearch(e.target.value)} placeholder="نام، کد ملی، موبایل، ایمیل…" data-testid="goals-access-search" />
              </label>
              <div className="text-xs text-surface-500 pb-2">
                {accessQ.isFetching ? 'در حال جستجو…' : accessQ.data?.meta
                  ? `${accessQ.data.meta.total.toLocaleString('fa-IR')} کاربر · صفحه ${accessQ.data.meta.current_page.toLocaleString('fa-IR')}`
                  : null}
              </div>
            </div>
            <p className="text-xs text-surface-500 m-0">
              دسترسی بانک اهداف برای هر کاربر یک‌بار تعریف می‌شود و بین همهٔ نقش‌ها/پنل‌های او مشترک است.
              «تعداد مجاز هر نوبت» سقف هر دریافت خودکار است (پیش‌فرض ۱۰). استان/شهر برای اولویت تخصیص جغرافیایی ذخیره می‌شود.
            </p>
          </div>

          {(accessQ.data?.data ?? []).map((row) => (
            <div key={row.user_id} className="card p-4 space-y-3" data-testid={`goals-access-user-${row.user_id}`}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <div className="font-medium text-surface-800 dark:text-surface-100">{row.name}</div>
                <span className="text-surface-500 text-sm" dir="ltr">{row.mobile}</span>
                {row.national_id && <span className="text-surface-400 text-xs" dir="ltr">کد ملی: {row.national_id}</span>}
              </div>
              {row.roles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {row.roles.map((role) => (
                    <span key={role.role_id} className="text-[11px] px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                      {role.role_name}
                    </span>
                  ))}
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-[auto_auto_1fr_1fr_auto] gap-2 items-end border-t border-surface-100 dark:border-surface-700 pt-3">
                <label className="field !mb-0">
                  دسترسی
                  <select
                    className="input min-w-[6rem]"
                    value={row.enabled ? '1' : '0'}
                    data-testid={`goals-access-enabled-${row.user_id}`}
                    onChange={(e) => accessMut.mutate({
                      user_id: row.user_id,
                      enabled: e.target.value === '1',
                      max_concurrent: row.max_concurrent,
                      province: row.province ?? null,
                      city: row.city ?? null,
                      role_id: row.roles[0]?.role_id,
                    })}
                  >
                    <option value="0">خاموش</option>
                    <option value="1">روشن</option>
                  </select>
                </label>
                <label className="field !mb-0">
                  تعداد مجاز هر نوبت
                  <input
                    className="input w-28"
                    type="number"
                    min={1}
                    max={500}
                    defaultValue={row.max_concurrent}
                    key={`max-${row.user_id}-${row.max_concurrent}`}
                    data-testid={`goals-access-max-${row.user_id}`}
                    onBlur={(e) => {
                      const max = Number(e.target.value)
                      if (!Number.isFinite(max) || max < 1) return
                      if (max === row.max_concurrent) return
                      accessMut.mutate({
                        user_id: row.user_id,
                        enabled: row.enabled,
                        max_concurrent: max,
                        province: row.province ?? null,
                        city: row.city ?? null,
                        role_id: row.roles[0]?.role_id,
                      })
                    }}
                  />
                </label>
                <AccessGeoFields
                  row={row}
                  states={states}
                  onSave={(province, city) => accessMut.mutate({
                    user_id: row.user_id,
                    enabled: row.enabled,
                    max_concurrent: row.max_concurrent,
                    province,
                    city,
                    role_id: row.roles[0]?.role_id,
                  })}
                />
                <div className="text-xs text-surface-500 pb-2 sm:text-left">جاری: {row.in_progress}</div>
              </div>
            </div>
          ))}

          {(accessQ.data?.data?.length ?? 0) === 0 && !accessQ.isFetching && (
            <Empty text={accessSearchQ ? 'کاربری با این جستجو یافت نشد' : 'کاربری یافت نشد'} />
          )}

          {accessQ.data?.meta && accessQ.data.meta.total > 0 && (
            <TablePager page={accessQ.data.meta.current_page} last={accessQ.data.meta.last_page} total={accessQ.data.meta.total} onPage={setAccessPage} />
          )}
        </div>
      )}

      {section === 'monitor' && isManager && (
        <div className="space-y-4" data-testid="goals-monitor-panel">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[minmax(16rem,19rem)_minmax(0,1fr)]">
            <aside className="card p-0 overflow-hidden flex flex-col min-h-[14rem] max-h-[22rem] lg:max-h-[calc(100svh-12rem)] lg:min-h-[24rem]" data-testid="goals-monitor-sidebar">
              <div className="p-4 border-b border-surface-100 dark:border-surface-700 space-y-2 bg-surface-50/80 dark:bg-surface-900/40 shrink-0">
                <div className="text-sm font-semibold text-surface-800 dark:text-surface-100">انتخاب کاربر</div>
                <label className="field !mb-0">
                  جستجو
                  <input
                    className="input"
                    value={monitorSearch}
                    onChange={(e) => setMonitorSearch(e.target.value)}
                    placeholder="نام، موبایل، کد ملی…"
                    data-testid="goals-monitor-search"
                  />
                </label>
                <div className="text-[11px] text-surface-500" data-testid="goals-monitor-users-meta">
                  {monitorUsersQ.isFetching
                    ? 'در حال بارگذاری…'
                    : monitorUsersQ.data?.meta
                      ? `${monitorUsersQ.data.meta.total.toLocaleString('fa-IR')} کاربر · صفحه ${monitorUsersQ.data.meta.current_page.toLocaleString('fa-IR')} از ${monitorUsersQ.data.meta.last_page.toLocaleString('fa-IR')}`
                      : null}
                </div>
                <p className="text-[11px] text-surface-400 m-0 leading-relaxed">هر صفحه حداکثر ۱۵ کاربر؛ برای سازمان‌های بزرگ حتماً جستجو کنید.</p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-700 min-h-0" data-testid="goals-monitor-picks">
                {(monitorUsersQ.data?.data ?? []).map((row) => {
                  const active = monitorUser?.user_id === row.user_id
                  const openCount = row.in_progress || 0
                  return (
                    <button
                      key={row.user_id}
                      type="button"
                      data-testid={`goals-monitor-pick-${row.user_id}`}
                      className={`w-full text-start px-4 py-3 transition-colors ${active ? 'bg-primary-50 dark:bg-primary-950/40 border-s-4 border-primary-500' : 'hover:bg-surface-50 dark:hover:bg-surface-800/60 border-s-4 border-transparent'}`}
                      onClick={() => {
                        setMonitorUser(row)
                        setMonitorPage(1)
                      }}
                    >
                      <div className="font-medium text-surface-800 dark:text-surface-100 truncate">{row.name}</div>
                      <div className="text-xs text-surface-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span dir="ltr">{row.mobile}</span>
                        {row.national_id && <span dir="ltr">کد ملی {row.national_id}</span>}
                      </div>
                      <div className="text-[11px] text-surface-400 mt-1">پارت جاری: {openCount.toLocaleString('fa-IR')}</div>
                    </button>
                  )
                })}
                {(monitorUsersQ.data?.data?.length ?? 0) === 0 && !monitorUsersQ.isFetching && (
                  <div className="p-4 text-sm text-surface-500">کاربری یافت نشد.</div>
                )}
              </div>
              {monitorUsersQ.data?.meta && monitorUsersQ.data.meta.last_page > 1 && (
                <div className="p-3 border-t border-surface-100 dark:border-surface-700 shrink-0" data-testid="goals-monitor-users-pager">
                  <TablePager
                    page={monitorUsersQ.data.meta.current_page}
                    last={monitorUsersQ.data.meta.last_page}
                    total={monitorUsersQ.data.meta.total}
                    onPage={setMonitorUsersPage}
                  />
                </div>
              )}
            </aside>

            <section className="space-y-3 min-w-0">
              <div className="card p-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  {monitorUser ? (
                    <div data-testid="goals-monitor-selected">
                      <div className="text-xs text-surface-400 mb-0.5">در حال مشاهده</div>
                      <div className="font-semibold text-surface-800 dark:text-surface-100 truncate">{monitorUser.name}</div>
                      <div className="text-sm text-surface-500" dir="ltr">{monitorUser.mobile}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-surface-500">از فهرست کاربران یک نفر را انتخاب کنید.</div>
                  )}
                </div>
                <label className="field !mb-0 w-full sm:w-auto sm:min-w-[11rem]">
                  فیلتر وضعیت
                  <select
                    className="input"
                    value={monitorStatus}
                    data-testid="goals-monitor-status"
                    onChange={(e) => {
                      setMonitorStatus(e.target.value as '' | GoalStatus)
                      setMonitorPage(1)
                    }}
                  >
                    <option value="">همه وضعیت‌ها</option>
                    <option value="in_progress">در حال انجام</option>
                    <option value="completed">انجام‌شده</option>
                    <option value="failed">انجام‌نشده</option>
                  </select>
                </label>
              </div>

              {!monitorUser ? (
                <Empty text="برای دیدن پارت‌ها ابتدا کاربر را انتخاب کنید." />
              ) : monitorPartsQ.isFetching && !monitorPartsQ.data ? (
                <div className="card p-8 text-center text-surface-500 text-sm">در حال دریافت پارت‌ها…</div>
              ) : (monitorPartsQ.data?.data?.length ?? 0) === 0 ? (
                <Empty text="پارتی با این فیلتر برای کاربر یافت نشد." />
              ) : (
                <div className="grid gap-4 grid-cols-1 xl:grid-cols-2 items-stretch">
                  {(monitorPartsQ.data?.data ?? []).map((item) => (
                    <GoalPartCard key={item.id} item={item} />
                  ))}
                </div>
              )}

              {monitorPartsQ.data?.meta && monitorPartsQ.data.meta.total > 0 && (
                <TablePager page={monitorPartsQ.data.meta.current_page} last={monitorPartsQ.data.meta.last_page} total={monitorPartsQ.data.meta.total} onPage={setMonitorPage} />
              )}
            </section>
          </div>
        </div>
      )}

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="ورود یکجای پارت‌ها از اکسل" subtitle="تا ۱۵٬۰۰۰ ردیف در هر فایل · ستون‌ها مطابق نمونه">
        <div className="space-y-4" data-testid="goals-import-modal">
          <p className="text-sm text-surface-600 dark:text-surface-300 m-0 leading-relaxed">
            ابتدا نمونه را دانلود کنید، لیست پارت‌ها را روی همان ستون‌ها پر کنید، سپس فایل <span dir="ltr">.xlsx</span> یا <span dir="ltr">.csv</span> را آپلود کنید.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" data-testid="goals-import-sample" onClick={() => void downloadTemplate()}>
              دانلود نمونه اکسل
            </button>
          </div>
          <label className="field">
            فایل اکسل / CSV
            <input
              className="input"
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              data-testid="goals-import-file"
              disabled={importMut.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) importMut.mutate(file)
              }}
            />
          </label>
          {importMut.isPending && <div className="text-sm text-surface-500">در حال وارد کردن… ممکن است برای فایل‌های بزرگ چند لحظه طول بکشد.</div>}
          <div className="flex justify-end">
            <button type="button" className="btn btn-ghost" onClick={() => setImportOpen(false)}>بستن</button>
          </div>
        </div>
      </Modal>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'ویرایش پارت' : 'پارت جدید'} subtitle="استان و شهر از فهرست فینوپال انتخاب می‌شوند." wide>
        <div className="grid sm:grid-cols-2 gap-3" data-testid="goals-form">
          <label className="field">نام *<input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} data-testid="goals-field-name" /></label>
          <label className="field">پلتفرم *<input className="input" value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} data-testid="goals-field-platform" /></label>
          <label className="field">آدرس پلتفرم<input className="input" value={form.platform_url} onChange={(e) => setForm((f) => ({ ...f, platform_url: e.target.value }))} data-testid="goals-field-platform_url" /></label>
          <label className="field">تعداد مخاطبین<input className="input" type="number" min={0} value={form.audience_count} onChange={(e) => setForm((f) => ({ ...f, audience_count: e.target.value }))} data-testid="goals-field-audience_count" /></label>
          <label className="field">
            استان
            <SearchSelect
              value={form.state_id}
              placeholder={states.length ? 'انتخاب استان' : 'در حال دریافت…'}
              options={states.map((s) => ({ value: String(s.id), label: s.title }))}
              onChange={(id) => {
                const title = states.find((s) => String(s.id) === id)?.title ?? ''
                setForm((prev) => ({ ...prev, state_id: id, province: title, city_id: '', city: '' }))
              }}
              testId="goals-field-province"
            />
          </label>
          <label className="field">
            شهر
            <SearchSelect
              value={form.city_id}
              disabled={!form.state_id}
              placeholder={form.state_id ? 'انتخاب شهر' : 'اول استان'}
              options={cities.map((c) => ({ value: String(c.id), label: c.title }))}
              onChange={(id) => {
                const title = cities.find((c) => String(c.id) === id)?.title ?? ''
                setForm((prev) => ({ ...prev, city_id: id, city: title }))
              }}
              testId="goals-field-city"
            />
          </label>
          <label className="field sm:col-span-2">آدرس دقیق<input className="input" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} data-testid="goals-field-address" /></label>
          <label className="field">شماره تماس<input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} data-testid="goals-field-phone" /></label>
          <label className="field">شماره موبایل<input className="input" value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))} data-testid="goals-field-mobile" /></label>
          <label className="field sm:col-span-2">توضیحات<textarea className="input min-h-[4rem]" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} data-testid="goals-field-description" /></label>
          <div className="sm:col-span-2"><FieldHint>نماینده‌ها پارت را انتخاب نمی‌کنند؛ سیستم از اول صف به‌اندازهٔ مجاز هر کاربر تخصیص می‌دهد.</FieldHint></div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>انصراف</button>
            <button type="button" className="btn btn-primary" data-testid="goals-save" disabled={saveMut.isPending || !form.name.trim() || !form.platform.trim()} onClick={() => saveMut.mutate()}>
              {saveMut.isPending ? 'در حال ذخیره…' : 'ذخیره'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!disposeItem} onClose={() => setDisposeItem(null)} title={disposeMode === 'complete' ? 'ثبت انجام‌شده' : 'ثبت انجام‌نشده'}>
        <div className="space-y-3" data-testid="goals-dispose-form">
          <label className="field">
            {disposeMode === 'complete' ? 'گزارش کار *' : 'علت انجام‌نشدن *'}
            <textarea className="input min-h-[6rem]" value={disposeText} onChange={(e) => setDisposeText(e.target.value)} data-testid="goals-dispose-text" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setDisposeItem(null)}>انصراف</button>
            <button type="button" className="btn btn-primary" data-testid="goals-dispose-submit" disabled={disposeMut.isPending || disposeText.trim().length < 3} onClick={() => disposeMut.mutate()}>ثبت</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export function GoalsBankPage() {
  return <GoalsBankSection section="bank" />
}

export function GoalsAccessPage() {
  return <GoalsBankSection section="access" />
}

export function GoalsMonitorPage() {
  return <GoalsBankSection section="monitor" />
}
