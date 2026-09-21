import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Banknote, TrendingUp, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { TablePager } from '../components/table'
import { Badge, DateTimeText, Empty, MonthText, PageHeader, ProgressBar, ScorePair, StatCard } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { confirmAction } from '../lib/confirm'
import { localeTag, money, percent, statusLabel } from '../lib/format'
import { roleLabel } from '../lib/i18n'
import { useAuth } from '../stores/auth'

type BonusCurrent = {
  eligible?: boolean
  qualified?: boolean
  actual?: number
  required?: number
  metric?: string | null
  metric_label?: string | null
  unit?: string | null
  points_per_full_sale?: number | null
  guide?: string[]
  profit_sum?: string
  bonus_percent?: string
  bonus_amount?: string
  month?: string
}

type BonusHistoryRow = {
  id: number
  month?: string
  status: string
  bonus_percent: string
  profit_sum: string
  bonus_amount: string
  created_at?: string
}

type MonitorRow = {
  user_id: number
  name: string
  mobile?: string
  role_slug: string
  role_name: string
  qualified: boolean
  payable?: boolean
  pay_blocked_reason?: string | null
  bonus_posted?: boolean
  actual: number
  required: number
  metric_label?: string
  unit?: string
  bonus_percent: string
  bonus_amount: string
  profit_sum: string
}

