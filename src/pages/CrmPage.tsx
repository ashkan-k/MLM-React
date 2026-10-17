import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CalendarDays, Check, Eye, MapPin, MessageSquare, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLocation, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { JalaliDatePicker } from '../components/JalaliDatePicker'
import { JalaliDateTimePicker } from '../components/JalaliDateTimePicker'
import { Badge, Modal, PageHeader } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../stores/auth'
import { confirmAction } from '../lib/confirm'
import { api } from '../lib/api'
import { dateTime, jalaliDateOnly } from '../lib/format'

type VisitLog = {
  id: number
  body: string
  created_at?: string | null
}

type Visit = {
  id: number
  visited_on: string
  activity_type?: string
  status?: string
  place: string
  person_name: string
  national_id?: string | null
  mobile?: string | null
  result?: string | null
  remind_at?: string | null
  remind_at_input?: string | null
  notify_in_app: boolean
  notify_sms: boolean
  reminded_at?: string | null
  logs_count?: number
  logs?: VisitLog[]
}

type Task = {
  id: number
  title: string
  priority?: string
  notes?: string | null
  due_at?: string | null
  due_at_input?: string | null
  notify_in_app: boolean
  notify_sms: boolean
  reminded_at?: string | null
  completed_at?: string | null
}

type VisitForm = {
  visited_on: string
  activity_type: string
  status: string
  place: string
  person_name: string
  national_id: string
  mobile: string
  result: string
  remind_at: string
  notify_in_app: boolean
  notify_sms: boolean
}

type TaskForm = {
  title: string
  priority: string
  notes: string
  due_at: string
  notify_in_app: boolean
  notify_sms: boolean
}

type CrmData = { visits: Visit[]; tasks: Task[]; open_tasks: number }

