import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  ListTodo,
  RefreshCw,
  RotateCcw,
  Timer,
  Trash2,
  Unlock,
  Webhook,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge, DateTimeText, Empty, Modal, PageHeader, StatCard } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { confirmAction } from '../lib/confirm'

type PendingJob = {
  id: number
  queue: string
  attempts: number
  status: 'waiting' | 'reserved' | 'delayed' | string
  display_name?: string | null
  job_uuid?: string | null
  command_name?: string | null
  reserved_at?: string | null
  available_at?: string | null
  created_at?: string | null
  payload_preview?: Record<string, unknown>
}

type FailedJob = {
  id: number
  uuid: string
  connection: string
  queue: string
  display_name?: string | null
  command_name?: string | null
  exception_short?: string | null
  exception?: string | null
  failed_at?: string | null
  payload_preview?: Record<string, unknown>
}

type BatchRow = {
  id: string
  name: string
  total_jobs: number
  pending_jobs: number
  failed_jobs: number
  created_at?: string | null
  finished_at?: string | null
}

type WebhookJob = {
  id: number
  uuid: string
  endpoint: string
  queue: string
  status: string
  http_status?: number | null
  success?: boolean | null
  display_name?: string | null
  national_id?: string | null
  mobile?: string | null
  referral_code?: string | null
  idempotency_key?: string | null
  message?: string | null
  exception_short?: string | null
  exception?: string | null
  duration_ms?: number | null
  started_at?: string | null
  finished_at?: string | null
  created_at?: string | null
  request_summary?: Record<string, unknown>
  response_summary?: Record<string, unknown>
  errors?: unknown
  ip_address?: string | null
  user_agent?: string | null
}

type QueuePayload = {
  connection: string
  driver: string
  table: string
  retry_after: number
  stats: {
    pending: number
    waiting: number
    reserved: number
    delayed: number
    failed: number
    failed_today: number
    batches: number
    webhooks?: number
    webhooks_failed?: number
    webhooks_processing?: number
  }
  queues: { queue: string; total: number }[]
  pending: PendingJob[]
  failed: FailedJob[]
  batches: BatchRow[]
  webhooks?: WebhookJob[]
}

type DetailState =
  | { kind: 'pending'; job: PendingJob }
  | { kind: 'failed'; job: FailedJob }
  | { kind: 'webhook'; job: WebhookJob }
  | null

