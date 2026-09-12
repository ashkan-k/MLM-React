import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, CreditCard, ExternalLink, Network, Repeat, TrendingUp, Users, Wallet, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { MoneyInput } from '../components/MoneyInput'
import { OrgTree, type OrgNode } from '../components/OrgTree'
import { SearchSelect } from '../components/SearchSelect'
import { ApproveAction, BulkBar, BulkButton, CheckBox, IconAction, RowActions, exportSelected, useSelection } from '../components/table'
import { Badge, DateTimeText, Empty, Modal, PageHeader, ProgressBar, StatCard } from '../components/ui'
import { GatewayCreateForm } from '../components/GatewayCreateForm'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { confirmAction } from '../lib/confirm'
import { criterionLabel, label, localeTag, money, moneyHeader, percent } from '../lib/format'
import { useAuth } from '../stores/auth'

export function TeamPage() {
  const { t } = useApp()
  const { data: tree } = useQuery({ queryKey: ['tree'], queryFn: async () => (await api.get('/organization/tree')).data })
  const { data: team } = useQuery({ queryKey: ['team'], queryFn: async () => (await api.get('/organization/team')).data })
  const nodes = Array.isArray(tree) ? tree as OrgNode[] : []

  return (
    <div className="space-y-6">
      <OrgTree nodes={nodes} testId="org-tree" />
      <TeamTable team={team ?? []} t={t} />
    </div>
  )
}

