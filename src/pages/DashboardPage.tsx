import { useQuery } from '@tanstack/react-query'
import { BookOpen, GitBranch, Repeat, TrendingUp, Users, Wallet, Award } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DateTimeText, PageHeader, ProgressBar, ScorePair, StatCard } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { canAccessPage } from '../lib/access'
import { localeTag, money, percent } from '../lib/format'
import { roleLabel } from '../lib/i18n'
import { notificationBody, notificationHref, notificationTitle, type AppNotification } from '../lib/notify'
import { useAuth } from '../stores/auth'

export function DashboardPage() {
  const { t, locale } = useApp()
  const user = useAuth((s) => s.user)
  const role = user?.active_role
  const { data } = useQuery({
    queryKey: ['dashboard', role?.slug],
    queryFn: async () => (await api.get('/dashboard')).data,
  })
  const { data: commissions } = useQuery({
    queryKey: ['commissions', role?.slug],
    queryFn: async () => (await api.get('/commissions')).data,
  })
  const { data: notifs } = useQuery({
    queryKey: ['notif'],
    queryFn: async () => (await api.get('/notifications')).data,
  })
  const q = data?.qualification as {
    actual?: number
    required?: number
    metric_label?: string
    unit?: string
  } | undefined
  const bonus = data?.monthly_bonus as {
    eligible?: boolean
    qualified?: boolean
    profit_sum?: string
    bonus_percent?: string
    bonus_amount?: string
  } | undefined
  const recent = (commissions?.data ?? []).slice(0, 6)
  const latestPromo = (data?.latest_rejected_promotion ?? data?.latest_promotion) as {
    status?: string
    target_role?: { name?: string }
    feedback?: Array<{ decision: string; note?: string }>
  } | undefined
  const rejectNote = latestPromo?.status === 'rejected'
    ? latestPromo.feedback?.find((f) => f.decision === 'rejected')?.note
    : undefined

  return (
    <div className="space-y-6">
      <PageHeader title={`${t('titleDashboard')} ${roleLabel(role?.slug, locale)}`} subtitle={t('dashSubtitle')} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('dashWallet')} value={money(data?.wallet?.balance)} hint={t('toman')} testId="wallet-balance" icon={Wallet} color="from-info to-info" />
        {data?.residual_wallet && (
          <StatCard title={t('dashResidual')} value={money(data.residual_wallet.balance)} hint={t('toman')} testId="residual-wallet-balance" icon={Award} color="from-bad to-acc" />
        )}
        <StatCard title={t('dashHeld')} value={money(data?.wallet?.held_balance)} hint={t('dashHeldHint')} icon={Repeat} color="from-warn to-acc" />
        <StatCard title={t('dashMonthCommission')} value={money(data?.monthly_commissions)} icon={TrendingUp} color="from-ok to-ok" />
        <StatCard title={t('dashTeam')} value={data?.team_count ?? 0} icon={Users} color="from-prim to-prim2" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2" data-testid="qualification-box">
          <div className="font-semibold text-ink mb-2">{t('dashQual')}</div>
          {q && Number(q.required) > 0 ? (
            <>
              <div className="flex items-end justify-between gap-3 mb-3">
                <div className="text-sm text-mute space-y-0.5">
                  {q.metric_label && <div className="font-medium text-mute">{q.metric_label}</div>}
                  <div>
                    <ScorePair actual={Number(q.actual)} required={Number(q.required)} unit={q.unit || undefined} />
                  </div>
                </div>
                <div className="text-lg font-bold text-ink">
                  {Math.min(100, Math.round((Number(q.actual) / (Number(q.required) || 1)) * 100)).toLocaleString(localeTag())}{locale === 'en' ? '%' : '٪'}
                </div>
              </div>
              <ProgressBar value={Number(q.actual)} max={Number(q.required) || 1} />
              {bonus?.eligible && (
                <div className="mt-4 rounded-xl border border-line p-3 space-y-2" data-testid="monthly-bonus-box">
                  <div className={`text-sm font-medium ${bonus.qualified ? 'text-ok' : 'text-mute'}`}>
                    {bonus.qualified ? t('dashBonusEligible') : t('dashBonusWaiting')}
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-mute">{t('dashBonusProfit')}</div>
                      <div className="font-bold text-ink">{money(bonus.profit_sum)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-mute">{t('dashBonusPercent')}</div>
                      <div className="font-bold text-ink">{percent(bonus.bonus_percent)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-mute">{t('dashBonusAmount')}</div>
                      <div className="font-bold text-ok">{money(bonus.bonus_amount)}</div>
                    </div>
                  </div>
                  {canAccessPage(user, 'monthly-bonus') && (
                    <Link to="monthly-bonus" className="inline-block text-xs text-prim hover:text-prim2 font-medium">
                      {t('dashBonusOpen')}
                    </Link>
                  )}
                </div>
              )}
              {(!bonus?.eligible && canAccessPage(user, 'monthly-bonus')) && (
                <div className="mt-3">
                  <Link to="monthly-bonus" className="text-xs text-prim hover:text-prim2 font-medium">
                    {t('dashBonusOpen')}
                  </Link>
                </div>
              )}
            </>
          ) : <div className="text-sm text-mute">{t('dashQualNone')}</div>}
          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl border border-line p-3">
              <div className="text-xs text-mute">{t('dashMonthSales')}</div>
              <div className="text-lg font-bold text-ink">{(data?.monthly_sales ?? 0).toLocaleString(localeTag())}</div>
            </div>
            <div className="rounded-xl border border-line p-3">
              <div className="text-xs text-mute">{t('dashPendingWd')}</div>
              <div className="text-lg font-bold text-ink">{(data?.pending_withdrawals ?? 0).toLocaleString(localeTag())}</div>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="font-semibold text-ink mb-4">{t('dashRecentNotif')}</div>
          <div className="space-y-3">
            {(notifs?.data ?? []).slice(0, 5).map((n: AppNotification) => {
              const href = notificationHref(n, role?.slug, user?.is_superuser)
              const title = notificationTitle(n)
              const body = notificationBody(n)
              return (
              <div key={n.id} className="flex items-start gap-3 py-1">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read_at ? 'bg-surface3' : 'bg-prim'}`} />
                <div className="min-w-0">
                  {href ? (
                    <Link to={href} data-testid="notif-link" className="text-sm font-medium text-prim truncate block">{title}</Link>
                  ) : (
                    <div className="text-sm font-medium text-ink truncate">{title}</div>
                  )}
                  <div className="text-xs text-faint truncate">{body}</div>
                </div>
              </div>
              )
            })}
            {(!notifs?.data || notifs.data.length === 0) && <div className="text-sm text-mute">{t('dashNoNotif')}</div>}
          </div>
        </div>
      </div>

      {rejectNote && (
        <div className="card p-5 border border-bad/30" data-testid="dash-promo-rejected">
          <div className="font-semibold text-bad mb-1">{t('dashPromoRejected')}</div>
          <div className="text-sm text-mute">
            {latestPromo?.target_role?.name ? `${latestPromo.target_role.name} · ` : ''}{rejectNote}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink m-0">{t('dashRecentComm')}</h3>
            <Link className="text-xs text-prim hover:text-prim2" to="commissions">{t('dashViewAll')}</Link>
          </div>
          <div className="space-y-3">
            {recent.map((row: { id: number; commission_amount: string; created_at: string; role?: { name: string }; sale?: { gateway?: { name: string } } }) => (
              <div key={row.id} className="flex items-center justify-between py-2 border-b border-line last:border-0">
                <div>
                  <div className="text-sm font-medium text-ink">{row.sale?.gateway?.name ?? t('navCommissions')}</div>
                  <div className="text-xs text-faint">{row.role?.name} · <DateTimeText value={row.created_at} /></div>
                </div>
                <div className="text-sm font-bold text-ok">{money(row.commission_amount)}</div>
              </div>
            ))}
            {recent.length === 0 && <div className="text-sm text-mute">{t('commEmpty')}</div>}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-ink mb-4">{t('dashQuick')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { to: 'commissions', label: t('dashQuickComm'), icon: TrendingUp, color: 'bg-info' },
              { to: 'monthly-bonus', label: t('navMonthlyBonus'), icon: Award, color: 'bg-prim' },
              { to: 'wallet', label: t('dashQuickWallet'), icon: Wallet, color: 'bg-ok' },
              { to: 'withdrawals', label: t('dashQuickWd'), icon: Repeat, color: 'bg-acc' },
              { to: 'team', label: t('dashQuickTeam'), icon: GitBranch, color: 'bg-prim' },
              { to: 'training', label: t('dashQuickTrain'), icon: BookOpen, color: 'bg-prim2' },
              { to: 'referrals', label: t('dashQuickRef'), icon: Users, color: 'bg-acc2' },
            ].filter((action) => canAccessPage(user, action.to)).map((action) => (
              <Link key={action.to} to={action.to} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-line hover:border-prim/40 hover:bg-surface2 transition-all">
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-mute font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
