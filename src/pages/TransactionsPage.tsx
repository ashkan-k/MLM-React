import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthorityActions, AuthorityCell } from '../components/AuthorityCell'
import { JalaliDatePicker } from '../components/JalaliDatePicker'
import { TablePager } from '../components/table'
import { Badge, DateTimeText, Empty, PageHeader, ProductBadge } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { label, money, moneyHeader } from '../lib/format'
import { useProductOriented } from '../lib/productMode'
import { useAuth } from '../stores/auth'

type TxRow = {
  id: number
  product_type?: string | null
  product_label?: string | null
  product_code?: string | null
  merchant_code?: string | null
  authority?: string | null
  ref_id?: string | null
  order_id?: string | null
  amount?: string | number | null
  profit?: string | number | null
  status?: string | null
  paid_at?: string | null
  processed_at?: string | null
  created_at?: string | null
  source_title?: string | null
  gateway?: { id: number; name?: string; merchant_code?: string | null; external_id?: string | null } | null
  sale?: { id: number; customer?: { name?: string; mobile?: string } | null } | null
  product_sale?: { id: number; title?: string | null; product_code?: string | null } | null
}

export function TransactionsPage() {
  const { t } = useApp()
  const me = useAuth((s) => s.user)
  const productOriented = useProductOriented()
  const roleSlug = me?.active_role?.slug
  const [searchParams] = useSearchParams()
  const initialSearch = (searchParams.get('search') ?? searchParams.get('authority') ?? '').trim()
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState({
    search: initialSearch,
    status: '',
    product_type: '',
    from: '',
    to: '',
  })
  const [filters, setFilters] = useState(draft)

  const params = useMemo(() => ({
    page,
    per_page: 20,
    search: filters.search.trim() || undefined,
    status: filters.status || undefined,
    product_type: filters.product_type || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  }), [page, filters])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['transactions', roleSlug, params],
    queryFn: async () => (await api.get('/transactions', { params })).data,
  })

  const rows: TxRow[] = data?.data ?? []

  const apply = (e?: FormEvent) => {
    e?.preventDefault()
    setPage(1)
    setFilters({ ...draft })
  }

  return (
    <div className="space-y-4" data-testid="transactions-page">
      <PageHeader title={t('txTitle')} subtitle={t('txSub')} />

      <form className="card p-4 grid md:grid-cols-6 gap-3 items-end" onSubmit={apply}>
        <label className="field md:col-span-2">{t('search')}
          <input
            className="input"
            value={draft.search}
            onChange={(e) => setDraft({ ...draft, search: e.target.value })}
            placeholder={t('txSearchPlaceholder')}
            data-testid="tx-search"
          />
        </label>
        <label className="field">{t('status')}
          <select className="input" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} data-testid="tx-status">
            <option value="">{t('allStatuses')}</option>
            <option value="verified">{label('verified')}</option>
            <option value="paid">{label('paid')}</option>
            <option value="failed">{label('failed')}</option>
            <option value="pending">{label('pending')}</option>
          </select>
        </label>
        {productOriented && (
          <label className="field">{t('productCol')}
            <select className="input" value={draft.product_type} onChange={(e) => setDraft({ ...draft, product_type: e.target.value })} data-testid="tx-product">
              <option value="">{t('allProducts')}</option>
              <option value="gateway_profit">{t('product_gateway_profit')}</option>
              <option value="ticketing">{t('product_ticketing')}</option>
              <option value="subscription">{t('product_subscription')}</option>
            </select>
          </label>
        )}
        <label className="field">{t('dateFrom')}
          <JalaliDatePicker value={draft.from} onChange={(from) => setDraft({ ...draft, from })} />
        </label>
        <label className="field">{t('dateTo')}
          <JalaliDatePicker value={draft.to} onChange={(to) => setDraft({ ...draft, to })} />
        </label>
        <button type="submit" className="btn btn-primary" data-testid="tx-apply">{t('applyFilters')}</button>
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-auto">
          <table className="table">
            <thead>
              <tr>
                {productOriented && <th>{t('productCol')}</th>}
                <th>{t('txSource')}</th>
                <th>{t('customer')}</th>
                <th>{moneyHeader(t('txAmount'))}</th>
                <th>{moneyHeader(t('txProfit'))}</th>
                <th>{t('status')}</th>
                <th>{t('txAuthority')}</th>
                <th>{t('txRef')}</th>
                <th>{t('date')}</th>
                <th className="text-center whitespace-nowrap">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {productOriented && (
                    <td>
                      <ProductBadge type={row.product_type ?? 'gateway_profit'} label={row.product_label} />
                      {row.product_code && <div className="text-[11px] text-surface-400 mt-1 font-mono dir-ltr text-left">{row.product_code}</div>}
                    </td>
                  )}
                  <td>
                    <div className="font-semibold">{row.source_title ?? row.gateway?.name ?? '—'}</div>
                    <div className="text-xs text-surface-400">
                      <span className="text-surface-500">{t('txMerchantCode')}: </span>
                      <span className="font-mono dir-ltr inline-block">{row.merchant_code ?? row.gateway?.merchant_code ?? '—'}</span>
                    </div>
                  </td>
                  <td>
                    <div>{row.sale?.customer?.name ?? '—'}</div>
                    <div className="text-xs text-surface-400">{row.sale?.customer?.mobile ?? ''}</div>
                  </td>
                  <td>{money(row.amount)}</td>
                  <td className="font-semibold text-emerald-700 dark:text-emerald-400">{money(row.profit)}</td>
                  <td><Badge tone={row.status === 'failed' ? 'danger' : row.status === 'verified' || row.status === 'paid' ? 'ok' : 'warn'}>{label(row.status)}</Badge></td>
                  <td><AuthorityCell authority={row.authority} /></td>
                  <td className="text-xs font-mono dir-ltr text-left">{row.ref_id || row.order_id || '—'}</td>
                  <td><DateTimeText value={row.paid_at ?? row.processed_at ?? row.created_at} /></td>
                  <td className="text-center"><AuthorityActions authority={row.authority} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && rows.length === 0 && <Empty text={t('txEmpty')} />}
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
