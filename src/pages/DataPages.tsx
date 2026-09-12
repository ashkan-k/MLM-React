import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../lib/api'
import { useAuth } from '../stores/auth'

export function TeamPage() {
  const { data: tree } = useQuery({ queryKey: ['tree'], queryFn: async () => (await api.get('/organization/tree')).data })
  const { data: team } = useQuery({ queryKey: ['team'], queryFn: async () => (await api.get('/organization/team')).data })
  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-extrabold">درخت سازمان</h2>
      <div className="card p-4" data-testid="org-tree"><Tree nodes={tree ?? []} /></div>
      <div className="card p-4 overflow-auto">
        <table className="table">
          <thead><tr><th>نام</th><th>موبایل</th></tr></thead>
          <tbody>{(team ?? []).map((u: { id: number; name: string; mobile: string }) => <tr key={u.id}><td>{u.name}</td><td>{u.mobile}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

function Tree({ nodes }: { nodes: Array<{ id: number; user: { name: string }; role: { name: string }; children: unknown[] }> }) {
  return (
    <ul className="pr-4 border-r border-[var(--line)]">
      {nodes.map((n) => (
        <li key={n.id} className="my-2">
          <span className="font-bold">{n.user?.name}</span> <span className="badge">{n.role?.name}</span>
          {Array.isArray(n.children) && n.children.length > 0 && <Tree nodes={n.children as never} />}
        </li>
      ))}
    </ul>
  )
}

export function GatewaysPage() {
  const { data } = useQuery({ queryKey: ['sales'], queryFn: async () => (await api.get('/gateway-sales')).data })
  return (
    <PageTable title="فروش درگاه‌ها" rows={data?.data ?? []} columns={['id', 'amount', 'status', 'sold_at']} testId="gateway-table" />
  )
}

export function CommissionsPage() {
  const { data } = useQuery({ queryKey: ['commissions'], queryFn: async () => (await api.get('/commissions')).data })
  return (
    <div className="grid gap-3">
      <h2 className="text-2xl font-extrabold">پورسانت نقش فعال</h2>
      <div className="card p-4 overflow-auto" data-testid="commission-table">
        <table className="table">
          <thead><tr><th>نقش</th><th>درصد</th><th>مبلغ</th></tr></thead>
          <tbody>
            {(data?.data ?? []).map((row: { id: number; commission_percent: string; commission_amount: string; role?: { name: string } }) => (
              <tr key={row.id}><td>{row.role?.name}</td><td>{row.commission_percent}</td><td>{row.commission_amount}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function WalletPage() {
  const { data: wallets } = useQuery({ queryKey: ['wallets'], queryFn: async () => (await api.get('/wallets')).data })
  const { data: txs } = useQuery({ queryKey: ['wtx'], queryFn: async () => (await api.get('/wallet-transactions')).data })
  return (
    <div className="grid gap-4">
      {(wallets ?? []).map((w: { id: number; balance: string; held_balance: string; role?: { name: string } }) => (
        <div className="card p-4" key={w.id} data-testid="role-wallet">
          <div className="font-bold">{w.role?.name}</div>
          <div>مانده: {w.balance} | مسدود: {w.held_balance}</div>
        </div>
      ))}
      <PageTable title="دفتر تراکنش" rows={txs?.data ?? []} columns={['type', 'amount', 'balance_after']} />
    </div>
  )
}

export function FinancePage() {
  const { data } = useQuery({ queryKey: ['agg'], queryFn: async () => (await api.get('/wallets/aggregate')).data })
  return (
    <div className="card p-4" data-testid="aggregate-finance">
      <h2 className="text-xl font-extrabold mb-2">گزارش تجمیعی</h2>
      <p className="text-sm mb-3">{data?.note}</p>
      {(data?.by_role ?? []).map((w: { id: number; role?: { name: string }; balance: string }) => (
        <div key={w.id} className="flex justify-between border-b py-2"><span>{w.role?.name}</span><strong>{w.balance}</strong></div>
      ))}
    </div>
  )
}

export function WithdrawalsPage() {
  const qc = useQueryClient()
  const { data: wallets } = useQuery({ queryKey: ['wallets'], queryFn: async () => (await api.get('/wallets')).data })
  const { data } = useQuery({ queryKey: ['wd'], queryFn: async () => (await api.get('/withdrawals')).data })
  const [amount, setAmount] = useState('1000')
  const mutate = useMutation({
    mutationFn: async () => {
      if (!wallets?.[0]?.id) throw new Error('کیف پول نقش فعال هنوز بارگذاری نشده است.')
      return api.post('/withdrawals', { wallet_id: wallets[0].id, amount, idempotency_key: `ui-${Date.now()}` })
    },
    onSuccess: () => { toast.success('درخواست برداشت ثبت شد'); qc.invalidateQueries({ queryKey: ['wd'] }) },
    onError: () => toast.error('ثبت برداشت ناموفق بود'),
  })
  const decide = useMutation({
    mutationFn: async ({ id, decision }: { id: number; decision: string }) => api.post(`/withdrawals/${id}/decide`, { decision }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wd'] }),
  })
  return (
    <div className="grid gap-4">
      <div className="card p-4 grid gap-2 max-w-md">
        <h2 className="font-extrabold">درخواست برداشت</h2>
        <input className="input" data-testid="withdraw-amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="btn btn-primary" data-testid="withdraw-submit" disabled={!wallets?.[0]?.id || mutate.isPending} onClick={() => mutate.mutate()}>ثبت</button>
      </div>
      <div className="card p-4 overflow-auto">
        <table className="table">
          <thead><tr><th>مبلغ</th><th>وضعیت</th><th></th></tr></thead>
          <tbody>
            {(data?.data ?? []).map((row: { id: number; amount: string; status: string }) => (
              <tr key={row.id}>
                <td>{row.amount}</td><td data-testid="withdraw-status">{row.status}</td>
                <td className="flex gap-2">
                  <button className="btn btn-primary" onClick={() => decide.mutate({ id: row.id, decision: 'approved' })}>تایید</button>
                  <button className="btn btn-ghost" onClick={() => decide.mutate({ id: row.id, decision: 'rejected' })}>رد</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ReferralsPage() {
  const qc = useQueryClient()
  const { data: codes } = useQuery({ queryKey: ['codes'], queryFn: async () => (await api.get('/referrals/codes')).data })
  const { data: links } = useQuery({ queryKey: ['links'], queryFn: async () => (await api.get('/shared-links')).data })
  const { data: reps } = useQuery({ queryKey: ['reps'], queryFn: async () => (await api.get('/representatives')).data })
  const [shareUser, setShareUser] = useState('')
  const create = useMutation({
    mutationFn: async () => api.post('/shared-links', {
      type: 'gateway_sale',
      members: [
        { user_id: reps?.[0]?.id, share_percent: 50 },
        { user_id: Number(shareUser), share_percent: 50 },
      ],
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links'] }),
  })
  return (
    <div className="grid gap-4">
      <div className="card p-4">
        <h2 className="font-extrabold">کد معرف / لینک ثبت‌نام نماینده</h2>
        {(codes ?? []).map((c: { id: number; code: string }) => <div key={c.id} data-testid="referral-code">{c.code}</div>)}
      </div>
      <div className="card p-4 grid gap-2">
        <h2 className="font-extrabold">ایجاد لینک اشتراکی یک‌بارمصرف</h2>
        <select className="input" value={shareUser} onChange={(e) => setShareUser(e.target.value)}>
          <option value="">انتخاب نماینده دوم</option>
          {(reps ?? []).map((r: { id: number; name: string }) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => create.mutate()}>ایجاد لینک</button>
      </div>
      <div className="card p-4" data-testid="shared-links">
        {(links ?? []).map((l: { id: number; token: string; status: string }) => (
          <div key={l.id} className="flex justify-between py-2 border-b"><span>{l.token}</span><span className="badge">{l.status}</span></div>
        ))}
      </div>
    </div>
  )
}

export function PromotionsPage() {
  const qc = useQueryClient()
  const { data: eligibility } = useQuery({ queryKey: ['elig'], queryFn: async () => (await api.get('/promotions/eligibility')).data })
  const { data } = useQuery({ queryKey: ['promo'], queryFn: async () => (await api.get('/promotions')).data })
  const request = useMutation({
    mutationFn: async () => api.post('/promotions', { from_role: 'representative', target_role: 'sales_manager' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo'] }),
  })
  const decide = useMutation({
    mutationFn: async ({ id, decision }: { id: number; decision: string }) => api.post(`/promotions/${id}/decide`, { decision, note: 'بررسی شد' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo'] }),
  })
  return (
    <div className="grid gap-4">
      <div className="card p-4" data-testid="promotion-criteria">
        <h2 className="font-extrabold mb-2">معیارهای ارتقاء</h2>
        {(eligibility ?? []).map((c: { code: string; actual: number; required: number; passed: boolean }) => (
          <div key={c.code}>{c.code}: {c.actual}/{c.required} {c.passed ? '✓' : '✗'}</div>
        ))}
        <button className="btn btn-primary mt-3" onClick={() => request.mutate()}>ارسال برای مدیر ارشد</button>
      </div>
      {(data ?? []).map((p: { id: number; status: string; user?: { name: string } }) => (
        <div key={p.id} className="card p-4 flex justify-between">
          <div>{p.user?.name} - {p.status}</div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={() => decide.mutate({ id: p.id, decision: 'approved' })}>تایید</button>
            <button className="btn btn-ghost" onClick={() => decide.mutate({ id: p.id, decision: 'rejected' })}>رد</button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TrainingPage() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['courses'], queryFn: async () => (await api.get('/courses')).data })
  const submit = useMutation({
    mutationFn: async ({ course, level }: { course: number; level: number }) => api.post(`/courses/${course}/levels/${level}/submit`, { score: 90 }),
    onSuccess: () => { toast.success('نمره ثبت شد'); qc.invalidateQueries({ queryKey: ['courses'] }) },
  })
  return (
    <div className="grid gap-3" data-testid="training-list">
      {(data ?? []).map((c: { id: number; title: string; levels: Array<{ id: number; title: string }> }) => (
        <div key={c.id} className="card p-4">
          <div className="font-extrabold">{c.title}</div>
          {c.levels.map((l) => (
            <div key={l.id} className="flex justify-between py-2">
              <span>{l.title}</span>
              <button className="btn btn-gold" onClick={() => submit.mutate({ course: c.id, level: l.id })}>ثبت نمره قبولی</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function NotificationsPage() {
  const { data } = useQuery({ queryKey: ['notif'], queryFn: async () => (await api.get('/notifications')).data })
  return (
    <div className="grid gap-2" data-testid="notifications">
      {(data?.data ?? []).map((n: { id: number; title: string; body: string }) => (
        <div key={n.id} className="card p-4"><div className="font-bold">{n.title}</div><div className="text-sm">{n.body}</div></div>
      ))}
    </div>
  )
}

export function TransfersPage() {
  const [form, setForm] = useState({ from_user_id: '', to_user_id: '', reason: 'انتقال آینده مزایا' })
  const { data } = useQuery({ queryKey: ['bt'], queryFn: async () => (await api.get('/benefit-transfers')).data })
  return (
    <div className="grid gap-4">
      <form className="card p-4 grid gap-2 max-w-lg" onSubmit={async (e) => {
        e.preventDefault()
        await api.post('/benefit-transfers', { ...form, type: 'all_future_benefits' })
        toast.success('انتقال ثبت شد')
      }}>
        <h2 className="font-extrabold">انتقال تمام مزایای آینده</h2>
        <input className="input" placeholder="شناسه مبدا" value={form.from_user_id} onChange={(e) => setForm({ ...form, from_user_id: e.target.value })} />
        <input className="input" placeholder="شناسه مقصد" value={form.to_user_id} onChange={(e) => setForm({ ...form, to_user_id: e.target.value })} />
        <textarea className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <button className="btn btn-primary" type="submit">ثبت انتقال</button>
      </form>
      {(data ?? []).map((t: { id: number; transfer_type: string; reason?: string }) => (
        <div key={t.id} className="card p-3">{t.transfer_type} - {t.reason}</div>
      ))}
    </div>
  )
}

function PageTable({ title, rows, columns, testId }: { title: string; rows: Array<Record<string, unknown>>; columns: string[]; testId?: string }) {
  return (
    <div className="grid gap-3">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      <div className="card p-4 overflow-auto" data-testid={testId}>
        <table className="table">
          <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={String(row.id ?? i)}>{columns.map((c) => <td key={c}>{String(row[c] ?? '')}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function useCurrentUserId() {
  return useAuth((s) => s.user?.id)
}
