import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge, DateTimeText, Empty, Modal, PageHeader } from '../components/ui'
import { api } from '../lib/api'
import { criterionLabel, label, money, percent } from '../lib/format'
import { useAuth } from '../stores/auth'

type TreeNode = { id: number; user: { name: string; mobile?: string }; role: { name: string }; children: TreeNode[] }

export function TeamPage() {
  const { data: tree } = useQuery({ queryKey: ['tree'], queryFn: async () => (await api.get('/organization/tree')).data })
  const { data: team } = useQuery({ queryKey: ['team'], queryFn: async () => (await api.get('/organization/team')).data })

  return (
    <div className="grid gap-4">
      <PageHeader title="سازمان و تیم" subtitle="چیدمان فعلی درخت فروش و اعضای زیرمجموعه شما." />
      <div className="card p-5" data-testid="org-tree">
        <div className="font-bold mb-3">درخت سازمان</div>
        {Array.isArray(tree) && tree.length > 0 ? <Tree nodes={tree} /> : <Empty text="زیرمجموعه‌ای برای نمایش وجود ندارد." />}
      </div>
      <div className="card overflow-auto">
        <table className="table">
          <thead><tr><th>نام</th><th>موبایل</th><th>نقش‌ها</th></tr></thead>
          <tbody>
            {(team ?? []).map((u: { id: number; name: string; mobile: string; roles?: string[] }) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.mobile}</td>
                <td>{(u.roles ?? []).join('، ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!team || team.length === 0) && <Empty text="هنوز عضوی در تیم شما ثبت نشده است." />}
      </div>
    </div>
  )
}

function Tree({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="pr-4 border-r border-[var(--line)]">
      {nodes.map((n) => (
        <li key={n.id} className="my-2">
          <span className="font-bold">{n.user?.name}</span> <Badge>{n.role?.name}</Badge>
          {n.children?.length > 0 && <Tree nodes={n.children} />}
        </li>
      ))}
    </ul>
  )
}

export function GatewaysPage() {
  const { data, isLoading } = useQuery({ queryKey: ['sales'], queryFn: async () => (await api.get('/gateway-sales')).data })
  const rows = data?.data ?? []

  return (
    <div>
      <PageHeader title="درگاه‌ها و فروش‌ها" subtitle="فروش‌های موفق درگاه که به نقش فعال شما ارتباط دارد." />
      <div className="card overflow-auto" data-testid="gateway-table">
        <table className="table">
          <thead>
            <tr>
              <th>نام درگاه</th>
              <th>مشتری</th>
              <th>مبلغ</th>
              <th>نمایندگان</th>
              <th>وضعیت</th>
              <th>تاریخ فروش</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: {
              id: number
              amount: string
              status: string
              sold_at: string
              gateway?: { name: string; external_id: string }
              customer?: { name: string }
              representatives?: Array<{ user?: { name: string }; share_percent: string }>
            }) => (
              <tr key={row.id}>
                <td>
                  <div className="font-semibold">{row.gateway?.name ?? 'درگاه'}</div>
                  <div className="text-xs text-[var(--muted)]">{row.gateway?.external_id}</div>
                </td>
                <td>{row.customer?.name ?? '—'}</td>
                <td>{money(row.amount)}</td>
                <td>{row.representatives?.map((r) => `${r.user?.name} (${percent(r.share_percent)})`).join('، ') || '—'}</td>
                <td><Badge tone="ok">{label(row.status)}</Badge></td>
                <td><DateTimeText value={row.sold_at} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && rows.length === 0 && <Empty text="فروش درگاهی برای این نقش ثبت نشده است." />}
      </div>
    </div>
  )
}

export function CommissionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['commissions'], queryFn: async () => (await api.get('/commissions')).data })
  const rows = data?.data ?? []

  return (
    <div>
      <PageHeader title="پورسانت نقش فعال" subtitle="فقط پورسانت همین سمت نمایش داده می‌شود و با کیف پول نقش‌های دیگر قاطی نیست." />
      <div className="card overflow-auto" data-testid="commission-table">
        <table className="table">
          <thead>
            <tr>
              <th>درگاه</th>
              <th>نقش</th>
              <th>درصد</th>
              <th>مبلغ پورسانت</th>
              <th>مبلغ مبنا</th>
              <th>وضعیت</th>
              <th>تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: {
              id: number
              commission_percent: string
              commission_amount: string
              base_amount: string
              status: string
              created_at: string
              role?: { name: string }
              sale?: { gateway?: { name: string } }
            }) => (
              <tr key={row.id}>
                <td>{row.sale?.gateway?.name ?? '—'}</td>
                <td>{row.role?.name}</td>
                <td data-percent={row.commission_percent}>{percent(row.commission_percent)} <span className="sr-only">{row.commission_percent}</span></td>
                <td>{money(row.commission_amount)}</td>
                <td>{money(row.base_amount)}</td>
                <td><Badge tone="ok">{label(row.status)}</Badge></td>
                <td><DateTimeText value={row.created_at} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && rows.length === 0 && <Empty text="پورسانتی برای نقش فعال ثبت نشده است." />}
      </div>
    </div>
  )
}

