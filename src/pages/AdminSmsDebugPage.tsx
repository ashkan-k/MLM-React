import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, MessageSquare, RefreshCw, Send, Trash2, XCircle, AlertTriangle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge, DateTimeText, Empty, Modal, PageHeader, StatCard } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { confirmAction } from '../lib/confirm'

type SmsAttempt = {
  provider_key?: string | null
  provider?: string | null
  success?: boolean
  skipped?: boolean
  reason?: string | null
  http_status?: number | null
  response?: string | null
  exception?: string | null
}

type SmsLog = {
  at?: string
  type?: string
  type_label?: string
  phone?: string
  message?: string | null
  success?: boolean
  provider?: string | null
  provider_key?: string | null
  reason?: string | null
  response?: string | null
  duration_ms?: number | null
  attempts?: SmsAttempt[]
  meta?: Record<string, unknown>
}

type ProviderRow = {
  key: string
  label: string
  enabled: boolean
  configured: boolean
}

type SmsDebugPayload = {
  logs: SmsLog[]
  providers: ProviderRow[]
  stats: { total: number; success: number; failed: number; failed_today: number }
  log_path?: string
  text_order?: string[]
  driver?: string
  frontend_login_url?: string
}

export function AdminSmsDebugPage() {
  const { t, locale } = useApp()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | 'success' | 'failed'>('all')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [detail, setDetail] = useState<SmsLog | null>(null)

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['superuser-sms-debug'],
    queryFn: async () => (await api.get('/superuser/sms')).data as SmsDebugPayload,
  })

  const testMut = useMutation({
    mutationFn: async (provider?: string) => api.post('/superuser/sms/test', {
      phone,
      message: message.trim() || undefined,
      provider: provider || undefined,
    }),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? t('smsTestOk'))
      void qc.invalidateQueries({ queryKey: ['superuser-sms-debug'] })
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? t('smsTestFail'))
      void qc.invalidateQueries({ queryKey: ['superuser-sms-debug'] })
    },
  })

  const clearMut = useMutation({
    mutationFn: async () => api.delete('/superuser/sms/logs'),
    onSuccess: () => {
      toast.success(t('smsClearOk'))
      void qc.invalidateQueries({ queryKey: ['superuser-sms-debug'] })
    },
    onError: () => toast.error(t('smsClearFail')),
  })

  const logs = data?.logs ?? []
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return logs.filter((row) => {
      if (status === 'success' && !row.success) return false
      if (status === 'failed' && row.success) return false
      if (!needle) return true
      const hay = [
        row.phone,
        row.type,
        row.type_label,
        row.message,
        row.provider,
        row.provider_key,
        row.reason,
        row.response,
      ].join(' ').toLowerCase()
      return hay.includes(needle)
    })
  }, [logs, q, status])

  const clearLogs = async () => {
    if (!await confirmAction({ title: t('smsClear'), text: t('smsClearConfirm'), confirmText: t('smsClear') })) return
    clearMut.mutate()
  }

  const sendTest = (provider?: string) => {
    if (!/^09\d{9}$/.test(phone)) {
      toast.error(t('smsPhoneInvalid'))
      return
    }
    testMut.mutate(provider)
  }

  return (
    <div className="space-y-4" data-testid="sms-debug-page">
      <PageHeader
        title={t('smsDebugTitle')}
        subtitle={t('smsDebugSub')}
        action={(
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 ms-1 ${isFetching ? 'animate-spin' : ''}`} />
              {t('smsRefresh')}
            </button>
            <button type="button" className="btn btn-outline text-rose-600 border-rose-300" onClick={() => void clearLogs()} disabled={clearMut.isPending}>
              <Trash2 className="w-4 h-4 ms-1" />
              {t('smsClear')}
            </button>
          </div>
        )}
      />

      <div className="rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-900 px-4 py-3 text-sm text-sky-900 dark:text-sky-100">
        {t('smsDebugHint')}
        {data?.log_path && (
          <div className="mt-1 font-mono text-xs dir-ltr text-left opacity-80">{data.log_path}</div>
        )}
        {data?.text_order && (
          <div className="mt-1 text-xs opacity-80">{t('smsOrder')}: {data.text_order.join(' → ') || '—'}</div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('smsStatTotal')} value={data?.stats.total ?? 0} icon={MessageSquare} color="from-blue-500 to-blue-600" />
        <StatCard title={t('smsStatOk')} value={data?.stats.success ?? 0} icon={CheckCircle2} color="from-emerald-500 to-emerald-600" />
        <StatCard title={t('smsStatFail')} value={data?.stats.failed ?? 0} icon={XCircle} color="from-rose-500 to-rose-600" />
        <StatCard title={t('smsStatFailToday')} value={data?.stats.failed_today ?? 0} icon={AlertTriangle} color="from-amber-500 to-amber-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-4 lg:col-span-1">
          <div className="card p-4 space-y-3">
            <div className="font-semibold text-surface-800 dark:text-surface-100">{t('smsTestTitle')}</div>
            <label className="field">
              {t('smsPhone')}
              <input className="input" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912xxxxxxx" />
            </label>
            <label className="field">
              {t('smsMessageOptional')}
              <textarea className="input min-h-24" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('smsMessagePh')} />
            </label>
            <button type="button" className="btn btn-primary w-full" disabled={testMut.isPending} onClick={() => sendTest()}>
              <Send className="w-4 h-4 ms-1" />
              {t('smsTestChain')}
            </button>
            <p className="text-xs text-amber-700 dark:text-amber-300">{t('smsTestWarn')}</p>
          </div>

          <div className="card p-4 space-y-3">
            <div className="font-semibold text-surface-800 dark:text-surface-100">{t('smsProviders')}</div>
            <div className="space-y-2">
              {(data?.providers ?? []).map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-2 rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-xs text-surface-500 font-mono dir-ltr text-left">{p.key}</div>
                  </div>
                  <div className="flex gap-1">
                    <Badge tone={p.enabled ? 'ok' : 'danger'}>{p.enabled ? t('smsActive') : t('smsInactive')}</Badge>
                    <Badge tone={p.configured ? 'info' : 'warn'}>{p.configured ? t('smsConfigured') : t('smsNotConfigured')}</Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-2">
              {(data?.providers ?? []).filter((p) => p.enabled).map((p) => (
                <button
                  key={`test-${p.key}`}
                  type="button"
                  className="btn btn-outline w-full text-sm"
                  disabled={testMut.isPending || !p.configured}
                  onClick={() => sendTest(p.key)}
                >
                  {t('smsTestProvider')}: {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <div className="px-4 pt-4 pb-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="font-semibold text-surface-800 dark:text-surface-100">{t('smsLogTitle')}</div>
            <div className="flex flex-wrap gap-2">
              <input
                className="input w-full sm:w-56"
                placeholder={t('smsSearchPh')}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <select className="input w-full sm:w-40" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="all">{t('smsStatusAll')}</option>
                <option value="success">{t('smsStatOk')}</option>
                <option value="failed">{t('smsStatFail')}</option>
              </select>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('smsColTime')}</th>
                  <th>{t('smsColType')}</th>
                  <th>{t('smsColPhone')}</th>
                  <th>{t('smsColResult')}</th>
                  <th>{t('smsColProvider')}</th>
                  <th>{t('smsColReason')}</th>
                  <th>{t('smsColDuration')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => (
                  <tr key={`${row.at}-${idx}`} className="cursor-pointer" onClick={() => setDetail(row)}>
                    <td className="whitespace-nowrap"><DateTimeText value={row.at} /></td>
                    <td>{row.type_label || row.type || '—'}</td>
                    <td className="font-mono dir-ltr text-left">{row.phone || '—'}</td>
                    <td>
                      <Badge tone={row.success ? 'ok' : 'danger'}>
                        {row.success ? t('smsStatOk') : t('smsStatFail')}
                      </Badge>
                    </td>
                    <td>{row.provider || row.provider_key || '—'}</td>
                    <td className="max-w-[220px] truncate" title={row.reason ?? ''}>{row.reason || '—'}</td>
                    <td className="whitespace-nowrap">{row.duration_ms != null ? `${row.duration_ms.toLocaleString(locale === 'en' ? 'en-US' : 'fa-IR')} ms` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="p-6"><Empty text={t('smsLogEmpty')} /></div>}
        </div>
      </div>

      <Modal open={Boolean(detail)} title={t('smsDetailTitle')} onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid sm:grid-cols-2 gap-2">
              <div>{t('smsColTime')}: <DateTimeText value={detail.at} /></div>
              <div>{t('smsColPhone')}: <span className="font-mono dir-ltr">{detail.phone}</span></div>
              <div>{t('smsColType')}: {detail.type_label || detail.type}</div>
              <div>{t('smsColProvider')}: {detail.provider || detail.provider_key || '—'}</div>
              <div>{t('smsColResult')}: {detail.success ? t('smsStatOk') : t('smsStatFail')}</div>
              <div>{t('smsColDuration')}: {detail.duration_ms != null ? `${detail.duration_ms} ms` : '—'}</div>
            </div>
            <div>
              <div className="font-medium mb-1">{t('smsMessagePreview')}</div>
              <pre className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-950 p-4 whitespace-pre-wrap text-sm leading-7 text-surface-800 dark:text-surface-100">
                {detail.message?.trim() || '—'}
              </pre>
            </div>
            <div>
              <div className="font-medium mb-1">{t('smsColReason')}</div>
              <pre className="rounded-lg bg-surface-50 dark:bg-surface-900 p-3 whitespace-pre-wrap text-xs dir-ltr text-left">{detail.reason || '—'}</pre>
            </div>
            {detail.response && (
              <div>
                <div className="font-medium mb-1">{t('smsResponse')}</div>
                <pre className="rounded-lg bg-surface-50 dark:bg-surface-900 p-3 whitespace-pre-wrap text-xs dir-ltr text-left">{detail.response}</pre>
              </div>
            )}
            <div>
              <div className="font-medium mb-1">{t('smsAttempts')}</div>
              <div className="space-y-2">
                {(detail.attempts ?? []).map((a, i) => (
                  <div key={i} className="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <strong>{a.provider || a.provider_key || '—'}</strong>
                      <Badge tone={a.success ? 'ok' : a.skipped ? 'warn' : 'danger'}>
                        {a.success ? t('smsStatOk') : a.skipped ? t('smsSkipped') : t('smsStatFail')}
                      </Badge>
                    </div>
                    <div className="text-xs text-surface-500">{a.reason || '—'}</div>
                    {a.response && <pre className="mt-2 text-xs whitespace-pre-wrap dir-ltr text-left opacity-80">{a.response}</pre>}
                  </div>
                ))}
                {(detail.attempts ?? []).length === 0 && <div className="text-surface-500">—</div>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
