import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Copy, CreditCard, ExternalLink, Network, Repeat, TrendingUp, Users, Wallet, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { MoneyInput } from '../components/MoneyInput'
import { OrgTree, type OrgNode } from '../components/OrgTree'
import { SearchSelect } from '../components/SearchSelect'
import { ApproveAction, BlockAction, BulkBar, BulkButton, CheckBox, IconAction, RowActions, TablePager, UnblockAction, ViewAction, exportSelected, useSelection } from '../components/table'
import { Badge, DateTimeText, Empty, Modal, MonthText, PageHeader, ProgressBar, ScorePair, StatCard } from '../components/ui'
import { GatewayCreateForm } from '../components/GatewayCreateForm'
import { ManagerReassignCard } from '../components/ManagerReassignCard'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { confirmAction, promptAction } from '../lib/confirm'
import { notificationBody, notificationHref, notificationTitle, type AppNotification } from '../lib/notify'
import { criterionLabel, label, localeTag, money, moneyHeader, percent } from '../lib/format'
import { useAuth } from '../stores/auth'

export function TeamPage() {
  const { t } = useApp()
  const qc = useQueryClient()
  const me = useAuth((s) => s.user)
  const canBlock = me?.is_superuser || me?.active_role?.slug === 'senior_manager'
  const canManageOrg = me?.active_role?.slug === 'senior_manager'
  const { data: tree } = useQuery({ queryKey: ['tree'], queryFn: async () => (await api.get('/organization/tree')).data })
  const { data: team } = useQuery({ queryKey: ['team'], queryFn: async () => (await api.get('/organization/team')).data })
  const nodes = Array.isArray(tree) ? tree as OrgNode[] : []

  const toggleBlock = async (user: { id: number; name: string; is_active?: boolean }) => {
    if (user.id === me?.id) {
      toast.error(t('blockFail'))
      return
    }
    if (user.is_active !== false) {
      if (!await confirmAction({ title: t('blockUser'), text: t('blockConfirm'), confirmText: t('blockUser') })) return
      try {
        await api.post(`/users/${user.id}/block`)
        toast.success(t('blockOk'))
      } catch {
        toast.error(t('blockFail'))
        return
      }
    } else {
      if (!await confirmAction({ title: t('unblockUser'), text: t('unblockConfirm'), confirmText: t('unblockUser'), danger: false })) return
      try {
        await api.post(`/users/${user.id}/unblock`)
        toast.success(t('unblockOk'))
      } catch {
        toast.error(t('blockFail'))
        return
      }
    }
    qc.invalidateQueries({ queryKey: ['team'] })
    qc.invalidateQueries({ queryKey: ['tree'] })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('navTeam')}
        subtitle={t('orgSubtitle')}
        action={canManageOrg ? <Link className="btn btn-primary" to="../org-managers">{t('navOrgManagers')}</Link> : undefined}
      />
      <OrgTree nodes={nodes} testId="org-tree" />
      <TeamTable team={team ?? []} t={t} canBlock={Boolean(canBlock)} onToggleBlock={toggleBlock} />
    </div>
  )
}

export function OrgManagersPage() {
  const { t } = useApp()
  const me = useAuth((s) => s.user)
  if (me?.active_role?.slug !== 'senior_manager' && !me?.is_superuser) {
    return <Navigate to=".." relative="path" replace />
  }
  return (
    <div className="space-y-6">
      <PageHeader title={t('navOrgManagers')} subtitle={t('orgManagersSub')} />
      <ManagerReassignCard />
    </div>
  )
}

function TeamTable({
  team,
  t,
  canBlock,
  onToggleBlock,
}: {
  team: Array<{ id: number; name: string; mobile: string; is_active?: boolean; roles?: string[] }>
  t: (key: string) => string
  canBlock: boolean
  onToggleBlock: (user: { id: number; name: string; is_active?: boolean }) => void
}) {
  return (
    <div className="card overflow-auto">
      <div className="px-4 pt-4 font-semibold text-surface-800 dark:text-surface-200">{t('teamTitle')}</div>
      <table className="table">
        <thead>
          <tr>
            <th>{t('name')}</th>
            <th>{t('mobile')}</th>
            <th>{t('roles')}</th>
            <th>{t('status')}</th>
            {canBlock && <th className="text-center">{t('actions')}</th>}
          </tr>
        </thead>
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
              <td><Badge tone={u.is_active === false ? 'danger' : 'ok'}>{u.is_active === false ? t('blocked') : t('adminActive')}</Badge></td>
              {canBlock && (
                <td>
                  <RowActions>
                    {u.is_active === false
                      ? <UnblockAction label={t('unblockUser')} onClick={() => onToggleBlock(u)} />
                      : <BlockAction label={t('blockUser')} onClick={() => onToggleBlock(u)} />}
                  </RowActions>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {team.length === 0 && <Empty text={t('teamEmpty')} />}
    </div>
  )
}

function gatewayTone(status: string): 'ok' | 'warn' | 'info' | 'muted' | 'danger' {
  if (status === 'successful') return 'ok'
  if (status === 'pending_inspection' || status === 'pending_shaparak') return 'warn'
  if (status === 'rejected') return 'danger'
  return 'muted'
}

function isAwaitingInspect(status: string) {
  return status === 'pending_inspection' || status === 'pending_shaparak'
}

type GatewaySaleRow = {
  id: number
  amount: string
  my_commission_total?: string
  status: string
  sold_at: string
  shaparak_reference?: string | null
  rejection_note?: string | null
  gateway?: {
    id?: number
    name: string
    external_id: string
    merchant_code?: string | null
    transactions?: Array<{ id: number; amount: string; profit: string; status: string; authority?: string | null; paid_at?: string | null }>
  }
  customer?: {
    name: string
    mobile?: string
    national_id?: string
    sheba?: string
    email?: string
    father_name?: string
    birth_date?: string
    birth_certificate_no?: string
    birth_place?: string
    gender?: string
    person_type?: string
    province?: string
    city?: string
    address?: string
    postal_code?: string
    bank_name?: string
    account_number?: string
    account_holder?: string
    shop_name?: string
    shop_category?: string
    website?: string
    company_name?: string
    document_urls?: Record<string, string | null>
  }
  representatives?: Array<{ user_id?: number; user?: { id?: number; name: string }; share_percent: string }>
  managers?: Array<{ user_id?: number; user?: { id?: number; name: string }; role?: { name: string; slug: string }; commission_percent?: string }>
  reviews?: Array<{ id: number; stage: string; decision: string; note?: string | null; reference?: string | null; created_at: string; actor?: { name: string } | null }>
  commissions?: Array<{ id: number; commission_percent: string; commission_amount: string; role?: { name: string } }>
}

function GatewayTable({
  rows,
  isLoading,
  canInspect,
  onOpen,
  onInspect,
  footer,
}: {
  rows: GatewaySaleRow[]
  isLoading: boolean
  canInspect: boolean
  onOpen: (row: GatewaySaleRow) => void
  onInspect: (row: GatewaySaleRow, decision: 'approved' | 'rejected') => void
  footer?: ReactNode
}) {
  const { t } = useApp()
  return (
    <div className="card overflow-hidden" data-testid="gateway-table">
      <div className="overflow-auto">
      <table className="table">
        <thead>
          <tr>
            <th>{t('gateway')}</th>
            <th>{t('customer')}</th>
            <th>{t('reps')}</th>
            <th>{moneyHeader(t('gwMyProfit'))}</th>
            <th>{t('status')}</th>
            <th>{t('soldAt')}</th>
            <th>{t('details')}</th>
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
              <td>{row.representatives?.map((r) => `${r.user?.name} (${percent(r.share_percent)})`).join('، ') || '—'}</td>
              <td className="font-semibold text-emerald-700 dark:text-emerald-400">{money(row.my_commission_total ?? 0)}</td>
              <td><Badge tone={gatewayTone(row.status)}>{label(row.status)}</Badge></td>
              <td><DateTimeText value={row.sold_at} /></td>
              <td>
                <RowActions>
                  <ViewAction onClick={() => onOpen(row)} label={t('gwReview')} />
                  {canInspect && isAwaitingInspect(row.status) && (
                    <>
                      <ApproveAction label={t('gwInspect')} onClick={() => onInspect(row, 'approved')} />
                      <IconAction label={t('gwRejectInspect')} tone="delete" icon={X} onClick={() => onInspect(row, 'rejected')} />
                    </>
                  )}
                </RowActions>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {!isLoading && rows.length === 0 && <Empty text={t('gwEmpty')} />}
      {footer}
    </div>
  )
}

function reviewTone(stage: string, decision: string): 'ok' | 'warn' | 'info' | 'muted' | 'danger' {
  if (decision === 'rejected' || stage === 'rejected') return 'danger'
  if (stage === 'commission_posted' || stage === 'shaparak_confirmed' || decision === 'approved') return 'ok'
  if (stage === 'inspected') return 'warn'
  return 'info'
}

function KycItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/40 p-3">
      <div className="text-xs text-surface-500 mb-1">{label}</div>
      <div className="font-medium text-surface-800 dark:text-surface-100 break-all">{value}</div>
    </div>
  )
}