function todayIso() {
  const date = new Date()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

const ACTIVITY_TYPE: Record<string, string> = { visit: 'مراجعه', call: 'تماس', meeting: 'جلسه' }

const emptyVisit = (): VisitForm => ({
  visited_on: todayIso(),
  activity_type: 'visit',
  status: 'open',
  place: '',
  person_name: '',
  national_id: '',
  mobile: '',
  result: '',
  remind_at: '',
  notify_in_app: true,
  notify_sms: false,
})

const emptyTask = (): TaskForm => ({
  title: '',
  priority: 'normal',
  notes: '',
  due_at: '',
  notify_in_app: true,
  notify_sms: false,
})

function channels(inApp: boolean, sms: boolean) {
  return [inApp ? 'اعلان' : '', sms ? 'پیامک' : ''].filter(Boolean).join(' و ')
}

function ReminderLine({ at, inApp, sms, sent }: { at: string; inApp: boolean; sms: boolean; sent?: string | null }) {
  return (
    <span className="datetime-ltr" dir="ltr">
      {dateTime(at)} · {channels(inApp, sms)}{sent ? ' · ارسال شد' : ''}
    </span>
  )
}

function FilterBar({ q, onQ, placeholder, testId, filter, onFilter, openCount }: {
  q: string
  onQ: (value: string) => void
  placeholder: string
  testId: string
  filter: 'open' | 'done' | 'all'
  onFilter: (value: 'open' | 'done' | 'all') => void
  openCount?: number
}) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <input className="input w-full min-w-0" data-testid="crm-search" placeholder={placeholder} value={q} onChange={(e) => onQ(e.target.value)} />
      <div className="flex flex-wrap gap-1">
        {([['open', 'باز'], ['done', 'انجام‌شده'], ['all', 'همه']] as const).map(([key, label]) => (
          <button key={key} type="button" data-testid={`${testId}-${key}`} className={`btn ${filter === key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onFilter(key)}>
            {label}{key === 'open' && openCount !== undefined ? ` ${openCount}` : ''}
          </button>
        ))}
      </div>
    </div>
  )
}

function useCrm(q: string) {
  const qc = useQueryClient()
  const roleId = useAuth((s) => s.user?.active_role?.id)
  const query = useQuery({
    queryKey: ['crm', roleId, q],
    enabled: Boolean(roleId),
    queryFn: async () => (await api.get('/crm', { params: { q: q.trim() || undefined } })).data as CrmData,
  })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['crm'] })
    qc.invalidateQueries({ queryKey: ['notif-unread'] })
  }
  return { ...query, refresh }
}

function errorText(error: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }, fallback: string) {
  const errors = error.response?.data?.errors
  return errors?.body?.[0] ?? errors?.notify_in_app?.[0] ?? errors?.place?.[0] ?? errors?.person_name?.[0] ?? errors?.title?.[0] ?? error.response?.data?.message ?? fallback
}

function IconBtn({ label, tone = 'edit', onClick, children }: {
  label: string
  tone?: 'edit' | 'danger'
  onClick: () => void
  children: ReactNode
}) {
  const toneClass = tone === 'danger'
    ? 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10'
    : 'hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-900/30'
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`w-8 h-8 rounded-lg inline-flex items-center justify-center text-surface-400 shrink-0 ${toneClass}`}>
      {children}
    </button>
  )
}

function MetaChip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1 max-w-full min-w-0 overflow-hidden rounded-lg bg-surface-50 dark:bg-surface-900/70 px-2 py-1 text-xs text-surface-600 dark:text-surface-300">{children}</span>
}

function ClampBox({ text, empty, label, onOpen }: { text?: string | null; empty: string; label: string; onOpen: () => void }) {
  const value = text?.trim() ?? ''
  return (
    <button type="button" aria-label={label} onClick={onOpen} className="mx-4 mb-4 block w-[calc(100%-2rem)] rounded-xl bg-surface-50 px-3 py-2.5 text-start text-sm hover:bg-surface-100 dark:bg-surface-900/60 dark:hover:bg-surface-900">
      <span className={`line-clamp-2 min-h-12 leading-6 break-words ${value ? 'text-surface-700 dark:text-surface-200' : 'text-surface-400'}`}>{value || empty}</span>
    </button>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-sm min-w-0">
      <div className="text-surface-400">{label}</div>
      <div className="wrap-anywhere text-surface-800 dark:text-surface-100">{children}</div>
    </div>
  )
}

function ReminderChoices({
  inApp, sms, onInApp, onSms, notifyId, smsId,
}: {
  inApp: boolean
  sms: boolean
  onInApp: (value: boolean) => void
  onSms: (value: boolean) => void
  notifyId: string
  smsId: string
}) {
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" data-testid={notifyId} checked={inApp} onChange={(e) => onInApp(e.target.checked)} /> اعلان داخل سامانه</label>
      <label className="flex items-center gap-2"><input type="checkbox" data-testid={smsId} checked={sms} onChange={(e) => onSms(e.target.checked)} /> پیامک</label>
    </div>
  )
}

export function CrmIndexRedirect() {
  const { pathname } = useLocation()
  return <Navigate to={`${pathname.replace(/\/$/, '')}/activities`} replace />
}

export function CrmActivitiesPage() {
  const { t } = useApp()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<VisitForm>(emptyVisit())
  const [editing, setEditing] = useState<number | null>(null)
  const { data, isLoading, refresh } = useCrm(q)

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, remind_at: form.remind_at || null }
      if (editing) return api.put(`/crm/visits/${editing}`, payload)
      return api.post('/crm/visits', payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'به‌روز شد' : 'ثبت شد')
      setOpen(false)
      refresh()
    },
    onError: (error: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      toast.error(errorText(error, 'ثبت انجام نشد'))
    },
  })
  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/crm/visits/${id}`),
    onSuccess: () => { toast.success('حذف شد'); refresh() },
  })

  const askRemove = async (visit: Visit) => {
    if (!await confirmAction({ title: 'حذف', text: `«${visit.person_name}» حذف شود؟`, confirmText: 'حذف شود' })) return
    remove.mutate(visit.id)
  }

  const openForm = (visit?: Visit) => {
    setEditing(visit?.id ?? null)
    setForm(visit ? {
      visited_on: visit.visited_on,
      activity_type: visit.activity_type || 'visit',
      status: visit.status || 'open',
      place: visit.place,
      person_name: visit.person_name,
      national_id: visit.national_id ?? '',
      mobile: visit.mobile ?? '',
      result: visit.result ?? '',
      remind_at: visit.remind_at_input ?? '',
      notify_in_app: visit.notify_in_app,
      notify_sms: visit.notify_sms,
    } : emptyVisit())
    setOpen(true)
  }

  const openDetail = (id: number) => navigate(`${pathname.replace(/\/$/, '')}/${id}`)

  const visits = (data?.visits ?? []).filter((visit) => {
    if (filter === 'done') return visit.status === 'done'
    if (filter === 'open') return visit.status !== 'done'
    return true
  })

  return (
    <div className="space-y-4" data-testid="crm-activities-page">
      <PageHeader
        title={t('navCrmActivities')}
        subtitle={t('crmActivitiesSub')}
        action={<button type="button" className="btn btn-primary w-full sm:w-auto" data-testid="crm-visit-open" onClick={() => openForm()}><Plus className="w-4 h-4" /> ثبت جدید</button>}
      />
      <FilterBar q={q} onQ={setQ} placeholder="جستجوی مخاطب، موبایل، کد ملی یا مکان" testId="crm-visit-filter" filter={filter} onFilter={setFilter} />
      {isLoading && <div className="text-sm text-surface-500">در حال بارگذاری...</div>}
      {!isLoading && visits.length === 0 && <div className="card p-8 text-center text-sm text-surface-500">هنوز موردی ثبت نشده است.</div>}
      <div className="grid md:grid-cols-2 gap-3 min-w-0 items-stretch">
        {visits.map((visit) => (
          <article key={visit.id} data-testid="crm-visit-row" className="card overflow-hidden h-full flex flex-col">
            <div className="flex items-start gap-3 p-4 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 inline-flex items-center justify-center shrink-0">
                {visit.activity_type === 'call' ? <Phone className="w-4 h-4" /> : visit.activity_type === 'meeting' ? <CalendarDays className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" className="block min-w-0 flex-1 text-start font-semibold leading-6 line-clamp-1 break-all text-surface-800 dark:text-surface-100" onClick={() => openDetail(visit.id)}>{visit.person_name}</button>
                  <div className="flex items-center shrink-0">
                    <IconBtn label="مشاهده فعالیت" onClick={() => openDetail(visit.id)}><Eye className="w-4 h-4" /></IconBtn>
                    <IconBtn label="ویرایش فعالیت" onClick={() => openForm(visit)}><Pencil className="w-4 h-4" /></IconBtn>
                    <IconBtn label="حذف فعالیت" tone="danger" onClick={() => askRemove(visit)}><Trash2 className="w-4 h-4" /></IconBtn>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge tone="muted">{ACTIVITY_TYPE[visit.activity_type || 'visit']}</Badge>
                  {filter === 'all' && <Badge tone={visit.status === 'done' ? 'ok' : 'info'}>{visit.status === 'done' ? 'انجام‌شده' : 'باز'}</Badge>}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <MetaChip><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{visit.place}</span></MetaChip>
                  <MetaChip><span className="datetime-ltr truncate" dir="ltr">{jalaliDateOnly(visit.visited_on)}</span></MetaChip>
                  {visit.mobile && <MetaChip><Phone className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{visit.mobile}</span></MetaChip>}
                  {visit.national_id && <MetaChip><span className="truncate">کد ملی {visit.national_id}</span></MetaChip>}
                  {(visit.logs_count ?? 0) > 0 && <MetaChip>{visit.logs_count} گزارش</MetaChip>}
                </div>
              </div>
            </div>
            <ClampBox text={visit.result} empty="نتیجه‌ای ثبت نشده" label="مشاهده نتیجه" onOpen={() => openDetail(visit.id)} />
            {visit.remind_at && (
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-surface-100 dark:border-surface-700 bg-primary-50/70 dark:bg-primary-900/25 px-4 py-2.5 text-xs text-primary-800 dark:text-primary-200 min-w-0">
                {visit.notify_sms ? <MessageSquare className="w-3.5 h-3.5 shrink-0" /> : <Bell className="w-3.5 h-3.5 shrink-0" />}
                <ReminderLine at={visit.remind_at} inApp={visit.notify_in_app} sms={visit.notify_sms} sent={visit.reminded_at} />
              </div>
            )}
          </article>
        ))}
      </div>

      <Modal open={open} title={editing ? 'ویرایش' : 'ثبت جدید'} subtitle="یادآور برای خودتان است، نه برای مخاطب." onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="field">نوع فعالیت
              <select className="input" data-testid="crm-visit-type" value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })}>
                <option value="visit">مراجعه</option>
                <option value="call">تماس</option>
                <option value="meeting">جلسه</option>
              </select>
            </label>
            <label className="field">وضعیت
              <select className="input" data-testid="crm-visit-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="open">باز</option>
                <option value="done">انجام‌شده</option>
              </select>
            </label>
          </div>
          <label className="field">مخاطب
            <input className="input" data-testid="crm-visit-person" value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} />
          </label>
          <label className="field">مکان
            <input className="input" data-testid="crm-visit-place" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="field">موبایل
              <input className="input" data-testid="crm-visit-mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </label>
            <label className="field">کد ملی
              <input className="input" data-testid="crm-visit-national" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
            </label>
          </div>
          <label className="field">تاریخ فعالیت
            <JalaliDatePicker testId="crm-visit-date" value={form.visited_on} onChange={(visited_on) => setForm({ ...form, visited_on })} allowClear={false} />
          </label>
          <label className="field">نتیجه
            <textarea className="input min-h-20" data-testid="crm-visit-result" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
          </label>
          <label className="field">یادآور
            <JalaliDateTimePicker testId="crm-visit-remind" value={form.remind_at} onChange={(remind_at) => setForm({ ...form, remind_at })} />
          </label>
          <ReminderChoices inApp={form.notify_in_app} sms={form.notify_sms} notifyId="crm-visit-notify" smsId="crm-visit-sms" onInApp={(notify_in_app) => setForm({ ...form, notify_in_app })} onSms={(notify_sms) => setForm({ ...form, notify_sms })} />
          <button type="button" className="btn btn-primary" data-testid="crm-visit-save" disabled={save.isPending} onClick={() => save.mutate()}>ذخیره</button>
        </div>
      </Modal>
    </div>
  )
}

