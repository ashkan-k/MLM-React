import { Navigate, useParams } from 'react-router-dom'
import { dashboardPath } from '../lib/roles'
import { useAuth } from '../stores/auth'

/** Deep-link for shared gateway-sale links (approval / use in panel). Not open registration. */
export function SharedLinkPage() {
  const { token = '' } = useParams()
  const { user, loading } = useAuth()
  const clean = decodeURIComponent(token).trim()

  if (loading) return <div className="p-8">در حال بارگذاری...</div>
  if (!clean) return <Navigate to="/login" replace />

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `/shared-link/${encodeURIComponent(clean)}` }} />
  }

  const slug = user.active_role?.slug === 'superuser'
    ? (user.roles?.find((r) => r.slug && r.slug !== 'superuser')?.slug ?? 'representative')
    : user.active_role?.slug

  const base = dashboardPath(slug)

  return <Navigate to={`${base}/referrals?share=${encodeURIComponent(clean)}`} replace />
}