function GatewayReviewModal({
  sale,
  onClose,
  canInspect,
  canEditParties,
  onInspect,
  onUpdated,
}: {
  sale: GatewaySaleRow
  onClose: () => void
  canInspect: boolean
  canEditParties: boolean
  onInspect: (row: GatewaySaleRow, decision: 'approved' | 'rejected') => void
  onUpdated: (row: GatewaySaleRow) => void
}) {
  const { t } = useApp()
  const { data: directory = [] } = useQuery({
    queryKey: ['directory'],
    queryFn: async () => (await api.get('/users/directory')).data as Array<{
      id: number
      name: string
      mobile: string
      roles: Array<{ slug: string; name: string }>
    }>,
    enabled: canEditParties,
  })
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reps, setReps] = useState<Array<{ user_id: string; share_percent: string }>>(
    () => (sale.representatives ?? []).map((r) => ({
      user_id: String(r.user_id ?? r.user?.id ?? ''),
      share_percent: String(r.share_percent ?? '100'),
    })),
  )
  const [managers, setManagers] = useState(() => {
    const bySlug: Record<string, string> = {}
    for (const m of sale.managers ?? []) {
      if (m.role?.slug) bySlug[m.role.slug] = String(m.user_id ?? m.user?.id ?? '')
    }
    return {
      sales_manager: bySlug.sales_manager ?? '',
      development_manager: bySlug.development_manager ?? '',
      senior_manager: bySlug.senior_manager ?? '',
    }
  })

  const repOptions = directory.filter((u) => u.roles.some((r) => r.slug === 'representative'))
  const optionsFor = (slug: string) => directory.filter((u) => u.roles.some((r) => r.slug === slug))

  const c = sale.customer
  const docLabels: Record<string, string> = {
    national_id_front: t('docNationalIdFront'),
    national_id_back: t('docNationalIdBack'),
    birth_certificate: t('docBirthCertificate'),
    selfie: t('docSelfie'),
    gazette: t('docGazette'),
    license: t('docLicense'),
  }
  const docs = Object.entries(c?.document_urls ?? {}).filter(([, url]) => url)
  const gender = c?.gender === 'male' ? t('kycMale') : c?.gender === 'female' ? t('kycFemale') : c?.gender
  const personType = c?.person_type === 'legal' ? t('kycLegal') : c?.person_type === 'individual' ? t('kycIndividual') : c?.person_type
  const reviews = sale.reviews ?? []

  const saveParties = async () => {
    const shareSum = reps.reduce((sum, row) => sum + Number(row.share_percent || 0), 0)
    if (reps.length === 0 || Math.abs(shareSum - 100) > 0.01) {
      toast.error(t('gwPartiesShareError'))
      return
    }
    if (reps.some((row) => !row.user_id)) {
      toast.error(t('gwPartiesRepRequired'))
      return
    }
    setBusy(true)
    try {
      const managersPayload = (['sales_manager', 'development_manager', 'senior_manager'] as const)
        .filter((slug) => managers[slug])
        .map((slug) => ({ user_id: Number(managers[slug]), role_slug: slug }))
      const { data } = await api.post(`/gateway-sales/${sale.id}/parties`, {
        representatives: reps.map((row) => ({
          user_id: Number(row.user_id),
          share_percent: Number(row.share_percent),
        })),
        managers: managersPayload,
      })
      toast.success(t('gwPartiesOk'))
      setEditing(false)
      onUpdated(data as GatewaySaleRow)
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(message || t('gwPartiesFail'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal wide open title={sale.gateway?.name ?? t('gateway')} subtitle={t('gwReview')} onClose={onClose}>
      <div className="space-y-5" data-testid="gateway-review">
        <div className="flex flex-wrap gap-2 items-center">
          <Badge tone={gatewayTone(sale.status)}>{label(sale.status)}</Badge>
          {sale.gateway?.merchant_code && <Badge tone="info">{t('gwMerchantCode')}: {sale.gateway.merchant_code}</Badge>}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <KycItem label={t('kycCustomer')} value={c?.name} />
          <KycItem label={t('kycPersonType')} value={personType} />
          <KycItem label={t('kycNationalId')} value={c?.national_id} />
          <KycItem label={t('kycMobile')} value={c?.mobile} />
          <KycItem label={t('kycEmail')} value={c?.email} />
          <KycItem label={t('kycFather')} value={c?.father_name} />
          <KycItem label={t('kycBirthDate')} value={c?.birth_date} />
          <KycItem label={t('kycBirthCert')} value={c?.birth_certificate_no} />
          <KycItem label={t('kycBirthPlace')} value={c?.birth_place} />
          <KycItem label={t('kycGender')} value={gender} />
          <KycItem label={t('kycProvince')} value={c?.province} />
          <KycItem label={t('kycCity')} value={c?.city} />
          <KycItem label={t('kycAddress')} value={c?.address} />
          <KycItem label={t('kycPostal')} value={c?.postal_code} />
          <KycItem label={t('kycShop')} value={c?.shop_name} />
          <KycItem label={t('kycCategory')} value={c?.shop_category} />
          <KycItem label={t('kycWebsite')} value={c?.website} />
          <KycItem label={t('kycCompany')} value={c?.company_name} />
          <KycItem label={t('kycSheba')} value={c?.sheba} />
          <KycItem label={t('kycBank')} value={c?.bank_name} />
          <KycItem label={t('kycAccount')} value={c?.account_number} />
          <KycItem label={t('kycHolder')} value={c?.account_holder} />
        </div>
        {docs.length > 0 && (
          <div>
            <div className="font-semibold mb-2">{t('gwDocs')}</div>
            <div className="grid sm:grid-cols-3 gap-3">
              {docs.map(([key, url]) => {
                const caption = docLabels[key] ?? key
                return (
                  <a key={key} href={url ?? '#'} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/40">
                    <div className="px-3 py-2 text-sm font-semibold text-surface-800 dark:text-surface-100 border-b border-surface-200 dark:border-surface-700">{caption}</div>
                    <img src={url ?? ''} alt={caption} className="w-full h-36 object-cover bg-surface-100 dark:bg-surface-800" />
                  </a>
                )
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-4 space-y-3" data-testid="gateway-parties">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">{t('gwPartiesTitle')}</div>
            {canEditParties && !editing && (
              <button type="button" className="btn btn-ghost text-sm" onClick={() => setEditing(true)}>{t('gwPartiesEdit')}</button>
            )}
          </div>
          {!editing ? (
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-surface-500 mb-1">{t('reps')}</div>
                <div>{sale.representatives?.map((r) => `${r.user?.name} (${percent(r.share_percent)})`).join('، ') || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-surface-500 mb-1">{t('gwManagers')}</div>
                <div>{sale.managers?.map((m) => `${m.role?.name ?? '—'}: ${m.user?.name ?? '—'}`).join('، ') || '—'}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">{t('reps')}</div>
                {reps.map((row, index) => (
                  <div key={index} className="grid sm:grid-cols-[1fr_120px_auto] gap-2">
                    <SearchSelect
                      value={row.user_id}
                      onChange={(value) => setReps((prev) => prev.map((item, i) => i === index ? { ...item, user_id: value } : item))}
                      options={repOptions.map((u) => ({ value: u.id, label: `${u.name} — ${u.mobile}` }))}
                      placeholder={t('searchPlaceholder')}
                    />
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={100}
                      step="0.001"
                      value={row.share_percent}
                      onChange={(e) => setReps((prev) => prev.map((item, i) => i === index ? { ...item, share_percent: e.target.value } : item))}
                    />
                    <button type="button" className="btn btn-ghost" onClick={() => setReps((prev) => prev.filter((_, i) => i !== index))}>{t('cancel')}</button>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost text-sm" onClick={() => setReps((prev) => [...prev, { user_id: '', share_percent: '0' }])}>+ {t('reps')}</button>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {([
                  ['sales_manager', t('role_sales_manager')],
                  ['development_manager', t('role_development_manager')],
                  ['senior_manager', t('role_senior_manager')],
                ] as const).map(([slug, title]) => (
                  <label key={slug} className="field">{title}
                    <SearchSelect
                      value={managers[slug]}
                      onChange={(value) => setManagers((prev) => ({ ...prev, [slug]: value }))}
                      options={optionsFor(slug).map((u) => ({ value: u.id, label: `${u.name} — ${u.mobile}` }))}
                      placeholder={t('searchPlaceholder')}
                    />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" disabled={busy} onClick={saveParties}>{t('save')}</button>
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setEditing(false)}>{t('cancel')}</button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="font-semibold mb-3">{t('gwReview')}</div>
          <ol className="space-y-0">
            {reviews.map((review, index) => (
              <li key={review.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`w-8 h-8 shrink-0 rounded-full text-xs font-bold flex items-center justify-center ${
                    review.decision === 'rejected' || review.stage === 'rejected'
                      ? 'bg-red-500 text-white'
                      : review.decision === 'approved' || review.stage === 'commission_posted' || review.stage === 'shaparak_confirmed'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-sky-500 text-white'
                  }`}>{index + 1}</span>
                  {index < reviews.length - 1 && <span className="w-px flex-1 min-h-[1.25rem] bg-surface-200 dark:bg-surface-700 my-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={reviewTone(review.stage, review.decision)}>{label(review.stage)}</Badge>
                      <Badge tone={review.decision === 'rejected' ? 'danger' : review.decision === 'approved' ? 'ok' : 'info'}>{label(review.decision)}</Badge>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 text-sm text-surface-500">
                      <span>{t('gwPostedBy')}: {review.actor?.name ?? t('gwSystemActor')}</span>
                      <DateTimeText value={review.created_at} />
                    </div>
                    {review.note && (
                      <div className={`rounded-lg px-3 py-2 text-sm ${
                        review.decision === 'rejected' || review.stage === 'rejected'
                          ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                          : 'bg-surface-50 dark:bg-surface-800/60 text-surface-700 dark:text-surface-200'
                      }`}>
                        <div className="text-xs font-semibold mb-1 opacity-80">
                          {review.decision === 'rejected' || review.stage === 'rejected' ? t('gwRejectReason') : t('gwReviewNote')}
                        </div>
                        <div className="leading-relaxed whitespace-pre-wrap">{review.note}</div>
                      </div>
                    )}
                    {review.reference && <div className="text-xs text-surface-400">{t('gwMerchantCode')}: {review.reference}</div>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
        {(sale.commissions?.length ?? 0) > 0 ? (
          <div>
            <div className="font-semibold mb-2">{t('gwCommissionsPosted')}</div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {(sale.commissions ?? []).map((row) => (
                <div key={row.id} className="rounded-xl border border-surface-200 dark:border-surface-700 p-3 flex justify-between gap-2">
                  <span>{row.role?.name}</span>
                  <span>{percent(row.commission_percent)} — {money(row.commission_amount)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-700 dark:text-amber-400 m-0">{t('gwNoCommissionYet')}</p>
        )}
        {(sale.gateway?.transactions?.length ?? 0) > 0 && (
          <div>
            <div className="font-semibold mb-2">{t('gwTransactions')}</div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {(sale.gateway?.transactions ?? []).map((row) => (
                <div key={row.id} className="rounded-xl border border-surface-200 dark:border-surface-700 p-3 space-y-1">
                  <div className="flex justify-between gap-2">
                    <span>{label(row.status)}</span>
                    <span>{money(row.profit)}</span>
                  </div>
                  <div className="text-xs text-surface-400">{t('gwTxAmount')}: {money(row.amount)}</div>
                  {row.authority && <div className="text-xs text-surface-400">{row.authority}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        {sale.rejection_note && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">!</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-red-800 dark:text-red-200">{t('gwRejectedBanner')}</div>
              <div className="text-xs font-medium text-red-700/80 dark:text-red-300/80 mt-0.5 mb-1">{t('gwRejectReason')}</div>
              <div className="text-sm text-red-800 dark:text-red-200 leading-relaxed whitespace-pre-wrap">{sale.rejection_note}</div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {canInspect && isAwaitingInspect(sale.status) && (
            <>
              <button type="button" className="btn btn-primary" onClick={() => onInspect(sale, 'approved')}>{t('gwInspect')}</button>
              <button type="button" className="btn btn-danger" onClick={() => onInspect(sale, 'rejected')}>{t('gwRejectInspect')}</button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

export function GatewaysPage() {
  const { t } = useApp()
  const qc = useQueryClient()
  const me = useAuth((s) => s.user)
  const [searchParams, setSearchParams] = useSearchParams()
  const sharedToken = (searchParams.get('shared') ?? '').trim()
  const roleSlug = me?.active_role?.slug
  const gatewayShareEnabled = me?.features?.shared_links?.gateway_sale_enabled !== false
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['sales', roleSlug, page],
    queryFn: async () => (await api.get('/gateway-sales', { params: { page, per_page: 20 } })).data,
  })
  const [openCreate, setOpenCreate] = useState(false)
  const [openSale, setOpenSale] = useState<GatewaySaleRow | null>(null)

  useEffect(() => {
    if (sharedToken && gatewayShareEnabled) setOpenCreate(true)
  }, [sharedToken, gatewayShareEnabled])

  const closeCreate = () => {
    setOpenCreate(false)
    if (sharedToken) {
      const next = new URLSearchParams(searchParams)
      next.delete('shared')
      setSearchParams(next, { replace: true })
    }
  }

  const rows: GatewaySaleRow[] = data?.data ?? []
  const successCount = rows.filter((r) => r.status === 'successful').length
  const myProfitTotal = rows.reduce((sum, row) => sum + Number(row.my_commission_total ?? 0), 0)
  const inspectCount = rows.filter((r) => isAwaitingInspect(r.status)).length
  const canInspect = Boolean(me?.is_superuser || me?.active_role?.slug === 'senior_manager')
  const canEditParties = canInspect
  const orgManagersHref = me?.is_superuser
    ? '/superuser/org-managers'
    : me?.active_role?.slug === 'senior_manager'
      ? '../org-managers'
      : null

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['sales'] })
    qc.invalidateQueries({ queryKey: ['commissions'] })
    qc.invalidateQueries({ queryKey: ['wallets'] })
    qc.invalidateQueries({ queryKey: ['notifications'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const inspect = async (row: GatewaySaleRow, decision: 'approved' | 'rejected') => {
    let note = ''
    let merchantCode: string | undefined
    if (decision === 'rejected') {
      const typed = await promptAction({ title: t('gwRejectInspect'), text: t('promoRejectText'), confirmText: t('rejectYes'), placeholder: t('promoRejectReason') })
      if (!typed) return
      note = typed
    } else {
      if (!await confirmAction({ title: t('gwInspect'), text: t('gwInspectConfirm'), danger: false, confirmText: t('confirmYes') })) return
      const typed = await promptAction({
        title: t('gwMerchantCode'),
        text: t('gwMerchantCodeHint'),
        confirmText: t('confirmYes'),
        placeholder: 'fino-xxxx-xxxx-xxxx-xxxx',
        danger: false,
      })
      if (!typed) return
      merchantCode = typed
    }
    try {
      await api.post(`/gateway-sales/${row.id}/inspect`, { decision, note, merchant_code: merchantCode })
      toast.success(decision === 'approved' ? t('gwInspectOk') : t('reject'))
      setOpenSale(null)
      refresh()
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(message || t('blockFail'))
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('gwTitle')}
        subtitle={t('gwSub')}
        action={(
          <div className="flex flex-wrap gap-2">
            {orgManagersHref && <Link className="btn btn-ghost" to={orgManagersHref}>{t('navOrgManagers')}</Link>}
            <button className="btn btn-primary" onClick={() => setOpenCreate(true)}>{t('gwNew')}</button>
          </div>
        )}
      />
      <Modal wide open={openCreate} title={t('gwNew')} subtitle={t('gwSub')} onClose={closeCreate}>
        <GatewayCreateForm
          initialSharedToken={gatewayShareEnabled ? sharedToken || undefined : undefined}
          onDone={closeCreate}
        />
      </Modal>
      {openSale && (
        <GatewayReviewModal
          sale={openSale}
          onClose={() => setOpenSale(null)}
          canInspect={canInspect}
          canEditParties={canEditParties}
          onInspect={inspect}
          onUpdated={(row) => {
            setOpenSale(row)
            refresh()
          }}
        />
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('gwCount')} value={(data?.total ?? rows.length).toLocaleString(localeTag())} icon={CreditCard} color="from-blue-500 to-blue-600" />
        <StatCard title={t('gwSuccessful')} value={successCount.toLocaleString(localeTag())} icon={TrendingUp} color="from-emerald-500 to-emerald-600" />
        <StatCard title={moneyHeader(t('gwMyProfit'))} value={money(myProfitTotal)} icon={Wallet} color="from-teal-500 to-emerald-600" />
        <StatCard title={t('gwQueueInspect')} value={inspectCount.toLocaleString(localeTag())} icon={CreditCard} color="from-amber-500 to-amber-600" />
      </div>
      <GatewayTable
        rows={rows}
        isLoading={isLoading}
        canInspect={canInspect}
        onOpen={setOpenSale}
        onInspect={inspect}
        footer={(
          <TablePager
            page={data?.current_page ?? page}
            last={data?.last_page ?? 1}
            from={data?.from}
            to={data?.to}
            total={data?.total ?? rows.length}
            disabled={isFetching}
            onPage={setPage}
          />
        )}
      />
    </div>
  )
}

function commissionKind(row: {
  idempotency_key?: string | null
  metadata?: { type?: string; month?: string } | null
}): 'base' | 'monthly_bonus' | 'monthly_bonus_residual' {
  const type = row.metadata?.type
  if (type === 'monthly_bonus' || type === 'monthly_bonus_residual') return type
  const key = row.idempotency_key ?? ''
  if (key.startsWith('monthly-bonus-residual:')) return 'monthly_bonus_residual'
  if (key.startsWith('monthly-bonus:')) return 'monthly_bonus'
  return 'base'
}

function CommissionTable({ rows, isLoading, footer }: { rows: Array<{
  id: number
  commission_percent: string
  commission_amount: string
  base_amount: string
  status: string
  created_at: string
  idempotency_key?: string | null
  metadata?: { type?: string; month?: string } | null
  role?: { name: string }
  sale?: { gateway?: { name: string } }
}>; isLoading: boolean; footer?: ReactNode }) {
  const { t } = useApp()
  return (
    <div className="card overflow-hidden" data-testid="commission-table">
      <div className="overflow-auto">
      <table className="table">
        <thead>
          <tr>
            <th>{t('gateway')}</th>
            <th>{t('role')}</th>
            <th>{t('commKind')}</th>
            <th>{t('percent')}</th>
            <th>{moneyHeader(t('commAmount'))}</th>
            <th>{moneyHeader(t('baseAmount'))}</th>
            <th>{t('status')}</th>
            <th>{t('date')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const kind = commissionKind(row)
            const isBonus = kind !== 'base'
            const month = row.metadata?.month
            return (
              <tr
                key={row.id}
                className={isBonus ? 'bg-violet-50/60 dark:bg-violet-950/25' : undefined}
                data-commission-kind={kind}
              >
                <td>
                  {isBonus ? (
                    <div className="space-y-0.5">
                      <div className="font-medium text-surface-800 dark:text-surface-100 leading-5">
                        {kind === 'monthly_bonus_residual' ? t('commKindBonusResidual') : t('commKindBonus')}
                      </div>
                      {month ? (
                        <div className="text-xs text-surface-500 leading-4">
                          {t('bonusMonth')}: <MonthText value={month} />
                        </div>
                      ) : (
                        <div className="text-xs text-surface-400 leading-4">{t('commNoGateway')}</div>
                      )}
                    </div>
                  ) : (
                    row.sale?.gateway?.name ?? '—'
                  )}
                </td>
                <td>{row.role?.name}</td>
                <td>
                  {isBonus ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <Badge tone="warn">
                        {kind === 'monthly_bonus_residual' ? t('commKindBonusResidual') : t('commKindBonus')}
                      </Badge>
                    </span>
                  ) : (
                    <Badge tone="muted">{t('commKindBase')}</Badge>
                  )}
                </td>
                <td data-percent={row.commission_percent}>{percent(row.commission_percent)} <span className="sr-only">{row.commission_percent}</span></td>
                <td className={isBonus ? 'font-semibold text-violet-700 dark:text-violet-300' : undefined}>{money(row.commission_amount)}</td>
                <td>{money(row.base_amount)}</td>
                <td><Badge tone="ok">{label(row.status)}</Badge></td>
                <td><DateTimeText value={row.created_at} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
      {!isLoading && rows.length === 0 && <Empty text={t('commEmpty')} />}
      {footer}
    </div>
  )
}

export function CommissionsPage() {
  const { t } = useApp()
  const roleSlug = useAuth((s) => s.user?.active_role?.slug)
  const [gatewayId, setGatewayId] = useState('')
  const [page, setPage] = useState(1)
  const { data: salesData } = useQuery({
    queryKey: ['sales', roleSlug, 'commission-filter'],
    queryFn: async () => (await api.get('/gateway-sales', { params: { per_page: 100 } })).data,
  })
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['commissions', roleSlug, gatewayId, page],
    queryFn: async () => (await api.get('/commissions', {
      params: { page, per_page: 20, ...(gatewayId ? { gateway_id: gatewayId } : {}) },
    })).data,
  })
  const rows = data?.data ?? []
  const total = rows.reduce((sum: number, row: { commission_amount: string }) => sum + Number(row.commission_amount ?? 0), 0)
  const gatewayOptions = Array.from(
    new Map(
      ((salesData?.data ?? []) as GatewaySaleRow[])
        .filter((row) => row.gateway?.id || row.gateway?.name)
        .map((row) => {
          const id = String(row.gateway?.id ?? row.id)
          const label = row.gateway?.name
            ? `${row.gateway.name}${row.gateway.external_id ? ` · ${row.gateway.external_id}` : ''}`
            : `#${row.id}`
          return [id, label] as const
        }),
    ).entries(),
  ).map(([value, label]) => ({ value, label }))

  return (
    <div className="space-y-4">
      <PageHeader title={t('commTitle')} subtitle={t('commSub')} />
      <div className="card p-4">
        <label className="field max-w-md m-0">{t('commFilterGateway')}
          <select
            className="input"
            data-testid="commission-gateway-filter"
            value={gatewayId}
            onChange={(e) => { setGatewayId(e.target.value); setPage(1) }}
          >
            <option value="">{t('commAllGateways')}</option>
            {gatewayOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard title={t('commCount')} value={(data?.total ?? rows.length).toLocaleString(localeTag())} icon={TrendingUp} color="from-blue-500 to-blue-600" />
        <StatCard title={moneyHeader(t('sumCommission'))} value={money(total)} icon={Wallet} color="from-emerald-500 to-emerald-600" />
        <StatCard title={moneyHeader(t('avgEach'))} value={money(rows.length ? total / rows.length : 0)} icon={Users} color="from-amber-500 to-amber-600" />
      </div>
      <CommissionTable
        rows={rows}
        isLoading={isLoading}
        footer={(
          <TablePager
            page={data?.current_page ?? page}
            last={data?.last_page ?? 1}
            from={data?.from}
            to={data?.to}
            total={data?.total ?? rows.length}
            disabled={isFetching}
            onPage={setPage}
          />
        )}
      />
    </div>
  )
}

export function WalletPage() {
  const { t } = useApp()
  const user = useAuth((s) => s.user)
  const [page, setPage] = useState(1)
  const { data: wallets } = useQuery({ queryKey: ['wallets', user?.active_role?.slug], queryFn: async () => (await api.get('/wallets')).data })
  const { data: txs, isFetching } = useQuery({
    queryKey: ['wtx', page],
    queryFn: async () => (await api.get('/wallet-transactions', { params: { page, per_page: 20 } })).data,
  })
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
      <div className="card overflow-hidden">
        <div className="px-4 pt-4 font-semibold text-surface-800 dark:text-surface-200">{t('walletLedger')}</div>
        <div className="overflow-auto">
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
        <TablePager
          page={txs?.current_page ?? page}
          last={txs?.last_page ?? 1}
          from={txs?.from}
          to={txs?.to}
          total={txs?.total ?? txRows.length}
          disabled={isFetching}
          onPage={setPage}
        />
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
  const { data: wallets } = useQuery({ queryKey: ['wallets', user?.active_role?.slug], queryFn: async () => (await api.get('/wallets')).data })
  const { data: aggregate } = useQuery({ queryKey: ['wallets-aggregate'], queryFn: async () => (await api.get('/wallets/aggregate')).data })
  const [page, setPage] = useState(1)
  const { data, isFetching } = useQuery({
    queryKey: ['wd', page],
    queryFn: async () => (await api.get('/withdrawals', { params: { page, per_page: 20 } })).data,
  })
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('1000')
  const [scope, setScope] = useState<'active_role' | 'all_roles'>('active_role')
  type WalletRow = { id: number; balance: string; held_balance?: string; role?: { id?: number; name: string; slug?: string } }
  const walletRows: WalletRow[] = wallets ?? []
  const allWallets: WalletRow[] = aggregate?.by_role ?? []
  const multiRole = allWallets.length > 1
  const availableOf = (w: { balance: string; held_balance?: string }) => Number(w.balance) - Number(w.held_balance ?? 0)
  const activeAvailable = walletRows.reduce((sum, w) => sum + Math.max(0, availableOf(w)), 0)
  const totalAvailable = allWallets.reduce((sum, w) => sum + Math.max(0, availableOf(w)), 0)
  const available = scope === 'all_roles' ? totalAvailable : activeAvailable
  const mutate = useMutation({
    mutationFn: async () => {
      const need = Number(amount)
      if (need <= 0 || available < need) {
        throw Object.assign(new Error(t('withdrawNoBalance')), { response: { data: { message: t('withdrawNoBalance') } } })
      }
      return api.post('/withdrawals', {
        scope,
        amount,
        ...(scope === 'active_role' && walletRows[0]?.id ? { wallet_id: walletRows[0].id } : {}),
        idempotency_key: `ui-${Date.now()}`,
      })
    },
    onSuccess: () => {
      toast.success(t('withdrawOk'))
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['wd'] })
      qc.invalidateQueries({ queryKey: ['wallets'] })
      qc.invalidateQueries({ queryKey: ['wallets-aggregate'] })
    },
    onError: (error: { response?: { data?: { message?: string } } }) => toast.error(error.response?.data?.message ?? t('withdrawCreateFail')),
  })
  const decide = useMutation({
    mutationFn: async ({ id, decision }: { id: number; decision: string }) => api.post(`/withdrawals/${id}/decide`, { decision }),
    onSuccess: () => { toast.success(t('withdrawDecided')); qc.invalidateQueries({ queryKey: ['wd'] }) },
    onError: (error: { response?: { data?: { message?: string } } }) => toast.error(error.response?.data?.message ?? t('withdrawFail')),
  })
  const rows: Array<{ id: number; amount: string; status: string; requested_at: string; user?: { name: string }; wallet?: { role?: { name: string } }; wallet_allocations?: Array<{ wallet_id: number; amount: string }> | null }> = data?.data ?? []
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
        <StatCard title={t('withdrawCount')} value={(data?.total ?? rows.length).toLocaleString(localeTag())} icon={Repeat} color="from-amber-500 to-amber-600" />
        <StatCard title={moneyHeader(t('sumAmount'))} value={money(rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0))} icon={Wallet} color="from-blue-500 to-blue-600" />
      </div>
      <Modal open={open} title={t('withdrawModal')} subtitle={t('withdrawModalSub')} onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          {multiRole && (
            <div className="grid gap-2">
              <div className="text-sm font-medium text-surface-700 dark:text-surface-200">{t('withdrawScopeLabel')}</div>
              <label className="flex items-start gap-2 rounded-xl border border-surface-200 dark:border-surface-700 p-3 cursor-pointer">
                <input type="radio" name="wd-scope" className="mt-1" checked={scope === 'active_role'} onChange={() => setScope('active_role')} />
                <span>
                  <span className="font-medium block">{t('withdrawScopeActive')}</span>
                  <span className="text-xs text-surface-500">{t('dashWallet')}: {money(activeAvailable)} {t('toman')}</span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-xl border border-surface-200 dark:border-surface-700 p-3 cursor-pointer">
                <input type="radio" name="wd-scope" className="mt-1" checked={scope === 'all_roles'} onChange={() => setScope('all_roles')} />
                <span>
                  <span className="font-medium block">{t('withdrawScopeAll')}</span>
                  <span className="text-xs text-surface-500">{t('withdrawTotalAll')}: {money(totalAvailable)} {t('toman')}</span>
                </span>
              </label>
            </div>
          )}
          <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-3 text-sm space-y-2">
            <div className="flex justify-between gap-2">
              <span className="text-surface-500">{scope === 'all_roles' ? t('withdrawTotalAll') : t('dashWallet')}</span>
              <span className="font-semibold">{money(available)} {t('toman')}</span>
            </div>
            {scope === 'all_roles' && allWallets.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-surface-100 dark:border-surface-800">
                {allWallets.map((w) => (
                  <div key={w.id} className="flex justify-between gap-2 text-xs text-surface-500">
                    <span>{w.role?.name ?? '—'}</span>
                    <span>{money(Math.max(0, availableOf(w)))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <label className="field">{moneyHeader()}
            <MoneyInput testId="withdraw-amount" value={amount} onChange={setAmount} />
          </label>
          <button className="btn btn-primary" data-testid="withdraw-submit" disabled={available < Number(amount || 0) || mutate.isPending} onClick={() => mutate.mutate()}>{t('withdrawSubmit')}</button>
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
      <div className="card overflow-hidden">
        <div className="overflow-auto">
        <table className="table">
          <thead><tr><th><CheckBox checked={sel.allSelected} onChange={sel.toggleAll} label={t('selectAll')} /></th><th>{t('withdrawRequester')}</th><th>{moneyHeader()}</th><th>{t('status')}</th><th>{t('date')}</th><th className="text-center">{t('actions')}</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><CheckBox checked={sel.selected.includes(row.id)} onChange={() => sel.toggle(row.id)} label={`${t('selectAll')} ${row.id}`} /></td>
                <td>
                  <div>{row.user?.name ?? t('you')}</div>
                  {row.wallet_allocations && row.wallet_allocations.length > 1 ? (
                    <div className="text-xs text-surface-400 mt-0.5">{t('withdrawMultiWallet')}</div>
                  ) : row.wallet?.role?.name ? (
                    <div className="text-xs text-surface-400 mt-0.5">{row.wallet.role.name}</div>
                  ) : null}
                </td>
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
        <TablePager
          page={data?.current_page ?? page}
          last={data?.last_page ?? 1}
          from={data?.from}
          to={data?.to}
          total={data?.total ?? rows.length}
          disabled={isFetching}
          onPage={setPage}
        />
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
  const roleSlug = user?.active_role?.slug
  const showReferralCode = roleSlug === 'representative' || roleSlug === 'representative_referrer'
  const referralShareOn = user?.features?.shared_links?.referral_enabled !== false
  const gatewayShareOn = user?.features?.shared_links?.gateway_sale_enabled !== false
  const anyShareOn = referralShareOn || gatewayShareOn
  const { data: codes } = useQuery({
    queryKey: ['codes'],
    queryFn: async () => (await api.get('/referrals/codes')).data,
    enabled: showReferralCode,
  })
  const { data: referrals } = useQuery({
    queryKey: ['refs'],
    queryFn: async () => (await api.get('/referrals')).data,
    enabled: showReferralCode,
  })
  const { data: links } = useQuery({ queryKey: ['links'], queryFn: async () => (await api.get('/shared-links')).data })
  const { data: people } = useQuery({
    queryKey: ['share-partners'],
    queryFn: async () => (await api.get('/shared-links/partners')).data,
  })
  const [openShare, setOpenShare] = useState(false)
  const [shareType, setShareType] = useState<'referral' | 'gateway_sale'>(referralShareOn ? 'referral' : 'gateway_sale')
  const [members, setMembers] = useState<Array<{ user_id: string; share_percent: string }>>([
    { user_id: String(user?.id ?? ''), share_percent: '50' },
    { user_id: '', share_percent: '50' },
  ])
  const create = useMutation({
    mutationFn: async () => {
      const filled = members.filter((m) => m.user_id)
      const ids = filled.map((m) => m.user_id)
      if (new Set(ids).size !== ids.length) throw new Error(t('shareDuplicate'))
      if (filled.some((m) => {
        const person = (people ?? []).find((r: { id: number; roles?: Array<{ slug: string }> }) => String(r.id) === m.user_id)
        return person?.roles?.some((r) => r.slug === 'superuser')
      })) throw new Error(t('shareNoSuper'))
      const total = filled.reduce((sum, m) => sum + Number(m.share_percent || 0), 0)
      if (Math.abs(total - 100) > 0.001) throw new Error(t('shareSum'))
      return api.post('/shared-links', {
        type: shareType,
        members: filled.map((m) => ({ user_id: Number(m.user_id), share_percent: Number(m.share_percent) })),
      })
    },
    onSuccess: () => { toast.success(t('shareSubmit')); setOpenShare(false); qc.invalidateQueries({ queryKey: ['links'] }) },
    onError: (error: { message?: string; response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      toast.error(error.response?.data?.errors?.type?.[0] ?? error.response?.data?.errors?.members?.[0] ?? error.response?.data?.message ?? error.message ?? t('shareSum'))
    },
  })
  const approve = useMutation({
    mutationFn: async (id: number) => api.post(`/shared-links/${id}/approve`),
    onSuccess: () => { toast.success(t('approved')); qc.invalidateQueries({ queryKey: ['links'] }) },
  })

  const openCreateModal = () => {
    setShareType(referralShareOn ? 'referral' : 'gateway_sale')
    setMembers([
      { user_id: String(user?.id ?? ''), share_percent: '50' },
      { user_id: '', share_percent: '50' },
    ])
    setOpenShare(true)
  }

  const linkHref = (l: { token: string; type?: string }) => (
    l.type === 'gateway_sale'
      ? `${window.location.origin}/shared-link/${l.token}`
      : `${window.location.origin}/register?share=${l.token}`
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title={showReferralCode ? t('refTitle') : t('shareOnlyTitle')}
        subtitle={showReferralCode ? t('refSub') : t('shareOnlySub')}
        action={anyShareOn ? <button className="btn btn-primary" onClick={openCreateModal}>{t('refNew')}</button> : undefined}
      />
      {!anyShareOn && (
        <div className="card p-4 text-sm text-amber-800 dark:text-amber-100 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          {t('shareFeaturesOff')}
        </div>
      )}
      {showReferralCode && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <StatCard title={t('refCodes')} value={(codes ?? []).length.toLocaleString(localeTag())} icon={Users} color="from-blue-500 to-blue-600" />
            <StatCard title={t('refReferred')} value={(referrals ?? []).length.toLocaleString(localeTag())} icon={Network} color="from-emerald-500 to-emerald-600" />
          </div>
          <div className="card p-5" data-testid="referral-codes">
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
            {(codes ?? []).length === 0 && <Empty text={t('refEmpty')} />}
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
        </>
      )}
      <Modal open={openShare} title={t('shareModal')} subtitle={t('shareModalSub')} onClose={() => setOpenShare(false)}>
        <div className="grid gap-3">
          {(referralShareOn && gatewayShareOn) ? (
            <label className="field">{t('shareType')}
              <select className="input" value={shareType} onChange={(e) => setShareType(e.target.value as 'referral' | 'gateway_sale')}>
                <option value="referral">{t('shareTypeReferral')}</option>
                <option value="gateway_sale">{t('shareTypeGateway')}</option>
              </select>
            </label>
          ) : (
            <div className="text-sm font-semibold text-surface-700 dark:text-surface-200">
              {shareType === 'referral' ? t('shareTypeReferral') : t('shareTypeGateway')}
            </div>
          )}
          <p className="text-xs text-surface-500 m-0">{shareType === 'referral' ? t('shareTypeReferralHint') : t('shareTypeGatewayHint')}</p>
          <div className="font-semibold text-sm">{t('shareMembers')}</div>
          {members.map((member, index) => (
            <div key={index} className="grid sm:grid-cols-[1fr_120px_auto] gap-2 items-end">
              <label className="field">{t('sharePartner')}
                <SearchSelect
                  testId={index === 1 ? 'share-partner' : undefined}
                  value={member.user_id}
                  onChange={(user_id) => setMembers((prev) => prev.map((row, i) => i === index ? { ...row, user_id } : row))}
                  placeholder={t('choose')}
                  options={(people ?? [])
                    .filter((r: { id: number; roles?: Array<{ slug: string }> }) => {
                      if (r.roles?.some((role) => role.slug === 'superuser')) return String(r.id) === member.user_id
                      const taken = members.some((row, i) => i !== index && row.user_id === String(r.id))
                      return !taken
                    })
                    .map((r: { id: number; name: string; mobile?: string }) => ({ value: r.id, label: `${r.name}${r.mobile ? ` · ${r.mobile}` : ''}` }))}
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
        {(links ?? []).map((l: { id: number; token: string; type?: string; status: string; members?: Array<{ user_id?: number; user?: { id?: number; name: string }; share_percent: string; approved: boolean | number }> }) => {
          const mine = l.members?.find((m) => Number(m.user_id ?? m.user?.id) === Number(user?.id))
          const myPending = Boolean(mine) && !mine?.approved
          const href = linkHref(l)
          return (
          <div key={l.id} className="py-3 border-b border-surface-100 dark:border-surface-700 last:border-0 flex justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CopyLink value={href} href={href} />
              <div className="text-xs text-surface-500 mt-1">{l.type === 'gateway_sale' ? t('shareTypeGateway') : t('shareTypeReferral')} · {label(l.status)}</div>
              <div className="text-sm text-surface-400">
                {l.members?.map((m) => `${m.user?.name} ${percent(m.share_percent)} ${m.approved ? t('approved') : t('awaiting')}`).join(' · ')}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge tone={l.status === 'active' ? 'ok' : 'warn'}>{label(l.status)}</Badge>
              {myPending && <button className="btn btn-ok" onClick={() => approve.mutate(l.id)}>{t('approveMyShare')}</button>}
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}

function PromotionList({
  items,
  canDecide,
  onDecide,
}: {
  items: Array<{ id: number; status: string; user?: { name: string }; from_role?: { name: string }; target_role?: { name: string }; feedback?: Array<{ decision: string; note?: string }> }>
  canDecide: boolean
  onDecide: (id: number, decision: string, note?: string) => void
}) {
  const { t } = useApp()
  const sel = useSelection(items.map((p) => p.id))
  const [openId, setOpenId] = useState<number | null>(null)
  const { data: file } = useQuery({
    queryKey: ['promo-file', openId],
    enabled: openId !== null,
    queryFn: async () => (await api.get(`/promotions/${openId}`)).data,
  })
  return (
    <div className="space-y-3">
      {canDecide && (
        <BulkBar count={sel.count}>
          <BulkButton tone="ok" onClick={() => { items.filter((p) => sel.selected.includes(p.id) && p.status === 'pending').forEach((p) => onDecide(p.id, 'approved')); sel.clear() }}>{t('withdrawBulkApprove')}</BulkButton>
          <BulkButton tone="danger" onClick={async () => {
            const note = await promptAction({ title: t('promoRejectTitle'), text: t('promoRejectText'), confirmText: t('rejectYes'), placeholder: t('promoRejectReason') })
            if (!note) return
            items.filter((p) => sel.selected.includes(p.id) && p.status === 'pending').forEach((p) => onDecide(p.id, 'rejected', note))
            sel.clear()
          }}>{t('withdrawBulkReject')}</BulkButton>
        </BulkBar>
      )}
      {items.map((p) => (
        <div key={p.id} className="card p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {canDecide && <CheckBox checked={sel.selected.includes(p.id)} onChange={() => sel.toggle(p.id)} label={`${t('navPromotions')} ${p.id}`} />}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white text-sm font-bold flex items-center justify-center">{(p.user?.name ?? '?').charAt(0)}</div>
            <div>
              <div className="font-semibold text-surface-800 dark:text-surface-100">{p.user?.name}</div>
              <div className="text-sm text-surface-500 mt-0.5">
                {t('promoFromTo', { from: p.from_role?.name ?? t('role'), to: p.target_role?.name ?? t('role') })}
                <span> · {label(p.status)}</span>
              </div>
              {p.status === 'rejected' && p.feedback?.find((f) => f.decision === 'rejected')?.note && (
                <div className="text-xs text-red-600 mt-1" data-testid="promo-reject-reason">{t('dashPromoRejected')}: {p.feedback.find((f) => f.decision === 'rejected')?.note}</div>
              )}
            </div>
          </div>
          <RowActions>
            <ViewAction label={t('promoFile')} onClick={() => setOpenId(p.id)} />
            {canDecide && p.status === 'pending' && (
              <>
                <ApproveAction label={t('approve')} onClick={async () => { if (await confirmAction({ title: t('promoConfirmTitle'), text: t('promoConfirmText'), danger: false, confirmText: t('confirmYes') })) onDecide(p.id, 'approved') }} />
                <IconAction label={t('reject')} tone="delete" icon={X} onClick={async () => {
                  const note = await promptAction({ title: t('promoRejectTitle'), text: t('promoRejectText'), confirmText: t('rejectYes'), placeholder: t('promoRejectReason') })
                  if (note) onDecide(p.id, 'rejected', note)
                }} />
              </>
            )}
          </RowActions>
        </div>
      ))}
      <Modal open={openId !== null} title={t('promoFile')} onClose={() => setOpenId(null)} wide>
        {file && (
          <div className="space-y-4 text-sm">
            <div className="grid sm:grid-cols-2 gap-2">
              <div>{t('name')}: {file.user?.name}</div>
              <div>{t('mobile')}: {file.user?.mobile}</div>
              <div>{t('roles')}: {file.user?.roles?.map((r: { name: string }) => r.name).join(' · ')}</div>
              <div>{t('status')}: {label(file.request?.status)}</div>
              <div>{t('promoSalesCount')}: {file.sales?.count}</div>
              <div>{t('promoPoints')}: {file.sales?.points}</div>
            </div>
            <div>
              <div className="font-semibold mb-2">{t('promoCriteria', { role: file.request?.target_role?.name ?? '' })}</div>
              <div className="space-y-2">
                {(file.criteria ?? []).map((c: { id: number; criterion_code: string; actual_value: string; required_value: string; passed: boolean }) => (
                  <div key={c.id} className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-900/40 p-3 flex items-start justify-between gap-3">
                    <span className="min-w-0 break-words leading-6">{criterionLabel[c.criterion_code] ?? c.criterion_code}</span>
                    <span className="shrink-0 flex items-center gap-2">
                      <span><ScorePair actual={Number(c.actual_value)} required={Number(c.required_value)} compact /></span>
                      {c.passed ? <Badge tone="ok">{t('promoPass')}</Badge> : <Badge tone="warn">{t('promoFail')}</Badge>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div data-testid="promo-training" className="space-y-3">
              <div className="font-semibold">{t('navTraining')}</div>
              {(file.training ?? []).length === 0 && <Empty text={t('noItems')} />}
              {(file.training ?? []).map((c: { id: number; title: string; done: number; total: number; levels: Array<{ id: number; title: string; status?: string }> }) => (
                <div key={c.id} className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-900/40 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-medium text-surface-800 dark:text-surface-100 min-w-0 break-words leading-6">{c.title}</div>
                    <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700">{c.done}/{c.total}</span>
                  </div>
                  <ProgressBar value={Number(c.done)} max={Number(c.total) || 1} />
                  <div className="flex flex-wrap gap-1.5">
                    {c.levels.map((l) => (
                      <Badge key={l.id} tone={l.status === 'completed' ? 'ok' : 'muted'}>{l.title}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="font-semibold">{t('refReferred')}</div>
              {(file.referrals ?? []).length === 0 && <Empty text={t('refEmpty')} />}
              {(file.referrals ?? []).map((r: { id: number; referred?: { name: string; mobile: string } }) => (
                <div key={r.id} className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-900/40 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-surface-800 dark:text-surface-100 break-words">{r.referred?.name ?? '—'}</div>
                    <div className="text-xs text-surface-500 mt-0.5" dir="ltr">{r.referred?.mobile}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="font-semibold">{t('navCommissions')}</div>
              {(file.commissions ?? []).length === 0 && <Empty text={t('commEmpty')} />}
              {(file.commissions ?? []).map((c: { id: number; commission_amount: string; status: string; role?: { name: string } }) => (
                <div key={c.id} className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-900/40 p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-surface-800 dark:text-surface-100">{c.role?.name ?? '—'}</div>
                    <div className="text-xs text-surface-500 mt-0.5">{label(c.status)}</div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{money(c.commission_amount)}</span>
                </div>
              ))}
            </div>
            <div data-testid="promo-activities" className="space-y-3">
              <div className="font-semibold">{t('promoActivities')}</div>
              {(file.activities ?? []).length === 0 && <Empty text={t('noItems')} />}
              {(file.activities ?? []).map((a: { id: number; action: string; created_at: string; actor?: { name: string } }) => (
                <div key={a.id} className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-900/40 p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-surface-800 dark:text-surface-100 break-words leading-6">{label(a.action)}</div>
                    <div className="text-xs text-surface-500 mt-0.5">{a.actor?.name}</div>
                  </div>
                  <span className="shrink-0 text-xs text-surface-400"><DateTimeText value={a.created_at} /></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
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
    onSuccess: () => { toast.success(t('promoRequestOk')); qc.invalidateQueries({ queryKey: ['promo'] }) },
    onError: (error: { response?: { data?: { message?: string } } }) => toast.error(error.response?.data?.message ?? t('promoDecideFail')),
  })
  const decide = useMutation({
    mutationFn: async ({ id, decision, note }: { id: number; decision: string; note?: string }) => api.post(`/promotions/${id}/decide`, { decision, note: note ?? '' }),
    onSuccess: (_data, vars) => {
      toast.success(vars.decision === 'rejected' ? t('promoRejectOk') : t('promoApproveOk'))
      qc.invalidateQueries({ queryKey: ['promo'] })
      qc.invalidateQueries({ queryKey: ['notif'] })
      qc.invalidateQueries({ queryKey: ['notif-unread'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error: { response?: { data?: { message?: string } } }) => toast.error(error.response?.data?.message ?? t('promoDecideFail')),
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
                  <span className="inline-flex items-center gap-2">
                    <ScorePair actual={Number(c.actual)} required={Number(c.required)} compact />
                    {c.passed ? <Badge tone="ok">{t('promoPass')}</Badge> : <Badge tone="warn">{t('promoFail')}</Badge>}
                  </span>
                </div>
                <ProgressBar value={Number(c.actual)} max={Number(c.required) || 1} />
              </div>
            ))}
            <button className="btn btn-primary mt-4" onClick={() => request.mutate()}>{t('promoManual')}</button>
          </>
        )}
        {topRole && <div className="text-sm text-surface-500">{t('promoQueue')}</div>}
      </div>
      <PromotionList items={data ?? []} canDecide={Boolean(canDecide)} onDecide={(id, decision, note) => decide.mutate({ id, decision, note })} />
    </div>
  )
}

export function TrainingPage() {
  const { t } = useApp()
  const qc = useQueryClient()
  const role = useAuth((s) => s.user?.active_role?.slug)
  const canMonitor = ['senior_manager', 'sales_manager', 'development_manager'].includes(role ?? '') || useAuth.getState().user?.is_superuser
  const { data } = useQuery({ queryKey: ['courses'], queryFn: async () => (await api.get('/courses')).data })
  const { data: teamProgress } = useQuery({
    queryKey: ['course-team'],
    enabled: canMonitor,
    queryFn: async () => (await api.get('/courses/team-progress')).data,
  })
  const submit = useMutation({
    mutationFn: async ({ course, level }: { course: number; level: number }) =>
      api.post(`/courses/${course}/levels/${level}/submit`, {}),
    onSuccess: () => { toast.success(t('trainSubmit')); qc.invalidateQueries({ queryKey: ['courses'] }); qc.invalidateQueries({ queryKey: ['course-team'] }) },
  })
  const completeCourse = async (course: { id: number; levels: Array<{ id: number; progress?: { status: string } | null }> }) => {
    for (const level of course.levels) {
      if (level.progress?.status !== 'completed') {
        await submit.mutateAsync({ course: course.id, level: level.id })
      }
    }
  }

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
        levels: Array<{
          id: number
          title: string
          content_type?: string
          content_body?: string
          content_url?: string
          attachment_name?: string
          attachment_url?: string
          progress?: { status: string; completed_at?: string } | null
        }>
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
              <div className="text-end">
                <div className="text-sm text-surface-500 whitespace-nowrap">{done.toLocaleString(localeTag())} / {c.levels.length.toLocaleString(localeTag())} {t('trainLevel')}</div>
                {done < c.levels.length && <button className="btn btn-ghost mt-2" onClick={() => completeCourse(c)}>{t('trainCompleteCourse')}</button>}
              </div>
            </div>
            <div className="mt-3"><ProgressBar value={done} max={c.levels.length || 1} /></div>
            <div className="mt-4 grid gap-3">
              {c.levels.map((l, index) => (
                <div key={l.id} className="border border-surface-200 dark:border-surface-700 rounded-xl p-3 grid gap-3">
                  <div className="flex flex-wrap justify-between gap-3 items-center">
                    <div>
                      <div className="font-bold">{t('trainLevel')} {index + 1}: {l.title}</div>
                      <div className="text-sm mt-1">{l.progress?.status === 'completed' ? <Badge tone="ok">{t('trainViewed')}</Badge> : <Badge tone="muted">{t('trainNotStarted')}</Badge>}</div>
                    </div>
                    {l.progress?.status !== 'completed' && (
                      <button className="btn btn-primary" onClick={() => submit.mutate({ course: c.id, level: l.id })}>{t('trainTake')}</button>
                    )}
                  </div>
                  {l.content_body && <p className="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap m-0 leading-7">{l.content_body}</p>}
                  {l.content_url && (l.content_type === 'video' || l.content_url.includes('youtube') || l.content_url.includes('aparat')) ? (
                    <div className="aspect-video rounded-xl overflow-hidden bg-black">
                      <iframe title={l.title} src={l.content_url} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  ) : l.content_url ? (
                    <a className="text-sm text-primary-600" href={l.content_url} target="_blank" rel="noreferrer">{l.content_url}</a>
                  ) : null}
                  {l.attachment_url && (
                    l.attachment_url.match(/\.(mp4|webm)$/i)
                      ? <video className="w-full max-h-80 rounded-xl" src={l.attachment_url} controls />
                      : l.attachment_url.match(/\.(png|jpe?g|gif|webp)$/i)
                        ? <img className="max-h-80 rounded-xl" src={l.attachment_url} alt={l.attachment_name ?? ''} />
                        : <a className="text-sm text-primary-600" href={l.attachment_url} target="_blank" rel="noreferrer">{l.attachment_name || l.attachment_url}</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {canMonitor && (
        <div className="space-y-3" data-testid="training-monitor">
          <div className="px-1 font-semibold text-surface-800 dark:text-surface-100">{t('trainMonitor')}</div>
          <div className="grid gap-3">
            {(teamProgress ?? []).map((u: { id: number; name: string; mobile: string; courses: Array<{ id?: number; title: string; done: number; total: number; levels: Array<{ id?: number; title: string; status?: string }> }> }) => {
              const done = u.courses.reduce((sum, c) => sum + c.done, 0)
              const total = u.courses.reduce((sum, c) => sum + c.total, 0)
              return (
                <div key={u.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-bold text-surface-800 dark:text-surface-100">{u.name}</div>
                      <div className="text-sm text-surface-500" dir="ltr">{u.mobile}</div>
                    </div>
                    <Badge tone={done === total && total > 0 ? 'ok' : done ? 'warn' : 'muted'}>{done}/{total} {t('trainLevel')}</Badge>
                  </div>
                  <ProgressBar value={done} max={total || 1} />
                  <div className="mt-3 grid md:grid-cols-2 gap-3">
                    {u.courses.map((c) => (
                      <div key={c.id ?? c.title} className="rounded-xl border border-surface-200 dark:border-surface-700 p-3">
                        <div className="flex justify-between gap-2 mb-2">
                          <div className="font-medium text-sm">{c.title}</div>
                          <span className="text-xs text-surface-500">{c.done}/{c.total}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {c.levels.map((l) => (
                            <Badge key={l.id ?? l.title} tone={l.status === 'completed' ? 'ok' : 'muted'}>{l.title}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function NotificationsPage() {
  const { t } = useApp()
  const qc = useQueryClient()
  const user = useAuth((s) => s.user)
  const [page, setPage] = useState(1)
  const { data, isFetching } = useQuery({
    queryKey: ['notif', page],
    queryFn: async () => (await api.get('/notifications', { params: { page, per_page: 20 } })).data,
  })
  const refreshNotifs = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['notif'] }),
      qc.invalidateQueries({ queryKey: ['notif-unread'] }),
      qc.refetchQueries({ queryKey: ['notif'] }),
      qc.refetchQueries({ queryKey: ['notif-unread'] }),
    ])
  }
  const read = useMutation({
    mutationFn: async (id: number) => api.post(`/notifications/${id}/read`),
    onSuccess: refreshNotifs,
  })
  const readAll = useMutation({
    mutationFn: async () => api.post('/notifications/read-all'),
    onSuccess: refreshNotifs,
  })
  const rows: AppNotification[] = data?.data ?? []
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const unread = rows.filter((n) => !n.read_at).length
  const visible = rows.filter((n) => filter === 'all' || (filter === 'unread' ? !n.read_at : Boolean(n.read_at)))
  const nSel = useSelection(visible.map((n) => n.id))

  return (
    <div className="space-y-4" data-testid="notifications">
      <PageHeader title={t('notifications')} action={<button className="btn btn-ghost" onClick={() => readAll.mutate()}>{t('notifReadAll')}</button>} />
      <StatCard title={t('notifUnread')} value={unread.toLocaleString(localeTag())} icon={Users} color="from-amber-500 to-amber-600" />
      <div className="flex flex-wrap gap-2" data-testid="notif-filter">
        {([
          ['all', t('notifFilterAll')],
          ['unread', t('notifUnread')],
          ['read', t('notifFilterRead')],
        ] as const).map(([id, labelText]) => (
          <button
            key={id}
            type="button"
            data-testid={`notif-filter-${id}`}
            className={`btn ${filter === id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setFilter(id); setPage(1) }}
          >
            {labelText}
          </button>
        ))}
      </div>
      <BulkBar count={nSel.count}>
        <BulkButton tone="ok" onClick={async () => { for (const id of nSel.selected) await read.mutateAsync(id); nSel.clear() }}>{t('notifReadSelected')}</BulkButton>
      </BulkBar>
      <div className="card overflow-hidden">
        <div className="divide-y divide-surface-100 dark:divide-surface-700">
          {visible.map((n) => {
            const href = notificationHref(n, user?.active_role?.slug, user?.is_superuser)
            const unreadItem = !n.read_at
            return (
            <div key={n.id} className={`p-4 flex justify-between gap-3 ${unreadItem ? 'bg-primary-50/80 dark:bg-primary-900/25' : 'hover:bg-surface-50 dark:hover:bg-surface-700/30 opacity-80'}`}>
              <div className="flex items-start gap-3">
                <CheckBox checked={nSel.selected.includes(n.id)} onChange={() => nSel.toggle(n.id)} label={notificationTitle(n)} />
                <div className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${unreadItem ? 'bg-primary-500' : 'bg-surface-300'}`} />
                <div>
                  <div className={`${unreadItem ? 'font-bold text-surface-900 dark:text-white' : 'font-medium text-surface-600 dark:text-surface-400'}`}>{notificationTitle(n)}</div>
                  <div className={`text-sm mt-0.5 ${unreadItem ? 'text-surface-700 dark:text-surface-200' : 'text-surface-500'}`}>{notificationBody(n)}</div>
                  <div className="text-xs text-surface-400 mt-1"><DateTimeText value={n.created_at} /></div>
                  {href && (
                    <Link data-testid="notif-link" to={href} className="inline-flex items-center gap-1 text-sm text-primary-600 mt-2 font-semibold" onClick={() => { if (unreadItem) read.mutate(n.id) }}>
                      {t('notifOpen')}
                    </Link>
                  )}
                </div>
              </div>
              {unreadItem && <ApproveAction label={t('notifReadSelected')} onClick={() => read.mutate(n.id)} />}
            </div>
            )
          })}
        </div>
        {visible.length === 0 && <Empty text={t('notifEmpty')} />}
        <TablePager
          page={data?.current_page ?? page}
          last={data?.last_page ?? 1}
          from={data?.from}
          to={data?.to}
          total={data?.total ?? rows.length}
          disabled={isFetching}
          onPage={setPage}
        />
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
            qc.invalidateQueries({ queryKey: ['dir'] })
            qc.invalidateQueries({ queryKey: ['team'] })
            qc.invalidateQueries({ queryKey: ['tree'] })
          } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || t('transferFail'))
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