export function CrmActivityDetailPage() {
  const { visitId } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const qc = useQueryClient()
  const roleId = useAuth((s) => s.user?.active_role?.id)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<VisitForm>(emptyVisit())
  const [note, setNote] = useState('')
  const id = Number(visitId)
  const listPath = pathname.replace(/\/\d+$/, '')

  const query = useQuery({
    queryKey: ['crm-visit', roleId, id],
    enabled: Boolean(roleId) && Number.isFinite(id) && id > 0,
    queryFn: async () => (await api.get(`/crm/visits/${id}`)).data as Visit,
  })
  const visit = query.data

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['crm-visit', roleId, id] })
    qc.invalidateQueries({ queryKey: ['crm'] })
  }

  const save = useMutation({
    mutationFn: async () => api.put(`/crm/visits/${id}`, { ...form, remind_at: form.remind_at || null }),
    onSuccess: () => {
      toast.success('به‌روز شد')
      setOpen(false)
      refresh()
    },
    onError: (error: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      toast.error(errorText(error, 'ثبت انجام نشد'))
    },
  })
  const remove = useMutation({
    mutationFn: async () => api.delete(`/crm/visits/${id}`),
    onSuccess: () => {
      toast.success('حذف شد')
      qc.invalidateQueries({ queryKey: ['crm'] })
      navigate(listPath)
    },
  })
  const addLog = useMutation({
    mutationFn: async () => api.post(`/crm/visits/${id}/logs`, { body: note.trim() }),
    onSuccess: () => {
      toast.success('گزارش ثبت شد')
      setNote('')
      refresh()
    },
    onError: (error: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      toast.error(errorText(error, 'ثبت گزارش انجام نشد'))
    },
  })
  const removeLog = useMutation({
    mutationFn: async (logId: number) => api.delete(`/crm/visits/${id}/logs/${logId}`),
    onSuccess: () => {
      toast.success('گزارش حذف شد')
      refresh()
    },
  })

  const openForm = () => {
    if (!visit) return
    setForm({
      visited_on: visit.visited_on,
      activity_type: visit.activity_type || 'visit',
      status: visit.status || 'open',
      place: visit.place,
      person_name: visit.person_name,
      national_id: visit.national_id ?? '',
      mobile: visit.mobile ?? '',
      result: visit.result ?? '',
      remind_at: visit.remind_at_input ?? '',
      notify_in_app: visit.notify_in_app,
      notify_sms: visit.notify_sms,
    })
    setOpen(true)
  }

  const askRemove = async () => {
    if (!visit) return
    if (!await confirmAction({ title: 'حذف', text: `«${visit.person_name}» حذف شود؟`, confirmText: 'حذف شود' })) return
    remove.mutate()
  }

  const askRemoveLog = async (log: VisitLog) => {
    if (!await confirmAction({ title: 'حذف گزارش', text: 'این گزارش حذف شود؟', confirmText: 'حذف شود' })) return
    removeLog.mutate(log.id)
  }

  return (
    <div className="space-y-4" data-testid="crm-activity-page">
      <button type="button" className="btn btn-ghost" data-testid="crm-activity-back" onClick={() => navigate(listPath)}>بازگشت به فهرست</button>
      {query.isLoading && <div className="text-sm text-surface-500">در حال بارگذاری...</div>}
      {query.isError && <div className="card p-8 text-center text-sm text-surface-500">این مورد پیدا نشد.</div>}
      {visit && (
        <>
          <PageHeader
            title={visit.person_name}
            subtitle={visit.place}
            action={(
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost" aria-label="ویرایش فعالیت" onClick={openForm}><Pencil className="w-4 h-4" /> ویرایش</button>
                <button type="button" className="btn btn-ghost text-rose-600" aria-label="حذف فعالیت" onClick={askRemove}><Trash2 className="w-4 h-4" /> حذف</button>
              </div>
            )}
          />
          <article className="card p-4 grid gap-3 min-w-0">
            <div className="flex flex-wrap gap-1">
              <Badge tone="muted">{ACTIVITY_TYPE[visit.activity_type || 'visit']}</Badge>
              <Badge tone={visit.status === 'done' ? 'ok' : 'info'}>{visit.status === 'done' ? 'انجام‌شده' : 'باز'}</Badge>
            </div>
            <DetailRow label="تاریخ"><span className="datetime-ltr" dir="ltr">{jalaliDateOnly(visit.visited_on)}</span></DetailRow>
            {visit.mobile && <DetailRow label="موبایل">{visit.mobile}</DetailRow>}
            {visit.national_id && <DetailRow label="کد ملی">{visit.national_id}</DetailRow>}
            <DetailRow label="نتیجه"><span className="whitespace-pre-wrap">{visit.result?.trim() || 'نتیجه‌ای ثبت نشده'}</span></DetailRow>
            {visit.remind_at && <DetailRow label="یادآور"><ReminderLine at={visit.remind_at} inApp={visit.notify_in_app} sms={visit.notify_sms} sent={visit.reminded_at} /></DetailRow>}
          </article>
          <section className="card p-4 space-y-3 min-w-0">
            <div className="font-semibold text-surface-800 dark:text-surface-100">گزارش‌های پیگیری</div>
            <p className="text-xs text-surface-500 m-0">هر بار که پرزنت را ادامه می‌دهید، یک گزارش جدید بنویسید؛ مثلاً ورود به مرحلهٔ بعد.</p>
            <textarea className="input min-h-24" data-testid="crm-log-body" placeholder="مثلاً وارد مرحله ۲ شد" value={note} onChange={(e) => setNote(e.target.value)} />
            <button type="button" className="btn btn-primary" data-testid="crm-log-save" disabled={addLog.isPending || note.trim() === ''} onClick={() => addLog.mutate()}>ثبت گزارش</button>
            {(visit.logs ?? []).length === 0 && <div className="text-sm text-surface-500">هنوز گزارشی ثبت نشده است.</div>}
            <div className="grid gap-2">
              {(visit.logs ?? []).map((log) => (
                <div key={log.id} data-testid="crm-log-row" className="rounded-xl bg-surface-50 dark:bg-surface-900/60 px-3 py-2.5 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-6 m-0 wrap-anywhere text-surface-700 dark:text-surface-200 whitespace-pre-wrap">{log.body}</p>
                    <IconBtn label="حذف گزارش" tone="danger" onClick={() => askRemoveLog(log)}><Trash2 className="w-4 h-4" /></IconBtn>
                  </div>
                  {log.created_at && <div className="text-xs text-surface-400 mt-1"><span className="datetime-ltr" dir="ltr">{dateTime(log.created_at)}</span></div>}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      <Modal open={open} title="ویرایش" subtitle="یادآور برای خودتان است، نه برای مخاطب." onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="field">نوع فعالیت
              <select className="input" data-testid="crm-visit-type" value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })}>
                <option value="visit">مراجعه</option>
                <option value="call">تماس</option>
                <option value="meeting">جلسه</option>
              </select>
            </label>
            <label className="field">وضعیت
              <select className="input" data-testid="crm-visit-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="open">باز</option>
                <option value="done">انجام‌شده</option>
              </select>
            </label>
          </div>
          <label className="field">مخاطب
            <input className="input" data-testid="crm-visit-person" value={form.person_name} onChange={(e) => setForm({ ...form, person_name: e.target.value })} />
          </label>
          <label className="field">مکان
            <input className="input" data-testid="crm-visit-place" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="field">موبایل
              <input className="input" data-testid="crm-visit-mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </label>
            <label className="field">کد ملی
              <input className="input" data-testid="crm-visit-national" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
            </label>
          </div>
          <label className="field">تاریخ فعالیت
            <JalaliDatePicker testId="crm-visit-date" value={form.visited_on} onChange={(visited_on) => setForm({ ...form, visited_on })} allowClear={false} />
          </label>
          <label className="field">نتیجه
            <textarea className="input min-h-20" data-testid="crm-visit-result" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
          </label>
          <label className="field">یادآور
            <JalaliDateTimePicker testId="crm-visit-remind" value={form.remind_at} onChange={(remind_at) => setForm({ ...form, remind_at })} />
          </label>
          <ReminderChoices inApp={form.notify_in_app} sms={form.notify_sms} notifyId="crm-visit-notify" smsId="crm-visit-sms" onInApp={(notify_in_app) => setForm({ ...form, notify_in_app })} onSms={(notify_sms) => setForm({ ...form, notify_sms })} />
          <button type="button" className="btn btn-primary" data-testid="crm-visit-save" disabled={save.isPending} onClick={() => save.mutate()}>ذخیره</button>
        </div>
      </Modal>
    </div>
  )
}

export function CrmTasksPage() {
  const { t } = useApp()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open')
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Task | null>(null)
  const [form, setForm] = useState<TaskForm>(emptyTask())
  const [editing, setEditing] = useState<number | null>(null)
  const { data, isLoading, refresh } = useCrm(q)

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, due_at: form.due_at || null }
      if (editing) return api.put(`/crm/tasks/${editing}`, payload)
      return api.post('/crm/tasks', payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'وظیفه به‌روز شد' : 'وظیفه ثبت شد')
      setOpen(false)
      refresh()
    },
    onError: (error: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      toast.error(errorText(error, 'ثبت وظیفه انجام نشد'))
    },
  })
  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/crm/tasks/${id}`),
    onSuccess: () => { toast.success('وظیفه حذف شد'); refresh() },
  })
  const askRemove = async (task: Task) => {
    if (!await confirmAction({ title: 'حذف وظیفه', text: `وظیفه «${task.title}» حذف شود؟`, confirmText: 'حذف شود' })) return
    remove.mutate(task.id)
  }
  const toggle = useMutation({
    mutationFn: async (task: Task) => api.put(`/crm/tasks/${task.id}`, {
      title: task.title,
      priority: task.priority || 'normal',
      notes: task.notes,
      due_at: task.due_at_input || null,
      notify_in_app: task.notify_in_app,
      notify_sms: task.notify_sms,
      completed: !task.completed_at,
    }),
    onSuccess: refresh,
  })

  const openForm = (task?: Task) => {
    setEditing(task?.id ?? null)
    setForm(task ? {
      title: task.title,
      priority: task.priority || 'normal',
      notes: task.notes ?? '',
      due_at: task.due_at_input ?? '',
      notify_in_app: task.notify_in_app,
      notify_sms: task.notify_sms,
    } : emptyTask())
    setOpen(true)
  }

  const tasks = (data?.tasks ?? []).filter((task) => {
    if (filter === 'done') return Boolean(task.completed_at)
    if (filter === 'open') return !task.completed_at
    return true
  })

  return (
    <div className="space-y-4" data-testid="crm-tasks-page">
      <PageHeader
        title={t('navCrmTasks')}
        subtitle={t('crmTasksSub')}
        action={<button type="button" className="btn btn-primary w-full sm:w-auto" data-testid="crm-task-open" onClick={() => openForm()}><Plus className="w-4 h-4" /> وظیفه جدید</button>}
      />
      <FilterBar q={q} onQ={setQ} placeholder="جستجوی عنوان یا توضیح وظیفه" testId="crm-task-filter" filter={filter} onFilter={setFilter} openCount={data?.open_tasks ?? 0} />
      {isLoading && <div className="text-sm text-surface-500">در حال بارگذاری...</div>}
      {!isLoading && tasks.length === 0 && <div className="card p-8 text-center text-sm text-surface-500">وظیفه‌ای در این فهرست نیست.</div>}
      <div className="grid md:grid-cols-2 gap-3 min-w-0 items-stretch">
        {tasks.map((task) => (
          <article key={task.id} data-testid="crm-task-row" className="card overflow-hidden h-full flex flex-col">
            <div className="flex items-start gap-3 p-4 min-w-0">
              <button type="button" data-testid="crm-task-done" className={`mt-1 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${task.completed_at ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-surface-300 dark:border-surface-600'}`} aria-label="انجام وظیفه" onClick={() => toggle.mutate(task)}>
                {task.completed_at && <Check className="w-3.5 h-3.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" className={`block min-w-0 flex-1 text-start font-semibold leading-6 line-clamp-1 break-all ${task.completed_at ? 'line-through text-surface-400' : 'text-surface-800 dark:text-surface-100'}`} onClick={() => openForm(task)}>{task.title}</button>
                  <div className="flex items-center shrink-0">
                    <IconBtn label="مشاهده وظیفه" onClick={() => setDetail(task)}><Eye className="w-4 h-4" /></IconBtn>
                    <IconBtn label="ویرایش وظیفه" onClick={() => openForm(task)}><Pencil className="w-4 h-4" /></IconBtn>
                    <IconBtn label="حذف وظیفه" tone="danger" onClick={() => askRemove(task)}><Trash2 className="w-4 h-4" /></IconBtn>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {filter === 'all' && <Badge tone={task.completed_at ? 'ok' : 'info'}>{task.completed_at ? 'انجام‌شده' : 'باز'}</Badge>}
                  {(filter === 'all' || task.priority === 'high') && <Badge tone={task.priority === 'high' ? 'danger' : 'muted'}>{task.priority === 'high' ? 'مهم' : 'عادی'}</Badge>}
                </div>
              </div>
            </div>
            <ClampBox text={task.notes} empty="توضیحی ثبت نشده" label="مشاهده توضیح" onOpen={() => setDetail(task)} />
            {task.due_at && (
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-surface-100 dark:border-surface-700 bg-primary-50/70 dark:bg-primary-900/25 px-4 py-2.5 text-xs text-primary-800 dark:text-primary-200 min-w-0">
                {task.notify_sms ? <MessageSquare className="w-3.5 h-3.5 shrink-0" /> : <Bell className="w-3.5 h-3.5 shrink-0" />}
                <ReminderLine at={task.due_at} inApp={task.notify_in_app} sms={task.notify_sms} sent={task.reminded_at} />
              </div>
            )}
          </article>
        ))}
      </div>

      <Modal open={detail !== null} title="جزئیات وظیفه" subtitle="متن کامل، بدون کوتاه شدن" onClose={() => setDetail(null)}>
        {detail && (
          <div className="grid gap-3">
            <DetailRow label="عنوان">{detail.title}</DetailRow>
            <DetailRow label="اولویت">{detail.priority === 'high' ? 'مهم' : 'عادی'}</DetailRow>
            <DetailRow label="وضعیت">{detail.completed_at ? 'انجام‌شده' : 'باز'}</DetailRow>
            <DetailRow label="توضیح">{detail.notes?.trim() || 'توضیحی ثبت نشده'}</DetailRow>
            {detail.due_at && <DetailRow label="یادآور"><ReminderLine at={detail.due_at} inApp={detail.notify_in_app} sms={detail.notify_sms} sent={detail.reminded_at} /></DetailRow>}
            <button type="button" className="btn btn-primary" onClick={() => { const task = detail; setDetail(null); openForm(task) }}>ویرایش</button>
          </div>
        )}
      </Modal>

      <Modal open={open} title={editing ? 'ویرایش وظیفه' : 'وظیفه جدید'} subtitle="در زمان یادآور، اعلان یا پیامک برای خودتان می‌رود." onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <label className="field">عنوان
            <input className="input" data-testid="crm-task-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="field">اولویت
            <select className="input" data-testid="crm-task-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="normal">عادی</option>
              <option value="high">مهم</option>
            </select>
          </label>
          <label className="field">توضیح
            <textarea className="input min-h-20" data-testid="crm-task-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          <label className="field">یادآور
            <JalaliDateTimePicker testId="crm-task-due" value={form.due_at} onChange={(due_at) => setForm({ ...form, due_at })} />
          </label>
          <ReminderChoices inApp={form.notify_in_app} sms={form.notify_sms} notifyId="crm-task-notify" smsId="crm-task-sms" onInApp={(notify_in_app) => setForm({ ...form, notify_in_app })} onSms={(notify_sms) => setForm({ ...form, notify_sms })} />
          <button type="button" className="btn btn-primary" data-testid="crm-task-save" disabled={save.isPending} onClick={() => save.mutate()}>ذخیره</button>
        </div>
      </Modal>
    </div>
  )
}
