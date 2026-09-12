import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageHeader, ProgressBar, StatCard } from '../components/ui'
import { api } from '../lib/api'
import { money } from '../lib/format'
import { useAuth } from '../stores/auth'

export function DashboardPage() {
  const role = useAuth((s) => s.user?.active_role)
  const { data } = useQuery({
    queryKey: ['dashboard', role?.slug],
    queryFn: async () => (await api.get('/dashboard')).data,
  })
  const q = data?.qualification

  return (
    <div>
      <PageHeader title={`داشبورد ${role?.name ?? ''}`} subtitle="خلاصه عملکرد نقش فعال؛ کیف پول این صفحه فقط متعلق به همین سمت است." />
      <div className="grid md:grid-cols-4 gap-3 mb-4">
        <StatCard title="مانده کیف پول این نقش" value={money(data?.wallet?.balance)} hint="ریال" testId="wallet-balance" />
        <StatCard title="مبلغ مسدودشده" value={money(data?.wallet?.held_balance)} hint="در انتظار تایید برداشت" />
        <StatCard title="پورسانت این ماه" value={money(data?.monthly_commissions)} />
        <StatCard title="اعضای تیم تحت مدیریت" value={data?.team_count ?? 0} />
      </div>
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="card p-5" data-testid="qualification-box">
          <div className="font-bold mb-2">شرط پاداش ماهانه</div>
          {q ? (
            <>
              <div className="text-sm text-[var(--muted)] mb-2">{q.actual} از {q.required}</div>
              <ProgressBar value={Number(q.actual)} max={Number(q.required) || 1} />
            </>
          ) : <div className="text-sm text-[var(--muted)]">این نقش شرط پاداش ماهانه ندارد.</div>}
        </div>
        <div className="card p-5 flex flex-wrap gap-2 items-start">
          <Link className="btn btn-primary" to="commissions">مشاهده پورسانت‌ها</Link>
          <Link className="btn btn-ghost" to="wallet">جزئیات کیف پول</Link>
          <Link className="btn btn-ghost" to="withdrawals">درخواست برداشت</Link>
          <Link className="btn btn-ghost" to="training">ادامه آموزش</Link>
        </div>
      </div>
    </div>
  )
}
