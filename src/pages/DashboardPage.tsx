import { useQuery } from '@tanstack/react-query'
import { BookOpen, GitBranch, Repeat, TrendingUp, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DateTimeText, PageHeader, ProgressBar, StatCard } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { localeTag, money } from '../lib/format'
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
  const q = data?.qualification
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
        <StatCard title={t('dashWallet')} value={money(data?.wallet?.balance)} hint={t('toman')} testId="wallet-balance" icon={Wallet} color="from-blue-500 to-blue-600" />
        <StatCard title={t('dashHeld')} value={money(data?.wallet?.held_balance)} hint={t('dashHeldHint')} icon={Repeat} color="from-amber-500 to-amber-600" />
        <StatCard title={t('dashMonthCommission')} value={money(data?.monthly_commissions)} icon={TrendingUp} color="from-emerald-500 to-emerald-600" />
        <StatCard title={t('dashTeam')} value={data?.team_count ?? 0} icon={Users} color="from-purple-500 to-purple-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2" data-testid="qualification-box">
          <div className="font-semibold text-surface-800 dark:text-surface-100 mb-2">{t('dashQual')}</div>
          {q ? (
            <>
              <div className="flex items-end justify-between gap-3 mb-3">
                <div className="text-sm text-surface-500">{q.actual} از {q.required}</div>
                <div className="text-lg font-bold text-surface-800 dark:text-surface-100">
                  {Math.min(100, Math.round((Number(q.actual) / (Number(q.required) || 1)) * 100)).toLocaleString(localeTag())}{locale === 'en' ? '%' : '٪'}
                </div>
              </div>
              <ProgressBar value={Number(q.actual)} max={Number(q.required) || 1} />
            </>
          ) : <div className="text-sm text-surface-500">{t('dashQualNone')}</div>}
          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-3">
              <div className="text-xs text-surface-500">{t('dashMonthSales')}</div>
              <div className="text-lg font-bold text-surface-800 dark:text-surface-100">{(data?.monthly_sales ?? 0).toLocaleString(localeTag())}</div>
            </div>
            <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-3">
              <div className="text-xs text-surface-500">{t('dashPendingWd')}</div>
              <div className="text-lg font-bold text-surface-800 dark:text-surface-100">{(data?.pending_withdrawals ?? 0).toLocaleString(localeTag())}</div>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="font-semibold text-surface-800 dark:text-surface-200 mb-4">{t('dashRecentNotif')}</div>
          <div className="space-y-3">
            {(notifs?.data ?? []).slice(0, 5).map((n: AppNotification) => {
              const href = notificationHref(n, role?.slug, user?.is_superuser)
              const title = notificationTitle(n)
              const body = notificationBody(n)
              return (
              <div key={n.id} className="flex items-start gap-3 py-1">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read_at ? 'bg-surface-300' : 'bg-primary-500'}`} />
                <div className="min-w-0">
                  {href ? (
                    <Link to={href} data-testid="notif-link" className="text-sm font-medium text-primary-600 truncate block">{title}</Link>
                  ) : (
                    <div className="text-sm font-medium text-surface-700 dark:text-surface-300 truncate">{title}</div>
                  )}
                  <div className="text-xs text-surface-400 truncate">{body}</div>
                </div>
              </div>
              )
            })}
            {(!notifs?.data || notifs.data.length === 0) && <div className="text-sm text-surface-500">{t('dashNoNotif')}</div>}
          </div>
        </div>
      </div>

      {rejectNote && (
        <div className="card p-5 border border-red-200 dark:border-red-900/40" data-testid="dash-promo-rejected">
          <div className="font-semibold text-red-700 dark:text-red-300 mb-1">{t('dashPromoRejected')}</div>
          <div className="text-sm text-surface-600 dark:text-surface-400">
            {latestPromo?.target_role?.name ? `${latestPromo.target_role.name} · ` : ''}{rejectNote}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-800 dark:text-surface-200 m-0">{t('dashRecentComm')}</h3>
            <Link className="text-xs text-primary-600 hover:text-primary-700" to="commissions">{t('dashViewAll')}</Link>
          </div>
          <div className="space-y-3">
            {recent.map((row: { id: number; commission_amount: string; created_at: string; role?: { name: string }; sale?: { gateway?: { name: string } } }) => (
              <div key={row.id} className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-surface-700 last:border-0">
                <div>
                  <div className="text-sm font-medium text-surface-700 dark:text-surface-300">{row.sale?.gateway?.name ?? t('navCommissions')}</div>
                  <div className="text-xs text-surface-400">{row.role?.name} · <DateTimeText value={row.created_at} /></div>
                </div>
                <div className="text-sm font-bold text-emerald-600">{money(row.commission_amount)}</div>
              </div>
            ))}
            {recent.length === 0 && <div className="text-sm text-surface-500">{t('commEmpty')}</div>}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-surface-800 dark:text-surface-200 mb-4">{t('dashQuick')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { to: 'commissions', label: t('dashQuickComm'), icon: TrendingUp, color: 'bg-blue-500' },
              { to: 'wallet', label: t('dashQuickWallet'), icon: Wallet, color: 'bg-emerald-500' },
              { to: 'withdrawals', label: t('dashQuickWd'), icon: Repeat, color: 'bg-amber-500' },
              { to: 'team', label: t('dashQuickTeam'), icon: GitBranch, color: 'bg-purple-500' },
              { to: 'training', label: t('dashQuickTrain'), icon: BookOpen, color: 'bg-cyan-500' },
              { to: 'referrals', label: t('dashQuickRef'), icon: Users, color: 'bg-pink-500' },
            ].map((action) => (
              <Link key={action.to} to={action.to} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-surface-600 dark:text-surface-400 font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
