import { useQuery } from '@tanstack/react-query'
import { OrgTree, type OrgNode } from '../components/OrgTree'
import { api } from '../lib/api'

export function AdminNetwork() {
  const { data: tree } = useQuery({ queryKey: ['tree'], queryFn: async () => (await api.get('/organization/tree')).data })
  const nodes = Array.isArray(tree) ? tree as OrgNode[] : []
  return <OrgTree nodes={nodes} testId="admin-network" />
}
