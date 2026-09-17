import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { dashboardPath } from '../lib/roles'
import { useAuth } from '../stores/auth'

function gatewaysHref(user: {
  is_superuser?: boolean
  active_role?: { slug: string } | null
  roles?: Array<{ slug: string; is_active?: boolean }>
} | null, token: string) {
  const q = `shared=${encodeURIComponent(token)}`
  if (user?.is_superuser || user?.active_role?.slug === 'superuser') {
    return `/superuser/gateways?${q}`
  }
  const hasRep = user?.roles?.some((r) => r.slug === 'representative' && r.is_active !== false)
  if (hasRep) {
    return `/dashboard/representative/gateways?${q}`
  }
  return `${dashboardPath(user?.active_role?.slug)}/gateways?${q}`
}

/** Deep-link: referral → register; gateway_sale → gateway create form (after login if needed). */
export function SharedLinkPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const loading = useAuth((s) => s.loading)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading) return
    const clean = decodeURIComponent(token).trim()
    if (!clean) {
      navigate('/login', { replace: true })
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get(`/shared-links/token/${encodeURIComponent(clean)}`)
        if (cancelled) return

        if (!data.feature_enabled) {
          setError('این نوع لینک اشتراکی فعلاً غیرفعال است.')
          return
        }

        if (data.type === 'referral') {
          navigate(`/register?share=${encodeURIComponent(clean)}`, { replace: true })
          return
        }

        const dest = gatewaysHref(user, clean)
        if (user) {
          navigate(dest, { replace: true })
        } else {
          navigate('/login', { replace: true, state: { from: dest } })
        }
      } catch {
        if (!cancelled) setError('لینک اشتراکی یافت نشد یا منقضی شده است.')
      }
    })()

    return () => { cancelled = true }
  }, [token, loading, user, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-6 max-w-md text-center space-y-3">
          <div className="font-bold text-surface-800 dark:text-surface-100">{error}</div>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/login', { replace: true })}>
            ورود به سامانه
          </button>
        </div>
      </div>
    )
  }

  return <div className="p-8 text-center text-surface-500">در حال انتقال...</div>
}
