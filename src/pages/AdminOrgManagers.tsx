import { ManagerReassignCard } from '../components/ManagerReassignCard'
import { PageHeader } from '../components/ui'
import { useApp } from '../contexts/AppContext'

export function AdminOrgManagers() {
  const { t } = useApp()
  return (
    <div className="space-y-6">
      <PageHeader title={t('navOrgManagers')} subtitle={t('orgManagersSub')} />
      <ManagerReassignCard />
    </div>
  )
}
