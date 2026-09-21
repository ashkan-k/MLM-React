import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  List,
  MessageSquareText,
  Minus,
  Plus,
  Search,
  Sparkles,
  Target,
  TreePine,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { JalaliMonthPicker } from '../components/JalaliMonthPicker'
import { Badge, DateTimeText, Empty, Modal, MonthText, PageHeader, ProgressBar, ScorePair, StatCard } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { localeTag } from '../lib/format'
import { roleLabel } from '../lib/i18n'
import { useAuth } from '../stores/auth'

type PointsInfo = {
  role_slug: string
  role_name: string
  role_id: number
  gateway_count: number
  gateway_points: number
  manual_points: number
  actual: number
  required: number
  progress_pct: number
  threshold_met: boolean
  permanent_eligible_count?: number
}

type TreeNode = {
  id: number
  user: { id?: number; name: string; mobile?: string; is_active?: boolean }
  role: { id?: number; name: string; slug?: string }
  points: PointsInfo | null
  descendant_count?: number
  children?: TreeNode[]
}

type FlatRow = PointsInfo & {
  user_id: number
  name: string
  mobile?: string
}

type GatewayRow = {
  gateway_sale_id: number
  gateway_name?: string
  merchant_code?: string
  customer_name?: string
  sold_at?: string
  points: number
  permanently_eligible: boolean
  sources: Array<{ code: string; label: string; registrant?: { id?: number; name?: string; mobile?: string } | null }>
  registrants?: Array<{ id?: number; name?: string; mobile?: string }>
}

type DetailPayload = {
  month: string
  points_per_gateway: number
  user: { id: number; name: string; mobile?: string }
  role: { id: number; slug: string; name: string }
  totals: PointsInfo & { permanent_eligible_count: number }
  gateways: GatewayRow[]
  adjustments: Array<{
    id: number
    delta_points: number
    note?: string | null
    actor?: { id: number; name: string } | null
    created_at?: string
  }>
  permanent_eligibilities: Array<{
    gateway_sale_id: number
    qualified_month?: string
    gateway_name?: string
    merchant_code?: string
    sold_at?: string
    customer_name?: string
  }>
  can_adjust: boolean
}

function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function PointsPill({ points }: { points: PointsInfo }) {
  return (
    <div className="min-w-[10rem] space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <ScorePair actual={points.actual} required={points.required} compact />
        {points.threshold_met ? <Badge tone="ok">حد نصاب</Badge> : <Badge tone="muted">{points.progress_pct}٪</Badge>}
      </div>
      <ProgressBar value={points.actual} max={Math.max(1, points.required)} />
      <div className="flex flex-wrap gap-1.5 text-[10px] text-surface-500">
        <span>درگاه {points.gateway_count}</span>
        {points.manual_points !== 0 && (
          <span className={points.manual_points > 0 ? 'text-emerald-600' : 'text-rose-600'}>
            دستی {points.manual_points > 0 ? '+' : ''}{points.manual_points.toLocaleString(localeTag())}
          </span>
        )}
      </div>
    </div>
  )
}