export function MonthlyBonusPage() {
  const { t, locale } = useApp()
  const qc = useQueryClient()
  const roleSlug = useAuth((s) => s.user?.active_role?.slug)
  const isSenior = roleSlug === 'senior_manager'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [payingKey, setPayingKey] = useState<string | null>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['monthly-bonus', roleSlug, page, search, roleFilter],
    queryFn: async () => (await api.get('/monthly-bonus', {
      params: isSenior ? {
        page,
        per_page: 20,
        search: search || undefined,
        role_slug: roleFilter || undefined,
      } : undefined,
    })).data,
  })

  const pay = useMutation({
    mutationFn: async (payload: { user_id: number; role_slug: string }) =>
      (await api.post('/monthly-bonus/pay', payload)).data,
    onMutate: (payload) => setPayingKey(`${payload.user_id}:${payload.role_slug}`),
    onSuccess: () => {
      toast.success(t('bonusPayOk'))
      qc.invalidateQueries({ queryKey: ['monthly-bonus'] })
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? t('bonusPayFail'))
    },
    onSettled: () => setPayingKey(null),
  })

  const current = (data?.current ?? null) as BonusCurrent | null
  const history = (data?.history ?? []) as BonusHistoryRow[]
  const monitor = data?.monitor as {
    summary?: { downline_users?: number; bonuses_posted?: number; bonuses_amount?: string; month?: string }
    data?: MonitorRow[]
    meta?: { current_page: number; last_page: number; total: number; from?: number; to?: number; per_page?: number }
  } | null
  const eligible = Boolean(current?.eligible)
  const required = Number(current?.required ?? 0)
  const actual = Number(current?.actual ?? 0)
  const unit = current?.unit ?? ''
  const metricLabel = current?.metric_label ?? t('dashQual')
  const guide = current?.guide ?? []

  if (isSenior) {
    const summary = monitor?.summary
    const rows = monitor?.data ?? []
    const meta = monitor?.meta

    return (
      <div className="space-y-4" data-testid="monthly-bonus-page">
        <PageHeader title={t('bonusMonitorTitle')} subtitle={t('bonusMonitorSub')} />

        <div className="grid sm:grid-cols-3 gap-3">
          <StatCard title={t('bonusMonitorDownline')} value={(summary?.downline_users ?? 0).toLocaleString(localeTag())} icon={Users} color="from-blue-500 to-blue-600" />
          <StatCard title={t('bonusMonitorPosted')} value={(summary?.bonuses_posted ?? 0).toLocaleString(localeTag())} icon={Award} color="from-violet-500 to-violet-600" />
          <StatCard title={t('bonusMonitorAmount')} value={money(summary?.bonuses_amount)} icon={Wallet} color="from-emerald-500 to-emerald-600" />
        </div>
        {(search || roleFilter) && (
          <div className="text-xs text-surface-500 -mt-2">
            {t('bonusMonitorFilteredHint')}
          </div>
        )}

        <div className="card p-4 flex flex-wrap gap-3 items-end">
          <label className="field m-0 grow min-w-[12rem]">
            {t('search')}
            <input
              className="input"
              value={searchInput}
              placeholder={t('bonusMonitorSearchPh')}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1)
                  setSearch(searchInput.trim())
                }
              }}
            />
          </label>
          <label className="field m-0 min-w-[10rem]">
            {t('roles')}
            <select
              className="input"
              value={roleFilter}
              onChange={(e) => {
                setPage(1)
                setRoleFilter(e.target.value)
              }}
            >
              <option value="">{t('bonusMonitorAllRoles')}</option>
              <option value="representative">{roleLabel('representative', locale)}</option>
              <option value="sales_manager">{roleLabel('sales_manager', locale)}</option>
              <option value="development_manager">{roleLabel('development_manager', locale)}</option>
            </select>
          </label>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setPage(1)
              setSearch(searchInput.trim())
            }}
          >
            {t('search')}
          </button>
        </div>

        <div className="card overflow-hidden" data-testid="monthly-bonus-monitor">
          <div className="px-5 pt-5 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold text-surface-800 dark:text-surface-100">{t('bonusMonitorList')}</div>
            {summary?.month && (
              <div className="text-xs text-surface-500">
                {t('bonusMonth')}: <MonthText value={summary.month} />
              </div>
            )}
          </div>
          {isLoading ? (
            <div className="p-5 text-sm text-surface-500">…</div>
          ) : rows.length === 0 ? (
            <div className="px-5 pb-5"><Empty text={t('bonusMonitorEmpty')} /></div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 dark:bg-surface-800/60 text-surface-500">
                  <tr>
                    <th className="text-start font-medium px-5 py-3">{t('name')}</th>
                    <th className="text-start font-medium px-5 py-3">{t('roles')}</th>
                    <th className="text-start font-medium px-5 py-3">{t('dashQual')}</th>
                    <th className="text-start font-medium px-5 py-3">{t('status')}</th>
                    <th className="text-start font-medium px-5 py-3">{t('dashBonusAmount')}</th>
                    <th className="text-start font-medium px-5 py-3">{t('bonusPayAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const key = `${row.user_id}:${row.role_slug}`
                    const canPay = Boolean(row.payable ?? (row.qualified && !row.bonus_posted && Number(row.bonus_amount) > 0 && Number(row.profit_sum) > 0))
                    return (
                      <tr key={key} className="border-t border-surface-100 dark:border-surface-700">
                        <td className="px-5 py-3 text-start">
                          <div className="font-medium text-surface-800 dark:text-surface-100 leading-5">{row.name}</div>
                          {row.mobile ? (
                            <div className="mt-0.5 text-xs text-surface-400 leading-4">
                              <bdi className="tabular-nums tracking-wide" dir="ltr">{row.mobile}</bdi>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-5 py-3">{row.role_name}</td>
                        <td className="px-5 py-3">
                          <div className="text-xs text-surface-500 mb-0.5">{row.metric_label}</div>
                          <ScorePair actual={Number(row.actual)} required={Number(row.required)} unit={row.unit} compact />
                        </td>
                        <td className="px-5 py-3">
                          {row.bonus_posted ? (
                            <Badge tone="ok">{t('bonusStatusPosted')}</Badge>
                          ) : canPay ? (
                            <Badge tone="warn">{t('dashBonusEligible')}</Badge>
                          ) : row.qualified && row.pay_blocked_reason ? (
                            <div className="space-y-1 max-w-[14rem]">
                              <Badge tone="muted">{t('bonusQualifiedNoPay')}</Badge>
                              <div className="text-[11px] leading-4 text-amber-600 dark:text-amber-400">{row.pay_blocked_reason}</div>
                            </div>
                          ) : (
                            <Badge tone="muted">{t('dashBonusWaiting')}</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 font-bold text-emerald-600">{money(row.bonus_amount)}</td>
                        <td className="px-5 py-3">
                          {canPay ? (
                            <button
                              type="button"
                              className="btn btn-ok btn-sm inline-flex items-center gap-1.5 whitespace-nowrap"
                              data-testid="bonus-pay-btn"
                              disabled={payingKey === key}
                              onClick={async () => {
                                if (await confirmAction({
                                  title: t('bonusPay'),
                                  text: t('bonusPayConfirm'),
                                  confirmText: t('bonusPay'),
                                  danger: false,
                                  icon: 'question',
                                })) {
                                  pay.mutate({ user_id: row.user_id, role_slug: row.role_slug })
                                }
                              }}
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              {payingKey === key ? '…' : t('bonusPay')}
                            </button>
                          ) : (
                            <span className="text-xs text-surface-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {meta && (
            <TablePager
              page={meta.current_page}
              last={meta.last_page}
              from={meta.from}
              to={meta.to}
              total={meta.total}
              disabled={isFetching}
              onPage={setPage}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="monthly-bonus-page">
      <PageHeader title={t('bonusTitle')} subtitle={t('bonusSub')} />

      <div className="card p-5 space-y-4" data-testid="monthly-bonus-current">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold text-surface-800 dark:text-surface-100">{t('bonusCurrent')}</div>
          {current?.month && (
            <div className="text-xs text-surface-500">
              {t('bonusMonth')}: <MonthText value={current.month} />
            </div>
          )}
        </div>
        {!eligible || required <= 0 ? (
          <div className="text-sm text-surface-500">{t('bonusNoRole')}</div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium text-surface-700 dark:text-surface-200">{metricLabel}</div>
                <div className="text-sm text-surface-500">
                  <ScorePair actual={actual} required={required} unit={unit || undefined} />
                </div>
              </div>
              <div className={`text-sm font-medium ${current?.qualified ? 'text-emerald-600' : 'text-amber-600'}`}>
                {current?.qualified ? t('dashBonusEligible') : t('dashBonusWaiting')}
              </div>
            </div>
            <ProgressBar value={actual} max={required || 1} />

            {guide.length > 0 && (
              <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-800/40 p-4 space-y-2" data-testid="monthly-bonus-guide">
                <div className="text-sm font-semibold text-surface-800 dark:text-surface-100">{t('bonusHowTo')}</div>
                {current?.points_per_full_sale ? (
                  <div className="text-sm text-surface-600 dark:text-surface-300">
                    {t('bonusPointsPerSale')}: <strong dir="ltr" className="datetime-ltr">{Number(current.points_per_full_sale).toLocaleString(localeTag())}</strong>
                  </div>
                ) : null}
                <ul className="list-disc ps-5 space-y-1.5 text-sm text-surface-600 dark:text-surface-300">
                  {guide.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-3">
              <StatCard title={t('dashBonusProfit')} value={money(current?.profit_sum)} icon={TrendingUp} color="from-blue-500 to-blue-600" />
              <StatCard title={t('dashBonusPercent')} value={percent(current?.bonus_percent)} icon={Award} color="from-violet-500 to-violet-600" />
              <StatCard title={t('dashBonusAmount')} value={money(current?.bonus_amount)} icon={Wallet} color="from-emerald-500 to-emerald-600" />
            </div>
          </>
        )}
      </div>

      <div className="card overflow-hidden" data-testid="monthly-bonus-history">
        <div className="px-5 pt-5 pb-3 font-semibold text-surface-800 dark:text-surface-100">{t('bonusHistory')}</div>
        {isLoading ? (
          <div className="p-5 text-sm text-surface-500">…</div>
        ) : history.length === 0 ? (
          <div className="px-5 pb-5"><Empty text={t('bonusHistoryEmpty')} /></div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 dark:bg-surface-800/60 text-surface-500">
                <tr>
                  <th className="text-start font-medium px-5 py-3">{t('bonusMonth')}</th>
                  <th className="text-start font-medium px-5 py-3">{t('dashBonusPercent')}</th>
                  <th className="text-start font-medium px-5 py-3">{t('dashBonusProfit')}</th>
                  <th className="text-start font-medium px-5 py-3">{t('dashBonusAmount')}</th>
                  <th className="text-start font-medium px-5 py-3">{t('status')}</th>
                  <th className="text-start font-medium px-5 py-3">{t('bonusPostedAt')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-t border-surface-100 dark:border-surface-700">
                    <td className="px-5 py-3 font-medium text-surface-800 dark:text-surface-100">
                      <MonthText value={row.month} />
                    </td>
                    <td className="px-5 py-3">{percent(row.bonus_percent)}</td>
                    <td className="px-5 py-3">{money(row.profit_sum)}</td>
                    <td className="px-5 py-3 font-bold text-emerald-600">{money(row.bonus_amount)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={row.status === 'posted' ? 'ok' : 'danger'}>
                        {row.status === 'posted' ? t('bonusStatusPosted') : row.status === 'reversed' ? t('bonusStatusReversed') : (statusLabel[row.status] ?? row.status)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-surface-500"><DateTimeText value={row.created_at} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
