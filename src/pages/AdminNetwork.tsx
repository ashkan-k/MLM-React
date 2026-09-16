import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { OrgTree, type OrgNode } from '../components/OrgTree'
import { PageHeader } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'

export function AdminNetwork() {
  const { t } = useApp()
  const { data: tree } = useQuery({ queryKey: ['tree'], queryFn: async () => (await api.get('/organization/tree')).data })
  const nodes = Array.isArray(tree) ? tree as OrgNode[] : []
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('orgTitle')}
        subtitle={t('orgSubtitle')}
        action={<Link className="btn btn-primary" to="/superuser/org-managers">{t('navOrgManagers')}</Link>}
      />
      <OrgTree nodes={nodes} testId="admin-network" />
    </div>
  )
}
