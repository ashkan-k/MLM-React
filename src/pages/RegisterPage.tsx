import { Moon, Network, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { api, authApi } from '../lib/api'
import { dashboardPath } from '../lib/roles'
import { useAuth } from '../stores/auth'
import { percent } from '../lib/format'

export function RegisterPage() {
  const [params] = useSearchParams()
  const referralFromLink = (params.get('ref') ?? '').trim()
  const shareFromLink = (params.get('share') ?? '').trim()
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    password: 'Password123!',
  })
  const [error, setError] = useState('')
  const [shareInfo, setShareInfo] = useState<{
    usable: boolean
    status: string
    type?: string
    feature_enabled?: boolean
    pending_approvals?: boolean
    used?: boolean
    expired?: boolean
    members: Array<{ name?: string; share_percent: string; approved: boolean }>
  } | null>(null)
  const [shareLoading, setShareLoading] = useState(Boolean(shareFromLink && !referralFromLink))
  const setSession = useAuth((s) => s.setSession)
  const navigate = useNavigate()
  const { t, darkMode, toggleDarkMode, toggleDirection } = useApp()

  useEffect(() => {
    if (!shareFromLink || referralFromLink) return
    let cancelled = false
    ;(async () => {
      setShareLoading(true)
      try {
        const { data } = await api.get(`/shared-links/token/${encodeURIComponent(shareFromLink)}`)
        if (cancelled) return
        if (data.type === 'gateway_sale') {
          navigate(`/shared-link/${encodeURIComponent(shareFromLink)}`, { replace: true })
          return
        }
        setShareInfo(data)
      } catch {
        if (!cancelled) setShareInfo(null)
      } finally {
        if (!cancelled) setShareLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [shareFromLink, referralFromLink, navigate])

  if (!referralFromLink && !shareFromLink) {
    return <Navigate to="/login" replace state={{ registerNeedsReferral: true }} />
  }

  if (shareFromLink && !referralFromLink && shareLoading) {
    return <div className="login-wrap"><div className="card login-card shadow-xl p-6">در حال بررسی لینک...</div></div>
  }

  if (shareFromLink && !referralFromLink && !shareLoading && shareInfo && (!shareInfo.usable || shareInfo.type !== 'referral')) {
    const reason = shareInfo.feature_enabled === false
      ? t('shareFeaturesOff')
      : shareInfo.type && shareInfo.type !== 'referral'
      ? t('shareLinkUnusable')
      : shareInfo.pending_approvals || shareInfo.status === 'pending'
      ? t('shareLinkPendingApprovals')
      : shareInfo.used || shareInfo.status === 'used'
        ? t('shareLinkUsed')
        : shareInfo.expired
          ? t('shareLinkExpired')
          : t('shareLinkUnusable')
    return (
      <div className="login-wrap">
        <div className="card login-card shadow-xl p-6 space-y-3">
          <h1 className="text-xl font-bold m-0">{t('registerTitle')}</h1>
          <p className="text-sm text-amber-800 dark:text-amber-200 m-0 font-bold">{reason}</p>
          {(shareInfo.members?.length ?? 0) > 0 && (
            <div className="text-sm text-surface-600 dark:text-surface-300 space-y-1">
              {shareInfo.members.map((m, i) => (
                <div key={i}>{m.name ?? '—'} · {percent(m.share_percent)} · {m.approved ? t('approved') : t('awaiting')}</div>
              ))}
            </div>
          )}
          <Link to="/login" className="text-sm text-primary-600">{t('registerBack')}</Link>
        </div>
      </div>
    )
  }

  if (shareFromLink && !referralFromLink && !shareLoading && !shareInfo) {
    return (
      <div className="login-wrap">
        <div className="card login-card shadow-xl p-6 space-y-3">
          <h1 className="text-xl font-bold m-0">{t('registerTitle')}</h1>
          <p className="text-sm text-red-600 m-0 font-bold">{t('shareLinkInvalid')}</p>
          <Link to="/login" className="text-sm text-primary-600">{t('registerBack')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="login-wrap">
      <div className="card login-card shadow-xl">
        <div className="login-hero">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
            <Network className="w-6 h-6 text-white" />
          </div>
          <div className="text-xs uppercase tracking-wide text-white/70">{t('brandSub')}</div>
          <h2>{t('brand')}</h2>
          <p>{t('loginWelcome')}</p>
        </div>
        <form
          className="login-form grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            try {
              const payload = shareFromLink && !referralFromLink
                ? { ...form, shared_link_token: shareFromLink }
                : { ...form, referral_code: referralFromLink }
              const { data } = await authApi.register(payload)
              setSession(data.token, data.user)
              navigate(dashboardPath(data.user.active_role?.slug))
            } catch (err) {
              const message = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
              setError(
                message?.errors?.shared_link_token?.[0]
                || message?.errors?.referral_code?.[0]
                || message?.message
                || t('registerError'),
              )
            }
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-1">
            <h1 className="text-xl font-bold m-0 text-surface-800 dark:text-surface-100">{t('registerTitle')}</h1>
            <div className="flex items-center gap-1">
              <button type="button" data-testid="lang-toggle" className="btn btn-ghost text-xs px-2 py-1" onClick={toggleDirection}>{t('language')}</button>
              <button type="button" data-testid="theme-toggle" className="btn btn-ghost p-2" onClick={toggleDarkMode} aria-label={t('theme')}>
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {referralFromLink ? (
            <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 text-sm text-primary-800 dark:text-primary-200 px-3 py-2">
              {t('registerReferralLocked')}: <code className="font-bold">{referralFromLink}</code>
            </div>
          ) : (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-900 dark:text-emerald-100 px-3 py-2 space-y-2">
              <div className="font-bold">{t('registerShareLocked')}</div>
              {(shareInfo?.members ?? []).map((m, i) => (
                <div key={i}>{m.name ?? '—'} · {percent(m.share_percent)}</div>
              ))}
            </div>
          )}
          <label className="field">{t('registerName')}
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field">{t('loginMobile')}
            <input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </label>
          <label className="field">{t('loginPassword')}
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {error && <div className="text-danger-500 text-sm">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={shareLoading}>{t('registerSubmit')}</button>
          <Link to="/login" className="text-sm text-primary-600">{t('registerBack')}</Link>
        </form>
      </div>
    </div>
  )
}