function TreeBranch({
  nodes,
  depth = 0,
  onOpen,
  expanded,
  toggle,
}: {
  nodes: TreeNode[]
  depth?: number
  onOpen: (userId: number, roleSlug: string) => void
  expanded: Set<number>
  toggle: (id: number) => void
}) {
  const { direction } = useApp()
  const Chevron = direction === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <ul className={depth === 0 ? 'space-y-2' : 'mt-2 space-y-2 border-s border-surface-200/80 dark:border-surface-700/80 ps-3 ms-2'}>
      {nodes.map((node) => {
        const kids = node.children ?? []
        const open = expanded.has(node.id)
        const uid = node.user?.id
        const slug = node.points?.role_slug ?? node.role?.slug
        const canOpen = Boolean(uid && slug && node.points)

        return (
          <li key={node.id} className="relative">
            <div
              className={`
                group rounded-2xl border border-surface-200/90 dark:border-surface-700/80
                bg-gradient-to-br from-white via-white to-surface-50/80
                dark:from-surface-900 dark:via-surface-900 dark:to-surface-800/60
                px-3 py-2.5 shadow-sm hover:shadow-md transition-shadow
                ${node.points?.threshold_met ? 'ring-1 ring-emerald-400/40' : ''}
              `}
            >
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {kids.length > 0 ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-lg p-1 hover:bg-surface-100 dark:hover:bg-surface-800"
                      onClick={() => toggle(node.id)}
                      aria-expanded={open}
                      aria-label={open ? 'بستن' : 'باز کردن'}
                    >
                      {open ? <ChevronDown className="w-4 h-4" /> : <Chevron className="w-4 h-4" />}
                    </button>
                  ) : (
                    <span className="w-6 flex justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-surface-300 dark:bg-surface-600" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-surface-900 dark:text-surface-50 truncate leading-5">
                        {node.user?.name ?? '—'}
                      </span>
                      <Badge tone="info">{roleLabel(node.role?.slug) || node.role?.name}</Badge>
                      {!node.user?.is_active && <Badge tone="danger">غیرفعال</Badge>}
                    </div>
                    {node.user?.mobile ? (
                      <div className="mt-0.5 text-xs text-surface-500 leading-4">
                        <bdi className="tabular-nums tracking-wide" dir="ltr">{node.user.mobile}</bdi>
                      </div>
                    ) : null}
                    {kids.length > 0 && (
                      <p className="text-[11px] text-surface-400 m-0 mt-1">زیرمجموعه مستقیم: {kids.length} · کل: {node.descendant_count ?? kids.length}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {node.points ? <PointsPill points={node.points} /> : (
                    <span className="text-xs text-surface-400">بدون امتیاز نقش</span>
                  )}
                  {canOpen && (
                    <button type="button" className="btn btn-soft btn-sm shrink-0" onClick={() => onOpen(uid!, slug!)}>
                      جزئیات
                    </button>
                  )}
                </div>
              </div>
            </div>
            {open && kids.length > 0 && (
              <TreeBranch nodes={kids} depth={depth + 1} onOpen={onOpen} expanded={expanded} toggle={toggle} />
            )}
          </li>
        )
      })}
    </ul>
  )
}

function DetailModal({
  open,
  onClose,
  detail,
  loading,
  canAdjust,
  onAdjust,
  adjusting,
}: {
  open: boolean
  onClose: () => void
  detail: DetailPayload | null
  loading: boolean
  canAdjust: boolean
  onAdjust: (delta: number, note: string) => void
  adjusting: boolean
}) {
  const [delta, setDelta] = useState('100')
  const [note, setNote] = useState('')

  return (
    <Modal open={open} onClose={onClose} title={detail ? `امتیاز ${detail.user.name}` : 'جزئیات امتیاز'} wide>
      {loading && <p className="text-sm text-surface-500 p-2 m-0">در حال بارگذاری...</p>}
      {!loading && detail && (
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pe-1">
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-surface-50 dark:bg-surface-800/50 p-3">
              <p className="text-[11px] text-surface-500 m-0">نقش</p>
              <p className="font-semibold text-sm m-0 mt-1">{roleLabel(detail.role.slug) || detail.role.name}</p>
            </div>
            <div className="rounded-xl bg-surface-50 dark:bg-surface-800/50 p-3">
              <p className="text-[11px] text-surface-500 m-0">ماه</p>
              <p className="font-semibold text-sm m-0 mt-1"><MonthText value={detail.month} /></p>
            </div>
            <div className="rounded-xl bg-surface-50 dark:bg-surface-800/50 p-3">
              <p className="text-[11px] text-surface-500 m-0 mb-1">امتیاز کل</p>
              <ScorePair actual={detail.totals.actual} required={detail.totals.required} />
              <p className="text-[10px] text-surface-400 m-0 mt-1">کسب‌شده از حد نصاب</p>
            </div>
            <div className="rounded-xl bg-surface-50 dark:bg-surface-800/50 p-3">
              <p className="text-[11px] text-surface-500 m-0">واجد شرایط دائمی</p>
              <p className="font-semibold text-sm m-0 mt-1">{detail.totals.permanent_eligible_count}</p>
            </div>
          </div>

          <div>
            <ProgressBar value={detail.totals.actual} max={Math.max(1, detail.totals.required)} />
            <p className="text-xs text-surface-500 mt-1.5 m-0">
              درگاه: {detail.totals.gateway_points.toLocaleString(localeTag())}
              {' · '}دستی: {detail.totals.manual_points.toLocaleString(localeTag())}
              {detail.totals.threshold_met ? ' · حد نصاب تکمیل شده' : ''}
            </p>
          </div>

          {canAdjust && detail.can_adjust && (
            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
                <Sparkles className="w-4 h-4" />
                ویرایش دستی امتیاز (فقط سوپریوزر)
              </div>
              <div className="flex flex-wrap gap-3 items-end">
                <label className="text-xs space-y-1.5 block">
                  <span className="text-surface-500">مقدار تغییر</span>
                  <input className="input w-32" type="number" min={1} value={delta} onChange={(e) => setDelta(e.target.value)} />
                </label>
                <label className="text-xs space-y-1.5 block flex-1 min-w-[14rem]">
                  <span className="text-surface-500">یادداشت</span>
                  <input
                    className="input w-full"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="مثلاً جبران باگ / تشویق ویژه"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ok btn-sm inline-flex items-center gap-1.5 min-w-[5.5rem] justify-center"
                    disabled={adjusting}
                    onClick={() => {
                      const n = Number(delta)
                      if (!Number.isFinite(n) || n === 0) {
                        toast.error('یک عدد غیرصفر وارد کنید')
                        return
                      }
                      onAdjust(Math.trunc(Math.abs(n)) || Math.round(Math.abs(n)), note)
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" /> افزایش
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm inline-flex items-center gap-1.5 min-w-[5.5rem] justify-center shadow-sm"
                    disabled={adjusting}
                    onClick={() => {
                      const n = Number(delta)
                      if (!Number.isFinite(n) || n === 0) {
                        toast.error('یک عدد غیرصفر وارد کنید')
                        return
                      }
                      const amount = Math.trunc(Math.abs(n)) || Math.round(Math.abs(n))
                      onAdjust(-amount, note)
                    }}
                  >
                    <Minus className="w-3.5 h-3.5" /> کاهش
                  </button>
                </div>
              </div>
            </div>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 m-0">
              <GitBranch className="w-4 h-4 text-primary-500" />
              درگاه‌های امتیازساز این ماه ({detail.gateways.length})
            </h3>
            {detail.gateways.length === 0 ? (
              <Empty title="درگاهی در این ماه شمارش نشده" />
            ) : (
              <div className="space-y-2">
                {detail.gateways.map((g) => (
                  <div
                    key={g.gateway_sale_id}
                    className="rounded-xl border border-surface-200 dark:border-surface-700 p-3 bg-white/70 dark:bg-surface-900/40"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-medium text-sm m-0 leading-snug">{g.gateway_name || `فروش #${g.gateway_sale_id}`}</p>
                        <p className="text-xs text-surface-500 m-0">
                          <bdi dir="ltr">{g.merchant_code || '—'}</bdi>
                        </p>
                        {g.customer_name && <p className="text-xs text-surface-500 m-0">مشتری: {g.customer_name}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone="info">+{g.points} امتیاز</Badge>
                        {g.permanently_eligible && <Badge tone="ok">قفل دائمی</Badge>}
                        {g.sold_at && <span className="text-[11px] text-surface-400"><DateTimeText value={g.sold_at} /></span>}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {g.sources.map((s, i) => (
                        <span key={`${s.code}-${i}`} className="text-[11px] rounded-lg bg-surface-100 dark:bg-surface-800 px-2 py-1 text-surface-600 dark:text-surface-300">
                          {s.label}
                          {s.registrant?.name ? ` · ${s.registrant.name}` : ''}
                        </span>
                      ))}
                    </div>
                    {(g.registrants?.length ?? 0) > 0 && (
                      <p className="text-[11px] text-surface-500 mt-2 m-0 leading-snug">
                        ثبت‌کنندگان: {g.registrants!.map((r) => r.name).filter(Boolean).join('، ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2.5">
            <h3 className="text-sm font-semibold m-0">تعدیل‌های دستی این ماه</h3>
            {detail.adjustments.length === 0 ? (
              <p className="text-xs text-surface-500 m-0">موردی ثبت نشده.</p>
            ) : (
              <ul className="space-y-2.5 m-0 p-0 list-none">
                {detail.adjustments.map((a) => {
                  const up = a.delta_points >= 0
                  return (
                    <li
                      key={a.id}
                      className={`
                        rounded-xl border px-3.5 py-3
                        ${up
                          ? 'border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'border-rose-200/80 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${up ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}`}>
                          {up ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                        </span>
                        <div>
                          <p className={`m-0 font-semibold text-sm ${up ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                            <bdi dir="ltr">{up ? '+' : ''}{a.delta_points.toLocaleString(localeTag())}</bdi>
                            <span className="text-surface-400 font-normal text-xs ms-1">امتیاز</span>
                          </p>
                          <p className="m-0 text-[11px] text-surface-500 mt-0.5">
                            {a.actor ? `توسط ${a.actor.name}` : 'سوپریوزر'}
                            {a.created_at ? <> · <DateTimeText value={a.created_at} /></> : null}
                          </p>
                        </div>
                      </div>
                      {a.note ? (
                        <div className="mt-2.5 flex gap-2 rounded-lg bg-white/70 dark:bg-surface-900/50 border border-surface-200/70 dark:border-surface-700/70 px-3 py-2">
                          <MessageSquareText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-surface-400" />
                          <p className="m-0 text-xs text-surface-700 dark:text-surface-200 leading-relaxed">{a.note}</p>
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold m-0">درگاه‌های واجد شرایط دائمی</h3>
            {detail.permanent_eligibilities.length === 0 ? (
              <p className="text-xs text-surface-500 m-0">هنوز درگاهی قفل نشده.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
                <table className="w-full text-xs table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '42%' }} />
                    <col style={{ width: '36%' }} />
                    <col style={{ width: '22%' }} />
                  </colgroup>
                  <thead className="bg-surface-50 dark:bg-surface-800/60 text-surface-500">
                    <tr>
                      <th className="text-start p-2.5 font-medium">درگاه</th>
                      <th className="text-start p-2.5 font-medium">مرچنت</th>
                      <th className="text-start p-2.5 font-medium">ماه قفل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.permanent_eligibilities.map((e) => (
                      <tr key={e.gateway_sale_id} className="border-t border-surface-100 dark:border-surface-800">
                        <td className="p-2.5 text-start align-middle break-words">{e.gateway_name || `#${e.gateway_sale_id}`}</td>
                        <td className="p-2.5 text-start align-middle">
                          <bdi className="tabular-nums break-all" dir="ltr">{e.merchant_code || '—'}</bdi>
                        </td>
                        <td className="p-2.5 text-start align-middle whitespace-nowrap">
                          {e.qualified_month ? <MonthText value={e.qualified_month} /> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  )
}

export function PointsMonitorPage() {
  const { t } = useApp()
  const qc = useQueryClient()
  const user = useAuth((s) => s.user)
  const isSuper = Boolean(user?.is_superuser)
  const [month, setMonth] = useState(currentMonthKey())
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'tree' | 'list'>('tree')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [detailKey, setDetailKey] = useState<{ userId: number; roleSlug: string } | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['points-monitor', month, search],
    queryFn: async () => (await api.get('/points/monitor', {
      params: { month, search: search || undefined },
    })).data,
  })

  const detailQ = useQuery({
    queryKey: ['points-detail', detailKey?.userId, detailKey?.roleSlug, month],
    enabled: Boolean(detailKey),
    queryFn: async () => (await api.get('/points/detail', {
      params: {
        user_id: detailKey!.userId,
        role_slug: detailKey!.roleSlug,
        month,
      },
    })).data as DetailPayload,
  })

  const adjust = useMutation({
    mutationFn: async (payload: { delta_points: number; note: string }) =>
      (await api.post('/points/adjust', {
        user_id: detailKey!.userId,
        role_slug: detailKey!.roleSlug,
        month,
        delta_points: payload.delta_points,
        note: payload.note || undefined,
      })).data,
    onSuccess: () => {
      toast.success('امتیاز به‌روز شد')
      qc.invalidateQueries({ queryKey: ['points-monitor'] })
      qc.invalidateQueries({ queryKey: ['points-detail'] })
      qc.invalidateQueries({ queryKey: ['monthly-bonus'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      const data = err.response?.data
      const firstFieldError = data?.errors ? Object.values(data.errors).flat()[0] : undefined
      toast.error(firstFieldError ?? data?.message ?? 'خطا در ویرایش امتیاز')
    },
  })

  const tree = (data?.tree ?? []) as TreeNode[]
  const flat = (data?.roles_flat ?? []) as FlatRow[]
  const summary = data?.summary as {
    scored_nodes?: number
    total_points?: number
    gateway_points?: number
    manual_points?: number
    qualified_nodes?: number
    role_rows?: number
  } | undefined

  // ریشه درخت به‌صورت پیش‌فرض باز؛ با کلیک جمع می‌شود
  const rootKey = useMemo(() => tree.map((n) => n.id).join(','), [tree])
  useEffect(() => {
    setExpanded(new Set(tree.map((n) => n.id)))
  }, [rootKey, tree])

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openDetail = (userId: number, roleSlug: string) => setDetailKey({ userId, roleSlug })

  const filteredFlat = useMemo(() => flat, [flat])

  let body: ReactNode
  if (isLoading) {
    body = <p className="text-sm text-surface-500 p-6 m-0">در حال بارگذاری درخت امتیاز...</p>
  } else if (view === 'tree') {
    body = tree.length === 0 ? (
      <Empty title="گره‌ای برای نمایش نیست" />
    ) : (
      <TreeBranch nodes={tree} onOpen={openDetail} expanded={expanded} toggle={toggle} />
    )
  } else {
    body = filteredFlat.length === 0 ? (
      <Empty title="ردیفی یافت نشد" />
    ) : (
      <div className="overflow-x-auto rounded-2xl border border-surface-200 dark:border-surface-700">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-surface-50/90 dark:bg-surface-800/60 text-xs text-surface-500">
              <th className="text-start px-5 py-3 font-medium">کاربر</th>
              <th className="text-start px-4 py-3 font-medium">نقش</th>
              <th className="text-start px-4 py-3 font-medium">امتیاز</th>
              <th className="text-start px-4 py-3 font-medium min-w-[9rem]">پیشرفت</th>
              <th className="text-start px-4 py-3 font-medium w-28" />
            </tr>
          </thead>
          <tbody>
            {filteredFlat.map((row) => (
              <tr
                key={`${row.user_id}-${row.role_slug}`}
                className="border-t border-surface-100 dark:border-surface-800/80 hover:bg-surface-50/70 dark:hover:bg-surface-800/35 transition-colors"
              >
                <td className="px-5 py-3 text-start align-middle">
                  <div className="font-medium text-surface-800 dark:text-surface-100 leading-5">{row.name}</div>
                  {row.mobile ? (
                    <div className="mt-0.5 text-xs text-surface-400 leading-4">
                      <bdi className="tabular-nums tracking-wide" dir="ltr">{row.mobile}</bdi>
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-middle">
                  <Badge tone="info">{roleLabel(row.role_slug) || row.role_name}</Badge>
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="space-y-1">
                    <ScorePair actual={row.actual} required={row.required} compact />
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-surface-500 leading-4">
                      <span>درگاه {row.gateway_count.toLocaleString(localeTag())}</span>
                      {row.manual_points !== 0 && (
                        <span className={row.manual_points > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          دستی <bdi dir="ltr">{row.manual_points > 0 ? '+' : ''}{row.manual_points.toLocaleString(localeTag())}</bdi>
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">
                  <ProgressBar value={row.actual} max={Math.max(1, row.required)} />
                  <p className="text-[11px] mt-1.5 m-0 text-surface-500">
                    {row.threshold_met ? 'حد نصاب ✓' : `${row.progress_pct}٪`}
                  </p>
                </td>
                <td className="px-4 py-3 align-middle text-end">
                  <button type="button" className="btn btn-soft btn-sm" onClick={() => openDetail(row.user_id, row.role_slug)}>
                    جزئیات
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="points-monitor-page">
      <PageHeader
        title={t('navPoints')}
        subtitle={isSuper ? t('pointsSubSuper') : t('pointsSubSenior')}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="نقش‌های امتیازدار" value={(summary?.role_rows ?? 0).toLocaleString(localeTag())} icon={Users} color="from-sky-500 to-sky-600" />
        <StatCard title="جمع امتیاز ماه" value={(summary?.total_points ?? 0).toLocaleString(localeTag())} icon={Target} color="from-violet-500 to-violet-600" />
        <StatCard title="از ثبت درگاه" value={(summary?.gateway_points ?? 0).toLocaleString(localeTag())} icon={Award} color="from-emerald-500 to-emerald-600" />
        <StatCard title="حد نصاب تکمیل" value={(summary?.qualified_nodes ?? 0).toLocaleString(localeTag())} icon={Sparkles} color="from-amber-500 to-amber-600" />
      </div>

      <div className="card p-4">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4 justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="field !gap-1.5">
              <span>ماه شمسی</span>
              <JalaliMonthPicker value={month} onChange={setMonth} />
            </div>

            <div className="field !gap-1.5">
              <span>جستجو</span>
              <div className="relative w-56 max-w-full">
                <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 w-3.5 h-3.5 text-surface-400 z-[1]" />
                <input
                  className="input !ps-9"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSearch(searchInput.trim()) }}
                  placeholder="نام یا موبایل"
                  autoComplete="off"
                />
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm px-4 self-end mb-[1px]"
              style={{ height: 42 }}
              onClick={() => setSearch(searchInput.trim())}
            >
              اعمال
            </button>
            {search && (
              <button
                type="button"
                className="btn btn-ghost btn-sm self-end mb-[1px]"
                onClick={() => { setSearch(''); setSearchInput('') }}
              >
                پاک کردن فیلتر
              </button>
            )}
            {isFetching && <span className="text-xs text-surface-400 self-end pb-2">به‌روزرسانی...</span>}
          </div>

          <div className="inline-flex rounded-xl border border-surface-200 dark:border-surface-700 p-0.5 bg-surface-50/80 dark:bg-surface-900/50 self-start">
            <button
              type="button"
              className={`px-3 py-2 text-xs rounded-[10px] inline-flex items-center gap-1.5 transition-colors ${view === 'tree' ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'}`}
              onClick={() => setView('tree')}
            >
              <TreePine className="w-3.5 h-3.5" /> درختواره
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-xs rounded-[10px] inline-flex items-center gap-1.5 transition-colors ${view === 'list' ? 'bg-primary-600 text-white shadow-sm' : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'}`}
              onClick={() => setView('list')}
            >
              <List className="w-3.5 h-3.5" /> لیست نقش‌ها
            </button>
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-5">{body}</div>

      <DetailModal
        open={Boolean(detailKey)}
        onClose={() => setDetailKey(null)}
        detail={detailQ.data ?? null}
        loading={detailQ.isLoading}
        canAdjust={isSuper}
        adjusting={adjust.isPending}
        onAdjust={(deltaPoints, note) => adjust.mutate({ delta_points: deltaPoints, note })}
      />
    </div>
  )
}
