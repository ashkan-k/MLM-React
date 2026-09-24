import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ExportBar } from '../components/ExportBar'
import { JalaliDatePicker } from '../components/JalaliDatePicker'
import { OrgTree, type OrgNode } from '../components/OrgTree'
import { SearchSelect } from '../components/SearchSelect'
import { BarChart, DateTimeText, Empty, LineChart, PageHeader, StatCard } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { label, localeTag, money, percent } from '../lib/format'

type NamedValue = { id?: number; label: string; value: number; count?: number; mobile?: string }
type OrgRow = { id: number; name: string; mobile: string; roles: string[]; descendant_count: number; descendants: Array<{ id: number; name: string; mobile: string }> }

function subtreeByUser(nodes: OrgNode[], userId: number): OrgNode[] {
  for (const node of nodes) {
    if (Number(node.user?.id) === userId) return [node]
    const found = subtreeByUser(node.children ?? [], userId)
    if (found.length) return found
  }
  return []
}

export function AdminReports() {
  const { t } = useApp()
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get('/superuser/roles')).data })
  const { data: users } = useQuery({ queryKey: ['admin-users-all'], queryFn: async () => (await api.get('/superuser/users', { params: { per_page: 200 } })).data })
  const [filters, setFilters] = useState({
    from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    role_id: '',
    user_id: '',
    include_descendants: true,
  })
  const params = useMemo(() => ({
    from: filters.from,
    to: filters.to,
    role_id: filters.role_id || undefined,
    user_id: filters.user_id || undefined,
    include_descendants: filters.include_descendants,
  }), [filters])
  const { data, isFetching } = useQuery({
    queryKey: ['admin-reports', params],
    queryFn: async () => (await api.get('/superuser/reports', { params })).data,
  })
  const { data: tree } = useQuery({
    queryKey: ['tree', 'shallow', 'reports'],
    queryFn: async () => (await api.get('/organization/tree', { params: { max_depth: 1 } })).data,
  })
  const treeNodes = useMemo(() => {
    const nodes = Array.isArray(tree) ? tree as OrgNode[] : []
    if (!filters.user_id) return nodes
    return subtreeByUser(nodes, Number(filters.user_id))
  }, [tree, filters.user_id])

  const loadTreeChildren = async (nodeId: number): Promise<OrgNode[]> => {
    const { data } = await api.get('/organization/tree', { params: { parent_id: nodeId, max_depth: 1 } })
    return Array.isArray(data) ? data as OrgNode[] : []
  }

  return (
    <div className="space-y-4" data-testid="admin-reports">
      <PageHeader
        title={t('reportsTitle')}
        subtitle={t('reportsSub')}
        action={
          <ExportBar
            filename="گزارشات-سامانه"
            sheets={[
              { title: 'عملیات', rows: (data?.operations ?? []).map((r: NamedValue & { amount?: number }) => ({ عملیات: r.label, تعداد: r.count ?? 0, 'مبلغ (تومان)': r.amount ?? r.value ?? 0 })) },
              { title: 'کاربران', rows: (data?.organization ?? []).map((r: OrgRow) => ({ شناسه: r.id, نام: r.name, موبایل: r.mobile, نقش‌ها: r.roles.join('، '), زیرمجموعه: r.descendant_count })) },
              { title: 'پورسانت', rows: (data?.recent_commissions ?? []).map((r: { user: string; role: string; amount: number; percent: number }) => ({ کاربر: r.user, نقش: r.role, درصد: r.percent, 'مبلغ (تومان)': r.amount })) },
              { title: 'پورسانت نقش', rows: (data?.commissions_by_role ?? []).map((r: NamedValue) => ({ نقش: r.label, 'مبلغ (تومان)': r.value, تعداد: r.count ?? 0 })) },
            ]}
          />
        }
      />

      <form className="card p-4 grid md:grid-cols-5 gap-3 items-end" onSubmit={(e) => e.preventDefault()}>
        <label className="field">{t('dateFrom')}
          <JalaliDatePicker value={filters.from} onChange={(from) => setFilters({ ...filters, from })} allowClear={false} />
        </label>
        <label className="field">{t('dateTo')}
          <JalaliDatePicker value={filters.to} onChange={(to) => setFilters({ ...filters, to })} allowClear={false} />
        </label>
        <label className="field">{t('role')}
          <SearchSelect
            testId="report-role"
            value={filters.role_id}
            onChange={(role_id) => setFilters({ ...filters, role_id })}
            placeholder={t('allRoles')}
            options={(roles ?? []).map((r: { id: number; name: string }) => ({ value: r.id, label: r.name }))}
          />
        </label>
        <label className="field">{t('userAndDownline')}
          <SearchSelect
            testId="report-user"
            value={filters.user_id}
            onChange={(user_id) => setFilters({ ...filters, user_id })}
            placeholder={t('allUsers')}
            options={(users?.data ?? []).map((u: { id: number; name: string; mobile?: string }) => ({ value: u.id, label: `${u.name}${u.mobile ? ` · ${u.mobile}` : ''}` }))}
          />
        </label>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" checked={filters.include_descendants} onChange={(e) => setFilters({ ...filters, include_descendants: e.target.checked })} />
          {t('includeDownline')}
        </label>
      </form>

      <div className="grid md:grid-cols-3 gap-3">
        {(data?.summary ?? []).map((s: { key: string; label: string; value: number; money?: boolean }) => (
          <StatCard key={s.key} title={s.label} value={s.money ? money(s.value) : Number(s.value).toLocaleString(localeTag())} />
        ))}
      </div>
      {isFetching && <div className="text-sm text-surface-400">در حال به‌روزرسانی گزارش...</div>}

      <div className="grid lg:grid-cols-2 gap-3">
        <div className="card p-5">
          <div className="font-bold mb-3">روند فروش (خطی)</div>
          <LineChart data={data?.sales_over_time ?? []} testId="sales-line-chart" />
        </div>
        <div className="card p-5">
          <div className="font-bold mb-3">پورسانت به تفکیک نقش (میله‌ای)</div>
          <BarChart data={data?.commissions_by_role ?? []} testId="role-bar-chart" />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <div className="card p-5">
          <div className="font-bold mb-3">عملیات دوره</div>
          <BarChart data={(data?.operations ?? []).map((o: { label: string; count: number }) => ({ label: o.label, value: o.count }))} />
        </div>
        <div className="card p-5">
          <div className="font-bold mb-3">کاربران هر نقش</div>
          <BarChart data={data?.users_by_role ?? []} />
        </div>
      </div>

      <div className="card overflow-auto">
        <div className="px-4 pt-4 font-bold">پورسانت کاربران</div>
        <table className="table">
          <thead><tr><th>کاربر</th><th>موبایل</th><th>تعداد</th><th>مبلغ (تومان)</th></tr></thead>
          <tbody>
            {(data?.commissions_by_user ?? []).map((row: NamedValue) => (
              <tr key={row.id ?? row.label}>
                <td>{row.label}</td>
                <td>{row.mobile ?? '—'}</td>
                <td>{row.count ?? 0}</td>
                <td>{money(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data?.commissions_by_user ?? []).length === 0 && <Empty text="پورسانتی در این بازه نیست." />}
      </div>

      <div className="card overflow-auto">
        <div className="px-4 pt-4 font-bold">آخرین پورسانت‌ها</div>
        <table className="table">
          <thead><tr><th>کاربر</th><th>نقش</th><th>درصد</th><th>مبلغ (تومان)</th><th>تاریخ</th></tr></thead>
          <tbody>
            {(data?.recent_commissions ?? []).map((row: { id: number; user: string; role: string; percent: number; amount: number; created_at: string }) => (
              <tr key={row.id}>
                <td>{row.user}</td>
                <td>{row.role}</td>
                <td>{percent(row.percent)}</td>
                <td>{money(row.amount)}</td>
                <td><DateTimeText value={row.created_at} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div data-testid="org-report">
        <OrgTree
          nodes={treeNodes}
          title={t('orgTitle')}
          subtitle={t('orgSubtitle')}
          lazy
          onLoadChildren={loadTreeChildren}
        />
      </div>

      <div className="card overflow-auto">
        <div className="px-4 pt-4 font-bold">برداشت‌ها به تفکیک وضعیت</div>
        <table className="table">
          <thead><tr><th>وضعیت</th><th>تعداد</th><th>مبلغ (تومان)</th></tr></thead>
          <tbody>
            {(data?.withdrawals_by_status ?? []).map((row: { label: string; count: number; value: number }) => (
              <tr key={row.label}>
                <td>{label(row.label)}</td>
                <td>{row.count}</td>
                <td>{money(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
