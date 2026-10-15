import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, MapPin, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { JalaliDatePicker } from '../components/JalaliDatePicker'
import { JalaliDateTimePicker } from '../components/JalaliDateTimePicker'
import { Badge, Modal, PageHeader } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { confirmAction } from '../lib/confirm'
import { api } from '../lib/api'
import { dateTime, jalaliDateOnly } from '../lib/format'

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
  const query = useQuery({
    queryKey: ['crm', q],
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
  return errors?.notify_in_app?.[0] ?? errors?.place?.[0] ?? errors?.person_name?.[0] ?? errors?.title?.[0] ?? error.response?.data?.message ?? fallback
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
      toast.success(editing ? 'فعالیت به‌روز شد' : 'فعالیت ثبت شد')
      setOpen(false)
      refresh()
    },
    onError: (error: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      toast.error(errorText(error, 'ثبت فعالیت انجام نشد'))
    },
  })
  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/crm/visits/${id}`),
    onSuccess: () => { toast.success('فعالیت حذف شد'); refresh() },
  })

  const askRemove = async (visit: Visit) => {
    if (!await confirmAction({ title: 'حذف فعالیت', text: `فعالیت «${visit.person_name}» حذف شود؟`, confirmText: 'حذف شود' })) return
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
        action={<button type="button" className="btn btn-primary w-full sm:w-auto" data-testid="crm-visit-open" onClick={() => openForm()}><Plus className="w-4 h-4" /> ثبت فعالیت</button>}
      />
      <FilterBar q={q} onQ={setQ} placeholder="جستجوی مخاطب، موبایل، کد ملی یا مکان" testId="crm-visit-filter" filter={filter} onFilter={setFilter} />
      {isLoading && <div className="text-sm text-surface-500">در حال بارگذاری...</div>}
      {!isLoading && visits.length === 0 && <div className="card p-8 text-center text-sm text-surface-500">هنوز فعالیتی ثبت نشده است.</div>}
      <div className="grid md:grid-cols-2 gap-3 min-w-0">
        {visits.map((visit) => (
          <article key={visit.id} data-testid="crm-visit-row" className="card p-4 space-y-2 overflow-hidden">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <button type="button" className="block w-full text-start font-semibold break-words wrap-anywhere text-surface-800 dark:text-surface-100" onClick={() => openForm(visit)}>{visit.person_name}</button>
                {filter === 'all' && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge tone={visit.status === 'done' ? 'ok' : 'info'}>{visit.status === 'done' ? 'انجام‌شده' : 'باز'}</Badge>
                    <Badge tone="muted">{ACTIVITY_TYPE[visit.activity_type || 'visit']}</Badge>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" className="text-surface-400 hover:text-primary-600" aria-label="ویرایش فعالیت" onClick={() => openForm(visit)}><Pencil className="w-4 h-4" /></button>
                <button type="button" className="text-surface-400 hover:text-rose-500" aria-label="حذف فعالیت" onClick={() => askRemove(visit)}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="text-sm text-surface-500 flex flex-wrap items-center gap-1 min-w-0 wrap-anywhere"><MapPin className="w-3.5 h-3.5 shrink-0" /> {ACTIVITY_TYPE[visit.activity_type || 'visit']} · {visit.place} · <span className="datetime-ltr" dir="ltr">{jalaliDateOnly(visit.visited_on)}</span></div>
            <div className="text-xs text-surface-400 wrap-anywhere">{[visit.mobile, visit.national_id].filter(Boolean).join(' · ') || 'بدون شماره تماس'}</div>
            {visit.result && <p className="text-sm m-0 wrap-anywhere text-surface-700 dark:text-surface-200">{visit.result}</p>}
            {visit.remind_at && (
              <div className="text-xs text-primary-700 dark:text-primary-300 flex flex-wrap items-center gap-1 min-w-0">
                {visit.notify_sms ? <MessageSquare className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                <ReminderLine at={visit.remind_at} inApp={visit.notify_in_app} sms={visit.notify_sms} sent={visit.reminded_at} />
              </div>
            )}
          </article>
        ))}
      </div>

      <Modal open={open} title={editing ? 'ویرایش فعالیت' : 'ثبت فعالیت'} subtitle="یادآور برای خودتان است، نه برای مخاطب." onClose={() => setOpen(false)}>
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
      <div className="space-y-2">
        {tasks.map((task) => (
          <article key={task.id} data-testid="crm-task-row" className="card p-4 overflow-hidden">
            <div className="flex items-start gap-3 min-w-0">
              <button type="button" data-testid="crm-task-done" className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${task.completed_at ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-surface-300'}`} aria-label="انجام وظیفه" onClick={() => toggle.mutate(task)}>
                {task.completed_at && <Check className="w-3.5 h-3.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <button type="button" className={`block w-full text-start font-semibold wrap-anywhere ${task.completed_at ? 'line-through text-surface-400' : 'text-surface-800 dark:text-surface-100'}`} onClick={() => openForm(task)}>{task.title}</button>
                {filter === 'all' && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge tone={task.completed_at ? 'ok' : 'info'}>{task.completed_at ? 'انجام‌شده' : 'باز'}</Badge>
                    <Badge tone={task.priority === 'high' ? 'danger' : 'muted'}>{task.priority === 'high' ? 'مهم' : 'عادی'}</Badge>
                  </div>
                )}
                {filter !== 'all' && task.priority === 'high' && <span className="text-[11px] text-rose-600 ms-2">مهم</span>}
                {task.notes && <p className="text-sm m-0 mt-1 wrap-anywhere text-surface-500">{task.notes}</p>}
                {task.due_at && (
                  <div className="text-xs text-primary-700 dark:text-primary-300 mt-2">
                    <ReminderLine at={task.due_at} inApp={task.notify_in_app} sms={task.notify_sms} sent={task.reminded_at} />
                  </div>
                )}
              </div>
              <button type="button" className="shrink-0 text-surface-400 hover:text-primary-600" aria-label="ویرایش وظیفه" onClick={() => openForm(task)}><Pencil className="w-4 h-4" /></button>
              <button type="button" className="shrink-0 text-surface-400 hover:text-rose-500" aria-label="حذف وظیفه" onClick={() => askRemove(task)}><Trash2 className="w-4 h-4" /></button>
            </div>
          </article>
        ))}
      </div>

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