export function AdminQueueMonitorPage() {
  const { t, locale } = useApp()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'webhooks' | 'pending' | 'failed' | 'batches'>('webhooks')
  const [q, setQ] = useState('')
  const [queue, setQueue] = useState('all')
  const [detail, setDetail] = useState<DetailState>(null)

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['superuser-queues', queue, q],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (queue !== 'all') params.set('queue', queue)
      if (q.trim()) params.set('q', q.trim())
      const qs = params.toString()
      return (await api.get(`/superuser/queues${qs ? `?${qs}` : ''}`)).data as QueuePayload
    },
    refetchInterval: 10000,
  })

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['superuser-queues'] })

  const retryMut = useMutation({
    mutationFn: async (uuid: string) => api.post(`/superuser/queues/failed/${encodeURIComponent(uuid)}/retry`),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? t('queueRetryOk'))
      invalidate()
      setDetail(null)
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? t('queueActionFail'))
    },
  })

  const retryAllMut = useMutation({
    mutationFn: async () => api.post('/superuser/queues/failed/retry-all'),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? t('queueRetryAllOk'))
      invalidate()
    },
    onError: () => toast.error(t('queueActionFail')),
  })

  const flushMut = useMutation({
    mutationFn: async () => api.delete('/superuser/queues/failed'),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? t('queueFlushOk'))
      invalidate()
      setDetail(null)
    },
    onError: () => toast.error(t('queueActionFail')),
  })

  const deleteFailedMut = useMutation({
    mutationFn: async (uuid: string) => api.delete(`/superuser/queues/failed/${encodeURIComponent(uuid)}`),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? t('queueDeleteOk'))
      invalidate()
      setDetail(null)
    },
    onError: () => toast.error(t('queueActionFail')),
  })

  const deletePendingMut = useMutation({
    mutationFn: async (id: number) => api.delete(`/superuser/queues/pending/${id}`),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? t('queueDeleteOk'))
      invalidate()
      setDetail(null)
    },
    onError: () => toast.error(t('queueActionFail')),
  })

  const releaseMut = useMutation({
    mutationFn: async (id: number) => api.post(`/superuser/queues/pending/${id}/release`),
    onSuccess: (res) => {
      toast.success(res.data?.message ?? t('queueReleaseOk'))
      invalidate()
      setDetail(null)
    },
    onError: () => toast.error(t('queueActionFail')),
  })

  const openPendingDetail = async (row: PendingJob) => {
    try {
      const res = await api.get(`/superuser/queues/pending/${row.id}`)
      setDetail({ kind: 'pending', job: res.data.job as PendingJob })
    } catch {
      setDetail({ kind: 'pending', job: row })
    }
  }

  const openFailedDetail = async (row: FailedJob) => {
    try {
      const res = await api.get(`/superuser/queues/failed/${encodeURIComponent(row.uuid)}`)
      setDetail({ kind: 'failed', job: res.data.job as FailedJob })
    } catch {
      setDetail({ kind: 'failed', job: row })
    }
  }

  const openWebhookDetail = async (row: WebhookJob) => {
    try {
      const res = await api.get(`/superuser/queues/webhooks/${encodeURIComponent(row.uuid)}`)
      setDetail({ kind: 'webhook', job: res.data.job as WebhookJob })
    } catch {
      setDetail({ kind: 'webhook', job: row })
    }
  }

  const statusTone = (status: string) => {
    if (status === 'reserved' || status === 'processing') return 'warn' as const
    if (status === 'delayed' || status === 'failed') return status === 'failed' ? 'danger' as const : 'info' as const
    return 'ok' as const
  }

  const statusLabel = (status: string) => {
    if (status === 'reserved') return t('queueStatusReserved')
    if (status === 'delayed') return t('queueStatusDelayed')
    if (status === 'processing') return t('queueStatusProcessing')
    if (status === 'completed') return t('queueStatusCompleted')
    if (status === 'failed') return t('queueStatusFailed')
    return t('queueStatusWaiting')
  }

  const queueOptions = useMemo(() => {
    const names = new Set<string>((data?.queues ?? []).map((r) => r.queue))
    for (const row of data?.failed ?? []) names.add(row.queue)
    names.add('finopal-webhook')
    return Array.from(names).sort()
  }, [data])

  const num = (value?: number | null) => (value ?? 0).toLocaleString(locale === 'en' ? 'en-US' : 'fa-IR')

  return (
    <div className="space-y-4" data-testid="queue-monitor-page">
      <PageHeader
        title={t('queueDebugTitle')}
        subtitle={t('queueDebugSub')}
        action={(
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 ms-1 ${isFetching ? 'animate-spin' : ''}`} />
              {t('queueRefresh')}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={retryAllMut.isPending || !(data?.stats.failed)}
              onClick={async () => {
                if (!await confirmAction({ title: t('queueRetryAll'), text: t('queueRetryAllConfirm'), confirmText: t('queueRetryAll') })) return
                retryAllMut.mutate()
              }}
            >
              <RotateCcw className="w-4 h-4 ms-1" />
              {t('queueRetryAll')}
            </button>
            <button
              type="button"
              className="btn btn-outline text-bad border-bad/40"
              disabled={flushMut.isPending || !(data?.stats.failed)}
              onClick={async () => {
                if (!await confirmAction({ title: t('queueFlush'), text: t('queueFlushConfirm'), confirmText: t('queueFlush') })) return
                flushMut.mutate()
              }}
            >
              <Trash2 className="w-4 h-4 ms-1" />
              {t('queueFlush')}
            </button>
          </div>
        )}
      />

      <div className="rounded-xl border border-info/30 bg-infosoft px-4 py-3 text-sm text-info">
        {t('queueDebugHint')}
        <div className="mt-1 text-xs opacity-80 font-mono dir-ltr text-left">
          connection={data?.connection ?? '—'} · driver={data?.driver ?? '—'} · table={data?.table ?? '—'} · retry_after={data?.retry_after ?? '—'}s
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('queueStatWebhooks')} value={data?.stats.webhooks ?? 0} icon={Webhook} color="from-info to-info" />
        <StatCard title={t('queueStatWebhookFailed')} value={data?.stats.webhooks_failed ?? 0} icon={XCircle} color="from-bad to-bad" />
        <StatCard title={t('queueStatPending')} value={data?.stats.pending ?? 0} icon={ListTodo} color="from-prim to-ok" />
        <StatCard title={t('queueStatFailed')} value={data?.stats.failed ?? 0} icon={AlertTriangle} color="from-warn to-acc" />
      </div>

      <div className="card p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {([
            ['webhooks', t('queueTabWebhooks'), data?.stats.webhooks ?? 0],
            ['pending', t('queueTabPending'), data?.stats.pending ?? 0],
            ['failed', t('queueTabFailed'), data?.stats.failed ?? 0],
            ['batches', t('queueTabBatches'), data?.stats.batches ?? 0],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className={`btn ${tab === key ? 'btn-primary' : 'btn-outline'} text-sm`}
              onClick={() => setTab(key)}
            >
              {label}
              <Badge tone={tab === key ? 'ok' : 'info'}>{count}</Badge>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="input w-full sm:w-56"
            placeholder={t('queueSearchPh')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="input w-full sm:w-44" value={queue} onChange={(e) => setQueue(e.target.value)}>
            <option value="all">{t('queueAllQueues')}</option>
            {queueOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {tab === 'webhooks' && (
        <div className="card overflow-hidden">
          <div className="overflow-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('queueColEndpoint')}</th>
                  <th>{t('queueColStatus')}</th>
                  <th>{t('queueColIdentity')}</th>
                  <th>{t('queueColMessage')}</th>
                  <th>{t('queueColDuration')}</th>
                  <th>{t('queueColCreated')}</th>
                  <th>{t('queueColActions')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.webhooks ?? []).map((row) => (
                  <tr key={row.uuid} className="cursor-pointer" onClick={() => void openWebhookDetail(row)}>
                    <td className="font-mono dir-ltr text-left">{row.id}</td>
                    <td>
                      <div className="font-medium">{row.endpoint}</div>
                      <div className="text-xs text-mute font-mono dir-ltr text-left truncate max-w-[220px]">{row.uuid}</div>
                    </td>
                    <td>
                      <Badge tone={row.success === false || row.status === 'failed' ? 'danger' : statusTone(row.status)}>
                        {statusLabel(row.status)}
                        {row.http_status ? ` · ${row.http_status}` : ''}
                      </Badge>
                    </td>
                    <td className="font-mono dir-ltr text-left text-xs">
                      <div>{row.mobile || '—'}</div>
                      <div className="opacity-70">{row.national_id || '—'}</div>
                    </td>
                    <td className="max-w-[280px] truncate" title={row.message ?? row.exception_short ?? ''}>
                      {row.message || row.exception_short || '—'}
                    </td>
                    <td className="whitespace-nowrap">{row.duration_ms != null ? `${num(row.duration_ms)} ms` : '—'}</td>
                    <td className="whitespace-nowrap"><DateTimeText value={row.started_at || row.created_at} /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => void openWebhookDetail(row)} title={t('queueView')}>
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(data?.webhooks ?? []).length === 0 && <div className="p-6"><Empty text={t('queueWebhooksEmpty')} /></div>}
        </div>
      )}

      {tab === 'pending' && (
        <div className="card overflow-hidden">
          <div className="overflow-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('queueColName')}</th>
                  <th>{t('queueColQueue')}</th>
                  <th>{t('queueColStatus')}</th>
                  <th>{t('queueColAttempts')}</th>
                  <th>{t('queueColAvailable')}</th>
                  <th>{t('queueColCreated')}</th>
                  <th>{t('queueColActions')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.pending ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono dir-ltr text-left">{row.id}</td>
                    <td>
                      <div className="font-medium">{row.display_name || row.command_name || '—'}</div>
                      <div className="text-xs text-mute font-mono dir-ltr text-left truncate max-w-[280px]">{row.job_uuid || '—'}</div>
                    </td>
                    <td className="font-mono dir-ltr text-left">{row.queue}</td>
                    <td><Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge></td>
                    <td>{row.attempts}</td>
                    <td className="whitespace-nowrap"><DateTimeText value={row.available_at} /></td>
                    <td className="whitespace-nowrap"><DateTimeText value={row.created_at} /></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void openPendingDetail(row)} title={t('queueView')}>
                          <Eye className="w-4 h-4" />
                        </button>
                        {row.status === 'reserved' && (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => releaseMut.mutate(row.id)} title={t('queueRelease')}>
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-bad"
                          onClick={async () => {
                            if (!await confirmAction({ title: t('queueDelete'), text: t('queueDeletePendingConfirm'), confirmText: t('queueDelete') })) return
                            deletePendingMut.mutate(row.id)
                          }}
                          title={t('queueDelete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(data?.pending ?? []).length === 0 && <div className="p-6"><Empty text={t('queuePendingEmpty')} /></div>}
        </div>
      )}

      {tab === 'failed' && (
        <div className="card overflow-hidden">
          <div className="overflow-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('queueColName')}</th>
                  <th>{t('queueColQueue')}</th>
                  <th>{t('queueColException')}</th>
                  <th>{t('queueColFailedAt')}</th>
                  <th>{t('queueColActions')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.failed ?? []).map((row) => (
                  <tr key={row.uuid}>
                    <td className="font-mono dir-ltr text-left">{row.id}</td>
                    <td>
                      <div className="font-medium">{row.display_name || row.command_name || '—'}</div>
                      <div className="text-xs text-mute font-mono dir-ltr text-left truncate max-w-[280px]">{row.uuid}</div>
                    </td>
                    <td className="font-mono dir-ltr text-left">{row.queue}</td>
                    <td className="max-w-[320px] truncate" title={row.exception_short ?? ''}>{row.exception_short || '—'}</td>
                    <td className="whitespace-nowrap"><DateTimeText value={row.failed_at} /></td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void openFailedDetail(row)} title={t('queueView')}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => retryMut.mutate(row.uuid)} title={t('queueRetry')}>
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-bad"
                          onClick={async () => {
                            if (!await confirmAction({ title: t('queueDelete'), text: t('queueDeleteFailedConfirm'), confirmText: t('queueDelete') })) return
                            deleteFailedMut.mutate(row.uuid)
                          }}
                          title={t('queueDelete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(data?.failed ?? []).length === 0 && <div className="p-6"><Empty text={t('queueFailedEmpty')} /></div>}
        </div>
      )}

      {tab === 'batches' && (
        <div className="card overflow-hidden">
          <div className="overflow-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('queueColBatchName')}</th>
                  <th>{t('queueColTotal')}</th>
                  <th>{t('queueColPending')}</th>
                  <th>{t('queueColFailed')}</th>
                  <th>{t('queueColCreated')}</th>
                  <th>{t('queueColFinished')}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.batches ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono dir-ltr text-left text-xs">{row.id}</td>
                    <td>{row.name}</td>
                    <td>{row.total_jobs}</td>
                    <td>{row.pending_jobs}</td>
                    <td>{row.failed_jobs}</td>
                    <td className="whitespace-nowrap"><DateTimeText value={row.created_at} /></td>
                    <td className="whitespace-nowrap">
                      {row.finished_at ? <DateTimeText value={row.finished_at} /> : <Badge tone="warn">{t('queueBatchRunning')}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(data?.batches ?? []).length === 0 && <div className="p-6"><Empty text={t('queueBatchesEmpty')} /></div>}
        </div>
      )}

      <Modal
        open={Boolean(detail)}
        title={
          detail?.kind === 'failed'
            ? t('queueFailedDetail')
            : detail?.kind === 'webhook'
              ? t('queueWebhookDetail')
              : t('queuePendingDetail')
        }
        onClose={() => setDetail(null)}
      >
        {detail?.kind === 'webhook' && (
          <div className="space-y-3 text-sm">
            <div className="grid sm:grid-cols-2 gap-2">
              <div>ID: <span className="font-mono dir-ltr">{detail.job.id}</span></div>
              <div>{t('queueColEndpoint')}: {detail.job.endpoint}</div>
              <div>{t('queueColStatus')}: <Badge tone={detail.job.success === false ? 'danger' : statusTone(detail.job.status)}>{statusLabel(detail.job.status)}</Badge></div>
              <div>HTTP: {detail.job.http_status ?? '—'}</div>
              <div>{t('queueColDuration')}: {detail.job.duration_ms != null ? `${num(detail.job.duration_ms)} ms` : '—'}</div>
              <div>UUID: <span className="font-mono dir-ltr text-xs">{detail.job.uuid}</span></div>
              <div>{t('queueColMobile')}: <span className="font-mono dir-ltr">{detail.job.mobile || '—'}</span></div>
              <div>{t('queueColNationalId')}: <span className="font-mono dir-ltr">{detail.job.national_id || '—'}</span></div>
              <div>{t('queueColCreated')}: <DateTimeText value={detail.job.started_at || detail.job.created_at} /></div>
              <div>{t('queueColFinished')}: <DateTimeText value={detail.job.finished_at} /></div>
            </div>
            <div>
              <div className="font-medium mb-1">{t('queueColMessage')}</div>
              <pre className="rounded-lg bg-surface2 p-3 whitespace-pre-wrap text-xs">{detail.job.message || '—'}</pre>
            </div>
            {detail.job.errors != null && (
              <div>
                <div className="font-medium mb-1">{t('queueColErrors')}</div>
                <pre className="rounded-lg bg-surface2 p-3 whitespace-pre-wrap text-xs dir-ltr text-left overflow-auto max-h-60">
                  {JSON.stringify(detail.job.errors, null, 2)}
                </pre>
              </div>
            )}
            {detail.job.exception && (
              <div>
                <div className="font-medium mb-1">{t('queueColException')}</div>
                <pre className="rounded-lg bg-surface2 p-3 whitespace-pre-wrap text-xs dir-ltr text-left overflow-auto max-h-80">
                  {detail.job.exception}
                </pre>
              </div>
            )}
            <div>
              <div className="font-medium mb-1">{t('queueRequestSummary')}</div>
              <pre className="rounded-lg bg-surface2 p-3 whitespace-pre-wrap text-xs dir-ltr text-left overflow-auto max-h-60">
                {JSON.stringify(detail.job.request_summary ?? {}, null, 2)}
              </pre>
            </div>
            <div>
              <div className="font-medium mb-1">{t('queueResponseSummary')}</div>
              <pre className="rounded-lg bg-surface2 p-3 whitespace-pre-wrap text-xs dir-ltr text-left overflow-auto max-h-60">
                {JSON.stringify(detail.job.response_summary ?? {}, null, 2)}
              </pre>
            </div>
            <div className="inline-flex items-center gap-1 text-xs text-mute">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('queueWebhookHint')}
            </div>
          </div>
        )}

        {detail?.kind === 'pending' && (
          <div className="space-y-3 text-sm">
            <div className="grid sm:grid-cols-2 gap-2">
              <div>ID: <span className="font-mono dir-ltr">{detail.job.id}</span></div>
              <div>{t('queueColQueue')}: <span className="font-mono dir-ltr">{detail.job.queue}</span></div>
              <div>{t('queueColStatus')}: <Badge tone={statusTone(detail.job.status)}>{statusLabel(detail.job.status)}</Badge></div>
              <div>{t('queueColAttempts')}: {detail.job.attempts}</div>
              <div>{t('queueColName')}: {detail.job.display_name || detail.job.command_name || '—'}</div>
              <div>{t('queueColCreated')}: <DateTimeText value={detail.job.created_at} /></div>
            </div>
            <div>
              <div className="font-medium mb-1">{t('queuePayload')}</div>
              <pre className="rounded-lg bg-surface2 p-3 whitespace-pre-wrap text-xs dir-ltr text-left overflow-auto max-h-80">
                {JSON.stringify(detail.job.payload_preview ?? {}, null, 2)}
              </pre>
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.job.status === 'reserved' && (
                <button type="button" className="btn btn-outline" onClick={() => releaseMut.mutate(detail.job.id)}>
                  <Unlock className="w-4 h-4 ms-1" />
                  {t('queueRelease')}
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline text-bad border-bad/40"
                onClick={async () => {
                  if (!await confirmAction({ title: t('queueDelete'), text: t('queueDeletePendingConfirm'), confirmText: t('queueDelete') })) return
                  deletePendingMut.mutate(detail.job.id)
                }}
              >
                <Trash2 className="w-4 h-4 ms-1" />
                {t('queueDelete')}
              </button>
            </div>
          </div>
        )}

        {detail?.kind === 'failed' && (
          <div className="space-y-3 text-sm">
            <div className="grid sm:grid-cols-2 gap-2">
              <div>ID: <span className="font-mono dir-ltr">{detail.job.id}</span></div>
              <div>{t('queueColQueue')}: <span className="font-mono dir-ltr">{detail.job.queue}</span></div>
              <div>{t('queueColName')}: {detail.job.display_name || detail.job.command_name || '—'}</div>
              <div>UUID: <span className="font-mono dir-ltr text-xs">{detail.job.uuid}</span></div>
              <div>{t('queueColFailedAt')}: <DateTimeText value={detail.job.failed_at} /></div>
              <div>{t('queueColConnection')}: {detail.job.connection}</div>
            </div>
            <div>
              <div className="font-medium mb-1">{t('queueColException')}</div>
              <pre className="rounded-lg bg-surface2 p-3 whitespace-pre-wrap text-xs dir-ltr text-left overflow-auto max-h-80">
                {detail.job.exception || detail.job.exception_short || '—'}
              </pre>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" onClick={() => retryMut.mutate(detail.job.uuid)}>
                <RotateCcw className="w-4 h-4 ms-1" />
                {t('queueRetry')}
              </button>
              <button
                type="button"
                className="btn btn-outline text-bad border-bad/40"
                onClick={async () => {
                  if (!await confirmAction({ title: t('queueDelete'), text: t('queueDeleteFailedConfirm'), confirmText: t('queueDelete') })) return
                  deleteFailedMut.mutate(detail.job.uuid)
                }}
              >
                <Trash2 className="w-4 h-4 ms-1" />
                {t('queueDelete')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
