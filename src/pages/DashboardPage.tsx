import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../stores/auth'

export function DashboardPage() {
  const role = useAuth((s) => s.user?.active_role)
  const { data } = useQuery({
    queryKey: ['dashboard', role?.slug],
    queryFn: async () => (await api.get('/dashboard')).data,
  })

  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-extrabold">داشبورد {role?.name}</h2>
      <div className="grid md:grid-cols-4 gap-3">
        <Stat title="کیف پول نقش" value={data?.wallet?.balance ?? '0'} testId="wallet-balance" />
        <Stat title="مسدودشده" value={data?.wallet?.held_balance ?? '0'} />
        <Stat title="پورسانت این ماه" value={data?.monthly_commissions ?? '0'} />
        <Stat title="تیم تحت مدیریت" value={data?.team_count ?? 0} />
      </div>
      {data?.qualification && (
        <div className="card p-4" data-testid="qualification-box">
          <div className="font-bold mb-2">پیشرفت شرط پاداش ماهانه</div>
          <div>{data.qualification.actual} از {data.qualification.required}</div>
          <progress className="w-full" max={data.qualification.required || 1} value={data.qualification.actual} />
        </div>
      )}
    </div>
  )
}

function Stat({ title, value, testId }: { title: string; value: string | number; testId?: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-[var(--muted)]">{title}</div>
      <div className="text-2xl font-extrabold" data-testid={testId}>{value}</div>
    </div>
  )
}
