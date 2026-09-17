import { AlertTriangle, CheckCircle2, Clock3, Link2Off, Moon, Network, ShieldAlert, Sun } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { api, authApi } from '../lib/api'
import { dashboardPath } from '../lib/roles'
import { useAuth } from '../stores/auth'

function RegisterShell({
  children,
  heroTitle,
  heroSub,
}: {
  children: ReactNode
  heroTitle?: string
  heroSub?: string
}) {
  const { t, darkMode, toggleDarkMode, toggleDirection } = useApp()
  return (
    <div className="login-wrap">
      <div className="card login-card shadow-xl">
        <div className="login-hero">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
            <Network className="w-6 h-6 text-white" />
          </div>
          <div className="text-xs uppercase tracking-wide text-white/70">{t('brandSub')}</div>
          <h2>{heroTitle ?? t('brand')}</h2>
          <p>{heroSub ?? t('loginWelcome')}</p>
          <div className="mt-6 flex items-center gap-2">
            <button type="button" className="btn btn-ghost text-xs px-2 py-1 text-white/90 hover:bg-white/10" onClick={toggleDirection}>{t('language')}</button>
            <button type="button" className="btn btn-ghost p-2 text-white/90 hover:bg-white/10" onClick={toggleDarkMode} aria-label={t('theme')}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="login-form grid gap-4 content-center">{children}</div>
      </div>
    </div>
  )
}

function StatusPanel({
  icon,
  tone,
  title,
  message,
}: {
  icon: ReactNode
  tone: 'warn' | 'danger' | 'info'
  title: string
  message: string
}) {
  const toneClass = tone === 'warn'
    ? 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100'
    : tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-100'
      : 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100'

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 opacity-90">{icon}</div>
        <div className="min-w-0 space-y-1">
          <div className="font-bold text-base leading-7">{title}</div>
          <p className="m-0 text-sm leading-7 opacity-90">{message}</p>
        </div>
      </div>
    </div>
  )
}

export function RegisterPage() {
  const [params] = useSearchParams()
  const referralFromLink = (params.get('ref') ?? '').trim()
  const shareFromLink = (params.get('share') ?? '').trim()
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    password: 'Password123!',
    password_confirmation: 'Password123!',
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
  } | null>(null)
  const [shareLoading, setShareLoading] = useState(Boolean(shareFromLink && !referralFromLink))
  const setSession = useAuth((s) => s.setSession)
  const navigate = useNavigate()
  const { t } = useApp()

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
    return (
      <RegisterShell heroTitle={t('registerTitle')} heroSub={t('registerCheckingLink')}>
        <div className="text-sm text-surface-500">{t('loading')}</div>
      </RegisterShell>
    )
  }

  if (shareFromLink && !referralFromLink && !shareLoading && shareInfo && (!shareInfo.usable || shareInfo.type !== 'referral')) {
    const pending = shareInfo.pending_approvals || shareInfo.status === 'pending'
    const used = shareInfo.used || shareInfo.status === 'used'
    const expired = Boolean(shareInfo.expired)
    const featureOff = shareInfo.feature_enabled === false
    const title = featureOff
      ? t('shareFeaturesOff')
      : pending
        ? t('shareLinkPendingTitle')
        : used
          ? t('shareLinkUsedTitle')
          : expired
            ? t('shareLinkExpiredTitle')
            : t('shareLinkUnusable')
    const message = featureOff
      ? t('shareFeaturesOffHint')
      : pending
        ? t('shareLinkPendingApprovals')
        : used
          ? t('shareLinkUsedHint')
          : expired
            ? t('shareLinkExpired')
            : t('shareLinkUnusable')
    const tone: 'warn' | 'danger' | 'info' = pending ? 'warn' : used || expired || featureOff ? 'danger' : 'info'
    const icon = pending
      ? <Clock3 className="w-5 h-5" />
      : used
        ? <CheckCircle2 className="w-5 h-5" />
        : expired || featureOff
          ? <Link2Off className="w-5 h-5" />
          : <ShieldAlert className="w-5 h-5" />

    return (
      <RegisterShell heroTitle={t('registerTitle')} heroSub={t('registerShareLocked')}>
        <StatusPanel icon={icon} tone={tone} title={title} message={message} />
        <Link to="/login" className="btn btn-primary w-full text-center">{t('registerBack')}</Link>
      </RegisterShell>
    )
  }

  if (shareFromLink && !referralFromLink && !shareLoading && !shareInfo) {
    return (
      <RegisterShell heroTitle={t('registerTitle')} heroSub={t('registerShareLocked')}>
        <StatusPanel
          icon={<AlertTriangle className="w-5 h-5" />}
          tone="danger"
          title={t('shareLinkInvalid')}
          message={t('shareLinkInvalidHint')}
        />
        <Link to="/login" className="btn btn-primary w-full text-center">{t('registerBack')}</Link>
      </RegisterShell>
    )
  }

  return (
    <RegisterShell>
      <div>
        <h1 className="text-xl font-bold m-0 text-surface-800 dark:text-surface-100">{t('registerTitle')}</h1>
        <p className="text-sm text-surface-500 mt-1 mb-0">{t('registerFormHint')}</p>
      </div>
      {referralFromLink ? (
        <div className="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 text-sm text-primary-800 dark:text-primary-200 px-3 py-2">
          {t('registerReferralLocked')}: <code className="font-bold">{referralFromLink}</code>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-900 dark:text-emerald-100 px-3 py-2 font-bold">
          {t('registerShareLocked')}
        </div>
      )}
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setError('')
          if (form.password !== form.password_confirmation) {
            setError(t('passwordMismatch'))
            return
          }
          try {
            const payload = shareFromLink && !referralFromLink
              ? {
                  name: form.name,
                  mobile: form.mobile,
                  password: form.password,
                  password_confirmation: form.password_confirmation,
                  shared_link_token: shareFromLink,
                }
              : {
                  name: form.name,
                  mobile: form.mobile,
                  password: form.password,
                  password_confirmation: form.password_confirmation,
                  referral_code: referralFromLink,
                }
            const { data } = await authApi.register(payload)
            setSession(data.token, data.user)
            navigate(dashboardPath(data.user.active_role?.slug))
          } catch (err) {
            const message = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
            setError(
              message?.errors?.password?.[0]
              || message?.errors?.shared_link_token?.[0]
              || message?.errors?.referral_code?.[0]
              || message?.errors?.mobile?.[0]
              || message?.message
              || t('registerError'),
            )
          }
        }}
      >
        <label className="field">{t('registerName')}
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label className="field">{t('loginMobile')}
          <input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
        </label>
        <label className="field">{t('loginPassword')}
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
        </label>
        <label className="field">{t('passwordConfirm')}
          <input className="input" type="password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} required minLength={8} />
        </label>
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200 text-sm px-3 py-2">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={shareLoading}>{t('registerSubmit')}</button>
        <Link to="/login" className="text-sm text-primary-600 text-center">{t('registerBack')}</Link>
      </form>
    </RegisterShell>
  )
}