export function WalletPage() {
  const { data: wallets } = useQuery({ queryKey: ['wallets'], queryFn: async () => (await api.get('/wallets')).data })
  const { data: txs } = useQuery({ queryKey: ['wtx'], queryFn: async () => (await api.get('/wallet-transactions')).data })

  return (
    <div className="grid gap-4">
      <PageHeader title="کیف پول نقش" subtitle="مانده قابل برداشت برابر است با موجودی منهای مبلغ مسدودشده." />
      <div className="grid md:grid-cols-2 gap-3">
        {(wallets ?? []).map((w: { id: number; balance: string; held_balance: string; currency: string; role?: { name: string } }) => (
          <div className="card p-5" key={w.id} data-testid="role-wallet">
            <div className="text-sm text-[var(--muted)]">{w.role?.name}</div>
            <div className="text-2xl font-extrabold my-2">{money(w.balance)} <span className="text-sm font-medium">ریال</span></div>
            <div className="text-sm">مسدودشده: {money(w.held_balance)} · قابل برداشت: {money(Number(w.balance) - Number(w.held_balance))}</div>
          </div>
        ))}
      </div>
      <div className="card overflow-auto">
        <div className="px-4 pt-4 font-bold">دفتر تراکنش‌ها</div>
        <table className="table">
          <thead><tr><th>نوع</th><th>مبلغ</th><th>مانده بعد</th><th>تاریخ</th></tr></thead>
          <tbody>
            {(txs?.data ?? []).map((t: { id: number; type: string; amount: string; balance_after: string; created_at: string }) => (
              <tr key={t.id}>
                <td>{label(t.type)}</td>
                <td>{money(t.amount)}</td>
                <td>{money(t.balance_after)}</td>
                <td><DateTimeText value={t.created_at} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function FinancePage() {
  const { data } = useQuery({ queryKey: ['agg'], queryFn: async () => (await api.get('/wallets/aggregate')).data })

  return (
    <div>
      <PageHeader title="گزارش تجمیعی مالی" subtitle="این گزارش فقط نمایشی است و دفاتر نقش‌ها با هم ادغام حسابداری نمی‌شوند." />
      <div className="card p-5" data-testid="aggregate-finance">
        <p className="text-sm text-[var(--muted)] mb-4">{data?.note}</p>
        {(data?.by_role ?? []).map((w: { id: number; role?: { name: string }; balance: string; held_balance: string }) => (
          <div key={w.id} className="flex justify-between py-3 border-b border-[var(--line)]">
            <span>{w.role?.name}</span>
            <strong>{money(w.balance)} <span className="text-xs font-normal text-[var(--muted)]">مسدود {money(w.held_balance)}</span></strong>
          </div>
        ))}
        <div className="flex justify-between pt-4 font-extrabold">
          <span>جمع نمایشی</span>
          <span>{money(data?.total_balance)}</span>
        </div>
      </div>
    </div>
  )
}

export function WithdrawalsPage() {
  const qc = useQueryClient()
  const user = useAuth((s) => s.user)
  const canDecide = Boolean(user?.is_superuser || user?.active_role?.slug === 'senior_manager')
  const { data: wallets } = useQuery({ queryKey: ['wallets'], queryFn: async () => (await api.get('/wallets')).data })
  const { data } = useQuery({ queryKey: ['wd'], queryFn: async () => (await api.get('/withdrawals')).data })
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('1000')
  const mutate = useMutation({
    mutationFn: async () => {
      if (!wallets?.[0]?.id) throw new Error('کیف پول نقش فعال هنوز بارگذاری نشده است.')
      return api.post('/withdrawals', { wallet_id: wallets[0].id, amount, idempotency_key: `ui-${Date.now()}` })
    },
    onSuccess: () => { toast.success('درخواست برداشت ثبت شد'); setOpen(false); qc.invalidateQueries({ queryKey: ['wd'] }) },
    onError: () => toast.error('ثبت برداشت ناموفق بود. موجودی را بررسی کنید.'),
  })
  const decide = useMutation({
    mutationFn: async ({ id, decision }: { id: number; decision: string }) => api.post(`/withdrawals/${id}/decide`, { decision }),
    onSuccess: () => { toast.success('تصمیم ثبت شد'); qc.invalidateQueries({ queryKey: ['wd'] }) },
  })

  return (
    <div className="grid gap-4">
      <PageHeader title="برداشت از کیف پول" subtitle="تایید اول با مدیر ارشد است و تایید دوم با سوپریوزر سایت." action={<button className="btn btn-primary" data-testid="withdraw-open" onClick={() => setOpen(true)}>درخواست برداشت</button>} />
      <Modal open={open} title="ثبت درخواست برداشت" subtitle="مبلغ از کیف پول نقش فعال کسر و تا تایید دو مرحله‌ای مسدود می‌شود." onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <label className="field">مبلغ (ریال)
            <input className="input" data-testid="withdraw-amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <button className="btn btn-primary" data-testid="withdraw-submit" disabled={!wallets?.[0]?.id || mutate.isPending} onClick={() => mutate.mutate()}>ثبت درخواست</button>
        </div>
      </Modal>
      <div className="card overflow-auto">
        <table className="table">
          <thead><tr><th>درخواست‌کننده</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th><th>اقدام</th></tr></thead>
          <tbody>
            {(data?.data ?? []).map((row: { id: number; amount: string; status: string; requested_at: string; user?: { name: string } }) => (
              <tr key={row.id}>
                <td>{row.user?.name ?? 'شما'}</td>
                <td>{money(row.amount)}</td>
                <td>
                  <Badge tone={row.status === 'completed' ? 'ok' : row.status.includes('pending') ? 'warn' : 'muted'}>{label(row.status)}</Badge>
                  <span data-testid="withdraw-status" className="sr-only">{row.status}</span>
                </td>
                <td><DateTimeText value={row.requested_at} /></td>
                <td className="flex gap-2">
                  {canDecide && (row.status === 'senior_manager_pending' || row.status === 'superuser_pending') && (
                    <>
                      <button className="btn btn-ok" onClick={() => decide.mutate({ id: row.id, decision: 'approved' })}>تایید</button>
                      <button className="btn btn-danger" onClick={() => decide.mutate({ id: row.id, decision: 'rejected' })}>رد</button>
                    </>
                  )}
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
  const user = useAuth((s) => s.user)
  const { data: codes } = useQuery({ queryKey: ['codes'], queryFn: async () => (await api.get('/referrals/codes')).data })
  const { data: referrals } = useQuery({ queryKey: ['refs'], queryFn: async () => (await api.get('/referrals')).data })
  const { data: links } = useQuery({ queryKey: ['links'], queryFn: async () => (await api.get('/shared-links')).data })
  const { data: reps } = useQuery({ queryKey: ['reps'], queryFn: async () => (await api.get('/representatives')).data })
  const [openShare, setOpenShare] = useState(false)
  const [shareUser, setShareUser] = useState('')
  const [sharePercent, setSharePercent] = useState('50')
  const create = useMutation({
    mutationFn: async () => api.post('/shared-links', {
      type: 'gateway_sale',
      members: [
        { user_id: user?.id, share_percent: Number(sharePercent) },
        { user_id: Number(shareUser), share_percent: 100 - Number(sharePercent) },
      ],
    }),
    onSuccess: () => { toast.success('لینک اشتراکی ساخته شد و برای طرف مقابل ارسال گردید'); setOpenShare(false); qc.invalidateQueries({ queryKey: ['links'] }) },
    onError: () => toast.error('مجموع سهم‌ها باید دقیقاً ۱۰۰ درصد باشد.'),
  })
  const approve = useMutation({
    mutationFn: async (id: number) => api.post(`/shared-links/${id}/approve`),
    onSuccess: () => { toast.success('لینک تایید شد'); qc.invalidateQueries({ queryKey: ['links'] }) },
  })

  return (
    <div className="grid gap-4">
      <PageHeader title="معرف و لینک اشتراکی" subtitle="لینک ثبت‌نام نماینده جدید و لینک یک‌بارمصرف فروش اشتراکی درگاه." action={<button className="btn btn-primary" onClick={() => setOpenShare(true)}>لینک اشتراکی جدید</button>} />
      <div className="card p-5">
        <div className="font-bold mb-2">کد و لینک ثبت‌نام نماینده</div>
        {(codes ?? []).map((c: { id: number; code: string }) => (
          <div key={c.id} className="flex justify-between items-center py-2 border-b">
            <code data-testid="referral-code" className="font-bold">{c.code}</code>
            <span className="text-sm text-[var(--muted)]">/register?ref={c.code}</span>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <div className="font-bold mb-3">نمایندگان معرفی‌شده</div>
        {(referrals ?? []).length === 0 && <Empty text="هنوز نماینده‌ای با لینک شما ثبت نشده است." />}
        {(referrals ?? []).map((r: { id: number; referred?: { name: string; mobile: string } }) => (
          <div key={r.id} className="py-2 border-b">{r.referred?.name} · {r.referred?.mobile}</div>
        ))}
      </div>
      <Modal open={openShare} title="ایجاد لینک فروش اشتراکی" subtitle="لینک یک‌بارمصرف است و باید هر دو طرف تایید کنند." onClose={() => setOpenShare(false)}>
        <div className="grid gap-3">
          <label className="field">نماینده همکار
            <select className="input" value={shareUser} onChange={(e) => setShareUser(e.target.value)}>
              <option value="">انتخاب کنید</option>
              {(reps ?? []).filter((r: { id: number }) => r.id !== user?.id).map((r: { id: number; name: string }) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <label className="field">سهم شما (درصد)
            <input className="input" value={sharePercent} onChange={(e) => setSharePercent(e.target.value)} />
          </label>
          <button className="btn btn-primary" disabled={!shareUser} onClick={() => create.mutate()}>ایجاد و ارسال تاییدیه</button>
        </div>
      </Modal>
      <div className="card p-5" data-testid="shared-links">
        <div className="font-bold mb-3">لینک‌های اشتراکی</div>
        {(links ?? []).map((l: { id: number; token: string; status: string; members?: Array<{ user?: { name: string }; share_percent: string; approved: boolean }> }) => (
          <div key={l.id} className="py-3 border-b flex justify-between gap-3">
            <div>
              <div className="font-mono text-sm">{l.token}</div>
              <div className="text-sm text-[var(--muted)]">
                {l.members?.map((m) => `${m.user?.name} ${percent(m.share_percent)} ${m.approved ? 'تاییدشده' : 'منتظر تایید'}`).join(' · ')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={l.status === 'active' ? 'ok' : 'warn'}>{label(l.status)}</Badge>
              {l.status === 'pending' && <button className="btn btn-ok" onClick={() => approve.mutate(l.id)}>تایید سهم من</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PromotionsPage() {
  const qc = useQueryClient()
  const role = useAuth((s) => s.user?.active_role?.slug)
  const canDecide = role === 'senior_manager' || useAuth.getState().user?.is_superuser
  const target = role === 'sales_manager' ? 'development_manager' : 'sales_manager'
  const from = role === 'sales_manager' ? 'sales_manager' : 'representative'
  const { data: eligibility } = useQuery({ queryKey: ['elig', target], queryFn: async () => (await api.get(`/promotions/eligibility?target=${target}`)).data })
  const { data } = useQuery({ queryKey: ['promo'], queryFn: async () => (await api.get('/promotions')).data })
  const request = useMutation({
    mutationFn: async () => api.post('/promotions', { from_role: from, target_role: target }),
    onSuccess: () => { toast.success('درخواست برای مدیر ارشد ارسال شد'); qc.invalidateQueries({ queryKey: ['promo'] }) },
  })
  const decide = useMutation({
    mutationFn: async ({ id, decision }: { id: number; decision: string }) => api.post(`/promotions/${id}/decide`, { decision, note: 'بررسی شد' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo'] }),
  })

  return (
    <div className="grid gap-4">
      <PageHeader title="ارتقاء سازمانی" subtitle="ارتقاء نقش قبلی را حذف نمی‌کند؛ نقش جدید به حساب اضافه می‌شود." />
      <div className="card p-5" data-testid="promotion-criteria">
        <div className="font-bold mb-3">معیارهای ارتقاء به {target === 'sales_manager' ? 'مدیر فروش' : 'مدیر توسعه'}</div>
        {(eligibility ?? []).map((c: { code: string; actual: number; required: number; passed: boolean }) => (
          <div key={c.code} className="flex justify-between py-2 border-b">
            <span>{criterionLabel[c.code] ?? c.code}</span>
            <span>{c.actual} / {c.required} {c.passed ? <Badge tone="ok">قبول</Badge> : <Badge tone="warn">ناتمام</Badge>}</span>
          </div>
        ))}
        <button className="btn btn-primary mt-4" onClick={() => request.mutate()}>ارسال برای بررسی مدیر ارشد</button>
      </div>
      {(data ?? []).map((p: { id: number; status: string; user?: { name: string }; target_role?: { name: string } }) => (
        <div key={p.id} className="card p-4 flex justify-between items-center">
          <div>{p.user?.name} → {p.target_role?.name ?? 'نقش بالاتر'} · {label(p.status)}</div>
          {canDecide && p.status === 'pending' && (
            <div className="flex gap-2">
              <button className="btn btn-ok" onClick={() => decide.mutate({ id: p.id, decision: 'approved' })}>تایید ارتقاء</button>
              <button className="btn btn-danger" onClick={() => decide.mutate({ id: p.id, decision: 'rejected' })}>رد</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function TrainingPage() {
  const qc = useQueryClient()
  const [scores, setScores] = useState<Record<number, string>>({})
  const { data } = useQuery({ queryKey: ['courses'], queryFn: async () => (await api.get('/courses')).data })
  const submit = useMutation({
    mutationFn: async ({ course, level, score }: { course: number; level: number; score: number }) =>
      api.post(`/courses/${course}/levels/${level}/submit`, { score }),
    onSuccess: () => { toast.success('نتیجه سطح ثبت شد'); qc.invalidateQueries({ queryKey: ['courses'] }) },
  })

  return (
    <div className="grid gap-4" data-testid="training-list">
      <PageHeader title="آموزش و سطوح دوره" subtitle="هر دوره می‌تواند چند سطح پویا داشته باشد و مخصوص نقش‌های مشخص است." />
      {(data ?? []).map((c: {
        id: number
        title: string
        description?: string
        is_required_for_promotion: boolean
        roles?: Array<{ name: string }>
        levels: Array<{ id: number; title: string; passing_score: string; progress?: { status: string; score: string } | null }>
      }) => (
        <div key={c.id} className="card p-5">
          <div className="flex justify-between gap-3">
            <div>
              <div className="font-extrabold text-lg">{c.title}</div>
              <div className="text-sm text-[var(--muted)]">{c.description || 'بدون شرح'}</div>
              <div className="mt-2 flex gap-2 flex-wrap">
                {c.roles?.map((r) => <Badge key={r.name}>{r.name}</Badge>)}
                {c.is_required_for_promotion && <Badge tone="warn">الزامی برای ارتقاء</Badge>}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {c.levels.map((l, index) => (
              <div key={l.id} className="border border-[var(--line)] rounded-xl p-3 flex flex-wrap justify-between gap-3 items-center">
                <div>
                  <div className="font-bold">سطح {index + 1}: {l.title}</div>
                  <div className="text-sm text-[var(--muted)]">نمره قبولی {l.passing_score}</div>
                  {l.progress && <div className="text-sm mt-1">وضعیت: {l.progress.status === 'completed' ? 'قبول شده' : 'مردود'} · نمره {l.progress.score}</div>}
                </div>
                <div className="flex gap-2 items-center">
                  <input className="input w-24" placeholder="نمره" value={scores[l.id] ?? ''} onChange={(e) => setScores({ ...scores, [l.id]: e.target.value })} />
                  <button className="btn btn-primary" onClick={() => submit.mutate({ course: c.id, level: l.id, score: Number(scores[l.id] || 90) })}>ثبت آزمون</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationsPage() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['notif'], queryFn: async () => (await api.get('/notifications')).data })
  const read = useMutation({
    mutationFn: async (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif'] }),
  })
  const readAll = useMutation({
    mutationFn: async () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif'] }),
  })

  return (
    <div className="grid gap-3" data-testid="notifications">
      <PageHeader title="اعلان‌ها" action={<button className="btn btn-ghost" onClick={() => readAll.mutate()}>خواندن همه</button>} />
      {(data?.data ?? []).map((n: { id: number; title: string; body: string; read_at?: string; created_at: string }) => (
        <div key={n.id} className="card p-4 flex justify-between gap-3">
          <div>
            <div className="font-bold">{n.title}</div>
            <div className="text-sm">{n.body}</div>
            <div className="text-xs text-[var(--muted)] mt-1"><DateTimeText value={n.created_at} /></div>
          </div>
          {!n.read_at && <button className="btn btn-ghost" onClick={() => read.mutate(n.id)}>علامت خوانده‌شده</button>}
        </div>
      ))}
      {(!data?.data || data.data.length === 0) && <Empty text="اعلانی وجود ندارد." />}
    </div>
  )
}

export function TransfersPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ from_user_id: '', to_user_id: '', reason: 'انتقال به علت فوت یا قطع همکاری', type: 'all_future_benefits' })
  const { data: users } = useQuery({ queryKey: ['dir'], queryFn: async () => (await api.get('/users/directory')).data })
  const { data } = useQuery({ queryKey: ['bt'], queryFn: async () => (await api.get('/benefit-transfers')).data })

  return (
    <div className="grid gap-4">
      <PageHeader title="انتقال مالکیت مزایا" subtitle="شناسه حساب عددی است. تاریخچه مالی قبلی بازنویسی نمی‌شود." action={<button className="btn btn-primary" onClick={() => setOpen(true)}>انتقال جدید</button>} />
      <Modal open={open} title="ثبت انتقال مزایا" subtitle="مالکیت آینده نقش منتقل می‌شود؛ تاریخچه مالی قبلی دست‌نخورده می‌ماند." onClose={() => setOpen(false)}>
        <form className="grid gap-3" onSubmit={async (e) => {
          e.preventDefault()
          try {
            await api.post('/benefit-transfers', form)
            toast.success('انتقال ثبت شد')
            setOpen(false)
            qc.invalidateQueries({ queryKey: ['bt'] })
          } catch {
            toast.error('فقط مدیر ارشد یا سوپریوزر می‌تواند انتقال بدهد.')
          }
        }}>
          <label className="field">حساب مبدا
            <select className="input" value={form.from_user_id} onChange={(e) => setForm({ ...form, from_user_id: e.target.value })}>
              <option value="">انتخاب حساب</option>
              {(users ?? []).map((u: { id: number; name: string; mobile: string }) => <option key={u.id} value={u.id}>{u.name} · {u.mobile} · شناسه {u.id}</option>)}
            </select>
          </label>
          <label className="field">حساب مقصد
            <select className="input" value={form.to_user_id} onChange={(e) => setForm({ ...form, to_user_id: e.target.value })}>
              <option value="">انتخاب حساب</option>
              {(users ?? []).map((u: { id: number; name: string; mobile: string }) => <option key={u.id} value={u.id}>{u.name} · {u.mobile} · شناسه {u.id}</option>)}
            </select>
          </label>
          <label className="field">نوع انتقال
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="all_future_benefits">تمام مزایای آینده</option>
            </select>
          </label>
          <label className="field">علت
            <textarea className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </label>
          <button className="btn btn-primary" type="submit">ثبت انتقال موثر</button>
        </form>
      </Modal>
      <div className="card overflow-auto">
        <table className="table">
          <thead><tr><th>از</th><th>به</th><th>نوع</th><th>علت</th></tr></thead>
          <tbody>
            {(data ?? []).map((t: { id: number; transfer_type: string; reason?: string; from_user?: { name: string }; to_user?: { name: string } }) => (
              <tr key={t.id}>
                <td>{t.from_user?.name}</td>
                <td>{t.to_user?.name}</td>
                <td>{label(t.transfer_type)}</td>
                <td>{t.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