function TeamTable({ team, t }: { team: Array<{ id: number; name: string; mobile: string; roles?: string[] }>; t: (key: string) => string }) {
  return (
    <div className="card overflow-auto">
      <div className="px-4 pt-4 font-semibold text-surface-800 dark:text-surface-200">{t('teamTitle')}</div>
      <table className="table">
        <thead><tr><th>{t('name')}</th><th>{t('mobile')}</th><th>{t('roles')}</th></tr></thead>
        <tbody>
          {team.map((u) => (
            <tr key={u.id}>
              <td>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white text-xs font-bold flex items-center justify-center">{u.name.charAt(0)}</div>
                  <span className="font-medium">{u.name}</span>
                </div>
              </td>
              <td>{u.mobile}</td>
              <td>{(u.roles ?? []).join('، ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {team.length === 0 && <Empty text={t('teamEmpty')} />}
    </div>
  )
}

function GatewayTable({ rows, isLoading }: { rows: Array<{
  id: number
  amount: string
  status: string
  sold_at: string
  gateway?: { name: string; external_id: string }
  customer?: { name: string }
  representatives?: Array<{ user?: { name: string }; share_percent: string }>
}>; isLoading: boolean }) {
  const { t } = useApp()
  return (
    <div className="card overflow-auto" data-testid="gateway-table">
      <table className="table">
        <thead>
          <tr>
            <th>{t('gateway')}</th>
            <th>{t('customer')}</th>
            <th>{moneyHeader()}</th>
            <th>{t('reps')}</th>
            <th>{t('status')}</th>
            <th>{t('soldAt')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <div className="font-semibold">{row.gateway?.name ?? t('gateway')}</div>
                <div className="text-xs text-surface-400">{row.gateway?.external_id}</div>
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
      {!isLoading && rows.length === 0 && <Empty text={t('gwEmpty')} />}
    </div>
  )
}

export function GatewaysPage() {
  const { t } = useApp()
  const { data, isLoading } = useQuery({ queryKey: ['sales'], queryFn: async () => (await api.get('/gateway-sales')).data })
  const [openCreate, setOpenCreate] = useState(false)
  const rows = data?.data ?? []
  const total = rows.reduce((sum: number, row: { amount: string }) => sum + Number(row.amount ?? 0), 0)

  return (
    <div className="space-y-4">
      <PageHeader title={t('gwTitle')} subtitle={t('gwSub')} action={<button className="btn btn-primary" onClick={() => setOpenCreate(true)}>{t('gwNew')}</button>} />
      <Modal wide open={openCreate} title={t('gwNew')} subtitle={t('gwSub')} onClose={() => setOpenCreate(false)}>
        <GatewayCreateForm onDone={() => setOpenCreate(false)} />
      </Modal>
      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard title={t('gwCount')} value={rows.length.toLocaleString(localeTag())} icon={CreditCard} color="from-blue-500 to-blue-600" />
        <StatCard title={moneyHeader(t('sumMoney'))} value={money(total)} icon={TrendingUp} color="from-emerald-500 to-emerald-600" />
      </div>
      <GatewayTable rows={rows} isLoading={isLoading} />
    </div>
  )
}

function CommissionTable({ rows, isLoading }: { rows: Array<{
  id: number
  commission_percent: string
  commission_amount: string
  base_amount: string
  status: string
  created_at: string
  role?: { name: string }
  sale?: { gateway?: { name: string } }
}>; isLoading: boolean }) {
  const { t } = useApp()
  return (
    <div className="card overflow-auto" data-testid="commission-table">
      <table className="table">
        <thead>
          <tr>
            <th>{t('gateway')}</th>
            <th>{t('role')}</th>
            <th>{t('percent')}</th>
            <th>{moneyHeader(t('commAmount'))}</th>
            <th>{moneyHeader(t('baseAmount'))}</th>
            <th>{t('status')}</th>
            <th>{t('date')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
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
      {!isLoading && rows.length === 0 && <Empty text={t('commEmpty')} />}
    </div>
  )
}

export function CommissionsPage() {
  const { t } = useApp()
  const { data, isLoading } = useQuery({ queryKey: ['commissions'], queryFn: async () => (await api.get('/commissions')).data })
  const rows = data?.data ?? []
  const total = rows.reduce((sum: number, row: { commission_amount: string }) => sum + Number(row.commission_amount ?? 0), 0)

  return (
    <div className="space-y-4">
      <PageHeader title={t('commTitle')} subtitle={t('commSub')} />
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard title={t('commCount')} value={rows.length.toLocaleString(localeTag())} icon={TrendingUp} color="from-blue-500 to-blue-600" />
        <StatCard title={moneyHeader(t('sumCommission'))} value={money(total)} icon={Wallet} color="from-emerald-500 to-emerald-600" />
        <StatCard title={moneyHeader(t('avgEach'))} value={money(rows.length ? total / rows.length : 0)} icon={Users} color="from-amber-500 to-amber-600" />
      </div>
      <CommissionTable rows={rows} isLoading={isLoading} />
    </div>
  )
}

export function WalletPage() {
  const { t } = useApp()
  const { data: wallets } = useQuery({ queryKey: ['wallets'], queryFn: async () => (await api.get('/wallets')).data })
  const { data: txs } = useQuery({ queryKey: ['wtx'], queryFn: async () => (await api.get('/wallet-transactions')).data })
  const txRows: Array<{ id: number; type: string; amount: string; balance_after: string; created_at: string }> = txs?.data ?? []

  return (
    <div className="space-y-4">
      <PageHeader title={t('walletTitle')} subtitle={t('walletSub')} />
      <div className="grid md:grid-cols-2 gap-4">
        {(wallets ?? []).map((w: { id: number; balance: string; held_balance: string; currency: string; role?: { name: string } }) => (
          <div className="card p-5 overflow-hidden" key={w.id} data-testid="role-wallet">
            <div className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 mb-4" />
            <div className="text-sm text-surface-500">{w.role?.name}</div>
            <div className="text-2xl font-extrabold my-2 text-surface-800 dark:text-surface-100">{money(w.balance)} <span className="text-sm font-medium">{t('toman')}</span></div>
            <div className="text-sm text-surface-600 dark:text-surface-400">{t('held')}: {money(w.held_balance)} {t('toman')} · {t('withdrawable')}: {money(Number(w.balance) - Number(w.held_balance))} {t('toman')}</div>
          </div>
        ))}
      </div>
      <div className="card overflow-auto">
        <div className="px-4 pt-4 font-semibold text-surface-800 dark:text-surface-200">{t('walletLedger')}</div>
        <table className="table">
          <thead><tr><th>{t('type')}</th><th>{moneyHeader()}</th><th>{moneyHeader(t('balanceAfter'))}</th><th>{t('date')}</th></tr></thead>
          <tbody>
            {txRows.map((row) => (
              <tr key={row.id}>
                <td>{label(row.type)}</td>
                <td>{money(row.amount)}</td>
                <td>{money(row.balance_after)}</td>
                <td><DateTimeText value={row.created_at} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function FinancePage() {
  const { t } = useApp()
  const { data } = useQuery({ queryKey: ['agg'], queryFn: async () => (await api.get('/wallets/aggregate')).data })

  return (
    <div className="space-y-4">
      <PageHeader title={t('financeTitle')} subtitle={t('financeSub')} />
      <div className="card p-5" data-testid="aggregate-finance">
        <p className="text-sm text-surface-500 mb-4">{data?.note}</p>
        {(data?.by_role ?? []).map((w: { id: number; role?: { name: string }; balance: string; held_balance: string }) => (
          <div key={w.id} className="flex justify-between py-3 border-b border-surface-100 dark:border-surface-700">
            <span>{w.role?.name}</span>
            <strong>{money(w.balance)} {t('toman')} <span className="text-xs font-normal text-surface-400">{t('held')} {money(w.held_balance)} {t('toman')}</span></strong>
          </div>
        ))}
        <div className="flex justify-between pt-4 font-extrabold text-surface-800 dark:text-surface-100">
          <span>{t('financeTotal')}</span>
          <span>{money(data?.total_balance)} {t('toman')}</span>
        </div>
      </div>
    </div>
  )
}

export function WithdrawalsPage() {
  const { t } = useApp()
  const qc = useQueryClient()
  const user = useAuth((s) => s.user)
  const isSuper = Boolean(user?.is_superuser)
  const isSenior = user?.active_role?.slug === 'senior_manager'
  const canDecide = Boolean(isSuper || isSenior)
  const { data: wallets } = useQuery({ queryKey: ['wallets'], queryFn: async () => (await api.get('/wallets')).data })
  const { data } = useQuery({ queryKey: ['wd'], queryFn: async () => (await api.get('/withdrawals')).data })
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('1000')
  const mutate = useMutation({
    mutationFn: async () => {
      const need = Number(amount)
      const funded = (wallets ?? []).find((w: { id: number; balance: string; held_balance?: string }) => Number(w.balance) - Number(w.held_balance ?? 0) >= need)
      const wallet = funded ?? wallets?.[0]
      if (!wallet?.id) throw new Error(t('withdrawCreateFail'))
      return api.post('/withdrawals', { wallet_id: wallet.id, amount, idempotency_key: `ui-${Date.now()}` })
    },
    onSuccess: () => { toast.success(t('withdrawOk')); setOpen(false); qc.invalidateQueries({ queryKey: ['wd'] }) },
    onError: () => toast.error(t('withdrawCreateFail')),
  })
  const decide = useMutation({
    mutationFn: async ({ id, decision }: { id: number; decision: string }) => api.post(`/withdrawals/${id}/decide`, { decision }),
    onSuccess: () => { toast.success(t('withdrawDecided')); qc.invalidateQueries({ queryKey: ['wd'] }) },
    onError: (error: { response?: { data?: { message?: string } } }) => toast.error(error.response?.data?.message ?? t('withdrawFail')),
  })
  const rows: Array<{ id: number; amount: string; status: string; requested_at: string; user?: { name: string } }> = data?.data ?? []
  const sel = useSelection(rows.map((r) => r.id))
  const canApprove = (status: string) => {
    if (isSuper) return ['senior_manager_pending', 'superuser_pending', 'rejected'].includes(status)
    if (isSenior) return ['senior_manager_pending', 'rejected'].includes(status)
    return false
  }
  const canReject = (status: string) => {
    if (isSuper) return ['senior_manager_pending', 'superuser_pending'].includes(status)
    if (isSenior) return status === 'senior_manager_pending'
    return false
  }
  const bulkDecide = async (decision: 'approved' | 'rejected') => {
    const eligible = rows.filter((r) => sel.selected.includes(r.id) && (decision === 'approved' ? canApprove(r.status) : canReject(r.status)))
    if (!eligible.length) {
      toast.error(t('withdrawNone'))
      return
    }
    for (const row of eligible) {
      await decide.mutateAsync({ id: row.id, decision })
    }
    sel.clear()
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('withdrawTitle')} subtitle={t('withdrawSub')} action={<button className="btn btn-primary" data-testid="withdraw-open" onClick={() => setOpen(true)}>{t('withdrawOpen')}</button>} />
      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard title={t('withdrawCount')} value={rows.length.toLocaleString(localeTag())} icon={Repeat} color="from-amber-500 to-amber-600" />
        <StatCard title={moneyHeader(t('sumAmount'))} value={money(rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0))} icon={Wallet} color="from-blue-500 to-blue-600" />
      </div>
      <Modal open={open} title={t('withdrawModal')} subtitle={t('withdrawModalSub')} onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <label className="field">{moneyHeader()}
            <MoneyInput testId="withdraw-amount" value={amount} onChange={setAmount} />
          </label>
          <button className="btn btn-primary" data-testid="withdraw-submit" disabled={!(wallets ?? []).length || mutate.isPending} onClick={() => mutate.mutate()}>{t('withdrawSubmit')}</button>
        </div>
      </Modal>
      <BulkBar count={sel.count}>
        <BulkButton tone="info" onClick={() => {
          const selected = rows.filter((r) => sel.selected.includes(r.id))
          exportSelected(t('navWithdrawals'), selected.map((r) => (
            t('name') === 'Name'
              ? { User: r.user?.name ?? t('you'), Amount: r.amount, Status: label(r.status) }
              : { کاربر: r.user?.name ?? t('you'), مبلغ: r.amount, وضعیت: label(r.status) }
          )))
        }}>{t('exportExcel')}</BulkButton>
        {canDecide && <BulkButton tone="ok" onClick={() => bulkDecide('approved')}>{t('withdrawBulkApprove')}</BulkButton>}
        {canDecide && <BulkButton tone="danger" onClick={() => bulkDecide('rejected')}>{t('withdrawBulkReject')}</BulkButton>}
      </BulkBar>
      <div className="card overflow-auto">
        <table className="table">
          <thead><tr><th><CheckBox checked={sel.allSelected} onChange={sel.toggleAll} label={t('selectAll')} /></th><th>{t('withdrawRequester')}</th><th>{moneyHeader()}</th><th>{t('status')}</th><th>{t('date')}</th><th className="text-center">{t('actions')}</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><CheckBox checked={sel.selected.includes(row.id)} onChange={() => sel.toggle(row.id)} label={`${t('selectAll')} ${row.id}`} /></td>
                <td>{row.user?.name ?? t('you')}</td>
                <td>{money(row.amount)}</td>
                <td>
                  <Badge tone={row.status === 'completed' ? 'ok' : row.status.includes('pending') ? 'warn' : 'muted'}>{label(row.status)}</Badge>
                  <span data-testid="withdraw-status" className="sr-only">{row.status}</span>
                </td>
                <td><DateTimeText value={row.requested_at} /></td>
                <td>
                  {canDecide && (canApprove(row.status) || canReject(row.status)) && (
                    <RowActions>
                      {canApprove(row.status) && (
                        <ApproveAction onClick={async () => { if (await confirmAction({ title: t('withdrawConfirm'), text: t('withdrawConfirmText'), danger: false, confirmText: t('confirmYes') })) decide.mutate({ id: row.id, decision: 'approved' }) }} />
                      )}
                      {canReject(row.status) && (
                        <IconAction label={t('reject')} tone="delete" icon={X} onClick={async () => { if (await confirmAction({ title: t('withdrawRejectTitle'), text: t('withdrawRejectText'), confirmText: t('rejectYes') })) decide.mutate({ id: row.id, decision: 'rejected' }) }} />
                      )}
                    </RowActions>
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

function CopyLink({ value, href }: { value: string; href?: string }) {
  const { t } = useApp()
  return (
    <div className="flex flex-wrap items-center gap-2">
      {href ? <a className="text-sm text-primary-600 break-all" href={href} target="_blank" rel="noreferrer">{href}</a> : <code className="text-sm">{value}</code>}
      <button type="button" className="btn btn-ghost text-xs px-2 py-1" onClick={async () => { await navigator.clipboard.writeText(href || value); toast.success(t('copied')) }}>
        <Copy className="w-3.5 h-3.5" /> {t('copy')}
      </button>
      {href && <a className="btn btn-ghost text-xs px-2 py-1" href={href} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /> {t('openLink')}</a>}
    </div>
  )
}

export function ReferralsPage() {
  const { t } = useApp()
  const qc = useQueryClient()
  const user = useAuth((s) => s.user)
  const { data: codes } = useQuery({ queryKey: ['codes'], queryFn: async () => (await api.get('/referrals/codes')).data })
  const { data: referrals } = useQuery({ queryKey: ['refs'], queryFn: async () => (await api.get('/referrals')).data })
  const { data: links } = useQuery({ queryKey: ['links'], queryFn: async () => (await api.get('/shared-links')).data })
  const { data: people } = useQuery({ queryKey: ['dir'], queryFn: async () => (await api.get('/users/directory')).data })
  const [openShare, setOpenShare] = useState(false)
  const [members, setMembers] = useState<Array<{ user_id: string; share_percent: string }>>([
    { user_id: String(user?.id ?? ''), share_percent: '50' },
    { user_id: '', share_percent: '50' },
  ])
  const create = useMutation({
    mutationFn: async () => api.post('/shared-links', {
      type: 'gateway_sale',
      members: members.filter((m) => m.user_id).map((m) => ({ user_id: Number(m.user_id), share_percent: Number(m.share_percent) })),
    }),
    onSuccess: () => { toast.success(t('shareSubmit')); setOpenShare(false); qc.invalidateQueries({ queryKey: ['links'] }) },
    onError: () => toast.error(t('shareSum')),
  })
  const approve = useMutation({
    mutationFn: async (id: number) => api.post(`/shared-links/${id}/approve`),
    onSuccess: () => { toast.success(t('approved')); qc.invalidateQueries({ queryKey: ['links'] }) },
  })

  return (
    <div className="space-y-4">
      <PageHeader title={t('refTitle')} subtitle={t('refSub')} action={<button className="btn btn-primary" onClick={() => setOpenShare(true)}>{t('refNew')}</button>} />
      <div className="grid sm:grid-cols-2 gap-4">
        <StatCard title={t('refCodes')} value={(codes ?? []).length.toLocaleString(localeTag())} icon={Users} color="from-blue-500 to-blue-600" />
        <StatCard title={t('refReferred')} value={(referrals ?? []).length.toLocaleString(localeTag())} icon={Network} color="from-emerald-500 to-emerald-600" />
      </div>
      <div className="card p-5">
        <div className="font-semibold mb-2 text-surface-800 dark:text-surface-200">{t('refCodeTitle')}</div>
        {(codes ?? []).map((c: { id: number; code: string }) => {
          const href = `${window.location.origin}/register?ref=${c.code}`
          return (
            <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-surface-100 dark:border-surface-700 last:border-0">
              <code data-testid="referral-code" className="font-bold text-primary-700 dark:text-primary-400">{c.code}</code>
              <CopyLink value={href} href={href} />
            </div>
          )
        })}
      </div>
      <div className="card p-5">
        <div className="font-semibold mb-3 text-surface-800 dark:text-surface-200">{t('refReferred')}</div>
        {(referrals ?? []).length === 0 && <Empty text={t('refEmpty')} />}
        {(referrals ?? []).map((r: { id: number; referred?: { name: string; mobile: string } }) => (
          <div key={r.id} className="flex items-center gap-3 py-2 border-b border-surface-100 dark:border-surface-700 last:border-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white text-xs font-bold flex items-center justify-center">{(r.referred?.name ?? '?').charAt(0)}</div>
            <div>{r.referred?.name} · {r.referred?.mobile}</div>
          </div>
        ))}
      </div>
      <Modal open={openShare} title={t('shareModal')} subtitle={t('shareModalSub')} onClose={() => setOpenShare(false)}>
        <div className="grid gap-3">
          <div className="font-semibold text-sm">{t('shareMembers')}</div>
          {members.map((member, index) => (
            <div key={index} className="grid sm:grid-cols-[1fr_120px_auto] gap-2 items-end">
              <label className="field">{t('sharePartner')}
                <SearchSelect
                  testId={index === 1 ? 'share-partner' : undefined}
                  value={member.user_id}
                  onChange={(user_id) => setMembers((prev) => prev.map((row, i) => i === index ? { ...row, user_id } : row))}
                  placeholder={t('choose')}
                  options={(people ?? []).map((r: { id: number; name: string; mobile?: string }) => ({ value: r.id, label: `${r.name}${r.mobile ? ` · ${r.mobile}` : ''}` }))}
                />
              </label>
              <label className="field">{t('percent')}
                <input className="input" value={member.share_percent} onChange={(e) => setMembers((prev) => prev.map((row, i) => i === index ? { ...row, share_percent: e.target.value } : row))} />
              </label>
              {members.length > 2 && (
                <button type="button" className="btn btn-ghost" onClick={() => setMembers((prev) => prev.filter((_, i) => i !== index))}>{t('delete')}</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-ghost" onClick={() => setMembers((prev) => [...prev, { user_id: '', share_percent: '0' }])}>{t('addMember')}</button>
          <div className="text-xs text-surface-500">{t('shareSum')} · {members.reduce((sum, m) => sum + Number(m.share_percent || 0), 0)}</div>
          <button className="btn btn-primary" disabled={members.filter((m) => m.user_id).length < 2} onClick={() => create.mutate()}>{t('shareSubmit')}</button>
        </div>
      </Modal>
      <div className="card p-5" data-testid="shared-links">
        <div className="font-semibold mb-3 text-surface-800 dark:text-surface-200">{t('shareLinks')}</div>
        {(links ?? []).map((l: { id: number; token: string; status: string; members?: Array<{ user?: { name: string }; share_percent: string; approved: boolean }> }) => (
          <div key={l.id} className="py-3 border-b border-surface-100 dark:border-surface-700 last:border-0 flex justify-between gap-3">
            <div>
              <CopyLink value={`${window.location.origin}/register?share=${l.token}`} href={`${window.location.origin}/register?share=${l.token}`} />
              <div className="font-mono text-xs text-surface-400 mt-1">{l.token}</div>
              <div className="text-sm text-surface-400">
                {l.members?.map((m) => `${m.user?.name} ${percent(m.share_percent)} ${m.approved ? t('approved') : t('awaiting')}`).join(' · ')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={l.status === 'active' ? 'ok' : 'warn'}>{label(l.status)}</Badge>
              {l.status === 'pending' && <button className="btn btn-ok" onClick={() => approve.mutate(l.id)}>{t('approveMyShare')}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PromotionList({
  items,
  canDecide,
  onDecide,
}: {
  items: Array<{ id: number; status: string; user?: { name: string }; target_role?: { name: string } }>
  canDecide: boolean
  onDecide: (id: number, decision: string) => void
}) {
  const { t } = useApp()
  const sel = useSelection(items.map((p) => p.id))
  return (
    <div className="space-y-3">
      <BulkBar count={sel.count}>
        {canDecide && <BulkButton tone="ok" onClick={() => { items.filter((p) => sel.selected.includes(p.id) && p.status === 'pending').forEach((p) => onDecide(p.id, 'approved')); sel.clear() }}>{t('withdrawBulkApprove')}</BulkButton>}
        {canDecide && <BulkButton tone="danger" onClick={() => { items.filter((p) => sel.selected.includes(p.id) && p.status === 'pending').forEach((p) => onDecide(p.id, 'rejected')); sel.clear() }}>{t('withdrawBulkReject')}</BulkButton>}
      </BulkBar>
      {items.map((p) => (
        <div key={p.id} className="card p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CheckBox checked={sel.selected.includes(p.id)} onChange={() => sel.toggle(p.id)} label={`${t('navPromotions')} ${p.id}`} />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white text-sm font-bold flex items-center justify-center">{(p.user?.name ?? '?').charAt(0)}</div>
            <div>{p.user?.name} → {p.target_role?.name ?? t('role')} · {label(p.status)}</div>
          </div>
          {canDecide && p.status === 'pending' && (
            <RowActions>
              <ApproveAction label={t('approve')} onClick={async () => { if (await confirmAction({ title: t('approve'), text: t('confirmYes'), danger: false, confirmText: t('confirmYes') })) onDecide(p.id, 'approved') }} />
              <IconAction label={t('reject')} tone="delete" icon={X} onClick={async () => { if (await confirmAction({ title: t('reject'), text: t('rejectYes'), confirmText: t('rejectYes') })) onDecide(p.id, 'rejected') }} />
            </RowActions>
          )}
        </div>
      ))}
    </div>
  )
}

export function PromotionsPage() {
  const { t } = useApp()
  const qc = useQueryClient()
  const role = useAuth((s) => s.user?.active_role?.slug)
  const canDecide = role === 'senior_manager' || useAuth.getState().user?.is_superuser
  const topRole = role === 'senior_manager' || role === 'superuser'
  const target = role === 'sales_manager' ? 'development_manager' : 'sales_manager'
  const from = role === 'sales_manager' ? 'sales_manager' : 'representative'
  const { data: eligibility } = useQuery({
    queryKey: ['elig', target],
    enabled: !topRole,
    queryFn: async () => (await api.get(`/promotions/eligibility?target=${target}`)).data,
  })
  const { data } = useQuery({ queryKey: ['promo'], queryFn: async () => (await api.get('/promotions')).data })
  const request = useMutation({
    mutationFn: async () => api.post('/promotions', { from_role: from, target_role: target }),
    onSuccess: () => { toast.success(t('promoManual')); qc.invalidateQueries({ queryKey: ['promo'] }) },
  })
  const decide = useMutation({
    mutationFn: async ({ id, decision }: { id: number; decision: string }) => api.post(`/promotions/${id}/decide`, { decision, note: t('details') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo'] }),
  })
  const targetName = target === 'sales_manager' ? t('promoToSales') : t('promoToDev')

  return (
    <div className="space-y-4">
      <PageHeader title={t('promoTitle')} subtitle={t('promoSub')} />
      <div className="card p-5" data-testid="promotion-criteria">
        <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">{t('promoAutoNote')}</p>
        {!topRole && (
          <>
            <div className="font-semibold mb-3 text-surface-800 dark:text-surface-200">{t('promoCriteria', { role: targetName })}</div>
            {(eligibility ?? []).map((c: { code: string; actual: number; required: number; passed: boolean }) => (
              <div key={c.code} className="py-3 border-b border-surface-100 dark:border-surface-700 last:border-0">
                <div className="flex justify-between mb-2">
                  <span>{criterionLabel[c.code] ?? c.code}</span>
                  <span>{c.actual} / {c.required} {c.passed ? <Badge tone="ok">{t('promoPass')}</Badge> : <Badge tone="warn">{t('promoFail')}</Badge>}</span>
                </div>
                <ProgressBar value={Number(c.actual)} max={Number(c.required) || 1} />
              </div>
            ))}
            <button className="btn btn-primary mt-4" onClick={() => request.mutate()}>{t('promoManual')}</button>
          </>
        )}
        {topRole && <div className="text-sm text-surface-500">{t('promoQueue')}</div>}
      </div>
      <PromotionList items={data ?? []} canDecide={Boolean(canDecide)} onDecide={(id, decision) => decide.mutate({ id, decision })} />
    </div>
  )
}

export function TrainingPage() {
  const { t } = useApp()
  const qc = useQueryClient()
  const role = useAuth((s) => s.user?.active_role?.slug)
  const canMonitor = ['senior_manager', 'sales_manager', 'development_manager'].includes(role ?? '') || useAuth.getState().user?.is_superuser
  const [scores, setScores] = useState<Record<number, string>>({})
  const { data } = useQuery({ queryKey: ['courses'], queryFn: async () => (await api.get('/courses')).data })
  const { data: teamProgress } = useQuery({
    queryKey: ['course-team'],
    enabled: canMonitor,
    queryFn: async () => (await api.get('/courses/team-progress')).data,
  })
  const submit = useMutation({
    mutationFn: async ({ course, level, score }: { course: number; level: number; score: number }) =>
      api.post(`/courses/${course}/levels/${level}/submit`, { score }),
    onSuccess: () => { toast.success(t('trainSubmit')); qc.invalidateQueries({ queryKey: ['courses'] }); qc.invalidateQueries({ queryKey: ['course-team'] }) },
  })

  return (
    <div className="space-y-4" data-testid="training-list">
      <PageHeader title={t('trainTitle')} subtitle={t('trainSub')} />
      <div className="card p-5">
        <div className="font-semibold mb-2">{t('trainHowTitle')}</div>
        <p className="text-sm text-surface-600 dark:text-surface-400 m-0 leading-7">{t('trainHowBody')}</p>
      </div>
      {(data ?? []).map((c: {
        id: number
        title: string
        description?: string
        is_required_for_promotion: boolean
        roles?: Array<{ name: string }>
        levels: Array<{ id: number; title: string; passing_score: string; progress?: { status: string; score: string } | null }>
      }) => {
        const done = c.levels.filter((l) => l.progress?.status === 'completed').length
        return (
          <div key={c.id} className="card p-5">
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-extrabold text-lg text-surface-800 dark:text-surface-100">{c.title}</div>
                <div className="text-sm text-surface-500">{c.description || t('noDesc')}</div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {c.roles?.map((r) => <Badge key={r.name}>{r.name}</Badge>)}
                  {c.is_required_for_promotion && <Badge tone="warn">{t('trainRequired')}</Badge>}
                </div>
              </div>
              <div className="text-sm text-surface-500 whitespace-nowrap">{done.toLocaleString(localeTag())} / {c.levels.length.toLocaleString(localeTag())} {t('trainLevel')}</div>
            </div>
            <div className="mt-3"><ProgressBar value={done} max={c.levels.length || 1} /></div>
            <div className="mt-4 grid gap-3">
              {c.levels.map((l, index) => (
                <div key={l.id} className="border border-surface-200 dark:border-surface-700 rounded-xl p-3 flex flex-wrap justify-between gap-3 items-center">
                  <div>
                    <div className="font-bold">{t('trainLevel')} {index + 1}: {l.title}</div>
                    <div className="text-sm text-surface-500">{t('trainPassScore')} {l.passing_score}</div>
                    {l.progress && <div className="text-sm mt-1">{t('status')}: {l.progress.status === 'completed' ? t('trainPassed') : t('trainFailed')} · {t('trainScore')} {l.progress.score}</div>}
                  </div>
                  <div className="flex gap-2 items-center">
                    <input className="input w-24" placeholder={t('trainScore')} value={scores[l.id] ?? ''} onChange={(e) => setScores({ ...scores, [l.id]: e.target.value })} />
                    <button className="btn btn-primary" onClick={() => submit.mutate({ course: c.id, level: l.id, score: Number(scores[l.id] || l.passing_score) })}>{t('trainTake')}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {canMonitor && (
        <div className="card overflow-auto" data-testid="training-monitor">
          <div className="px-4 pt-4 font-semibold">{t('trainMonitor')}</div>
          <table className="table">
            <thead><tr><th>{t('name')}</th><th>{t('mobile')}</th><th>{t('navCourses')}</th><th>{t('status')}</th></tr></thead>
            <tbody>
              {(teamProgress ?? []).map((u: { id: number; name: string; mobile: string; courses: Array<{ title: string; done: number; total: number; levels: Array<{ title: string; status?: string; score?: string }> }> }) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.mobile}</td>
                  <td>{u.courses.map((c) => `${c.title} ${c.done}/${c.total}`).join(' · ')}</td>
                  <td>{u.courses.flatMap((c) => c.levels.filter((l) => l.status).map((l) => `${l.title}: ${l.score ?? '—'}`)).join(' · ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function NotificationsPage() {
  const { t } = useApp()
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['notif'], queryFn: async () => (await api.get('/notifications')).data })
  const read = useMutation({
    mutationFn: async (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notif'] }); qc.invalidateQueries({ queryKey: ['notif-unread'] }) },
  })
  const readAll = useMutation({
    mutationFn: async () => api.post('/notifications/read-all'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notif'] }); qc.invalidateQueries({ queryKey: ['notif-unread'] }) },
  })
  const rows: Array<{ id: number; title: string; body: string; read_at?: string; created_at: string }> = data?.data ?? []
  const unread = rows.filter((n) => !n.read_at).length
  const nSel = useSelection(rows.map((n) => n.id))

  return (
    <div className="space-y-4" data-testid="notifications">
      <PageHeader title={t('notifications')} action={<button className="btn btn-ghost" onClick={() => readAll.mutate()}>{t('notifReadAll')}</button>} />
      <StatCard title={t('notifUnread')} value={unread.toLocaleString(localeTag())} icon={Users} color="from-amber-500 to-amber-600" />
      <BulkBar count={nSel.count}>
        <BulkButton tone="ok" onClick={async () => { for (const id of nSel.selected) await read.mutateAsync(id); nSel.clear() }}>{t('notifReadSelected')}</BulkButton>
      </BulkBar>
      <div className="card overflow-hidden">
        <div className="divide-y divide-surface-100 dark:divide-surface-700">
          {rows.map((n) => (
            <div key={n.id} className="p-4 flex justify-between gap-3 hover:bg-surface-50 dark:hover:bg-surface-700/30">
              <div className="flex items-start gap-3">
                <CheckBox checked={nSel.selected.includes(n.id)} onChange={() => nSel.toggle(n.id)} label={n.title} />
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.read_at ? 'bg-surface-300' : 'bg-primary-500'}`} />
                <div>
                  <div className="font-semibold text-surface-800 dark:text-surface-200">{n.title}</div>
                  <div className="text-sm text-surface-600 dark:text-surface-400">{n.body}</div>
                  <div className="text-xs text-surface-400 mt-1"><DateTimeText value={n.created_at} /></div>
                </div>
              </div>
              {!n.read_at && <ApproveAction label={t('notifReadSelected')} onClick={() => read.mutate(n.id)} />}
            </div>
          ))}
        </div>
        {rows.length === 0 && <Empty text={t('notifEmpty')} />}
      </div>
    </div>
  )
}

export function TransfersPage() {
  const { t } = useApp()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ from_user_id: '', to_user_id: '', reason: '', type: 'all_future_benefits' })
  const { data: users } = useQuery({ queryKey: ['dir'], queryFn: async () => (await api.get('/users/directory')).data })
  const { data } = useQuery({ queryKey: ['bt'], queryFn: async () => (await api.get('/benefit-transfers')).data })
  const transfers: Array<{ id: number; transfer_type: string; reason?: string; from_user?: { name: string }; to_user?: { name: string } }> = data ?? []
  const options = (users ?? []).map((u: { id: number; name: string; mobile: string }) => ({ value: u.id, label: `${u.name} · ${u.mobile} · ${t('id')} ${u.id}` }))

  return (
    <div className="space-y-4">
      <PageHeader title={t('transferTitle')} subtitle={t('transferSub')} action={<button className="btn btn-primary" onClick={() => { setForm({ from_user_id: '', to_user_id: '', reason: t('transferReasonDefault'), type: 'all_future_benefits' }); setOpen(true) }}>{t('transferNew')}</button>} />
      <Modal open={open} title={t('transferModal')} subtitle={t('transferModalSub')} onClose={() => setOpen(false)}>
        <form className="grid gap-3" onSubmit={async (e) => {
          e.preventDefault()
          try {
            await api.post('/benefit-transfers', form)
            toast.success(t('transferOk'))
            setOpen(false)
            qc.invalidateQueries({ queryKey: ['bt'] })
          } catch {
            toast.error(t('transferFail'))
          }
        }}>
          <label className="field">{t('accountFrom')}
            <SearchSelect testId="transfer-from" value={form.from_user_id} onChange={(from_user_id) => setForm({ ...form, from_user_id })} placeholder={t('chooseAccount')} options={options} required />
          </label>
          <label className="field">{t('accountTo')}
            <SearchSelect testId="transfer-to" value={form.to_user_id} onChange={(to_user_id) => setForm({ ...form, to_user_id })} placeholder={t('chooseAccount')} options={options} required />
          </label>
          <label className="field">{t('transferType')}
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="all_future_benefits">{t('transferAll')}</option>
            </select>
          </label>
          <label className="field">{t('reason')}
            <textarea className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </label>
          <button className="btn btn-primary" type="submit">{t('transferSubmit')}</button>
        </form>
      </Modal>
      <div className="card overflow-auto">
        <table className="table">
          <thead><tr><th>{t('from')}</th><th>{t('to')}</th><th>{t('type')}</th><th>{t('reason')}</th></tr></thead>
          <tbody>
            {transfers.map((row) => (
              <tr key={row.id}>
                <td>{row.from_user?.name}</td>
                <td>{row.to_user?.name}</td>
                <td>{label(row.transfer_type)}</td>
                <td>{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
