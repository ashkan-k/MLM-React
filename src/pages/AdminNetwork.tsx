import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { OrgTree, type OrgNode } from '../components/OrgTree'
import { PageHeader } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'

export function AdminNetwork() {
  const { t } = useApp()
  const { data: tree } = useQuery({
    queryKey: ['tree', 'shallow', 'admin'],
    queryFn: async () => (await api.get('/organization/tree', { params: { max_depth: 1 } })).data,
  })
  const nodes = Array.isArray(tree) ? tree as OrgNode[] : []
  const loadChildren = async (nodeId: number): Promise<OrgNode[]> => {
    const { data } = await api.get('/organization/tree', { params: { parent_id: nodeId, max_depth: 1 } })
    return Array.isArray(data) ? data as OrgNode[] : []
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('orgTitle')}
        subtitle={t('orgSubtitle')}
        action={<Link className="btn btn-primary" to="/superuser/org-managers">{t('navOrgManagers')}</Link>}
      />
      <OrgTree nodes={nodes} testId="admin-network" lazy onLoadChildren={loadChildren} />
    </div>
  )
}
