import { AlertTriangle, CheckCircle2, Clock3, Link2Off, Moon, Percent, ShieldAlert, Sun, Users, Wallet } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { api, authApi } from '../lib/api'
import { dashboardPath } from '../lib/roles'
import { useAuth } from '../stores/auth'

function NetworkArt() {
  const nodes = [
    { x: 50, y: 14, r: 5, c: '#f2b84b' },
    { x: 26, y: 38, r: 4, c: '#2cb98f' }, { x: 74, y: 38, r: 4, c: '#2cb98f' },
    { x: 12, y: 64, r: 3, c: '#5ea5d6' }, { x: 38, y: 64, r: 3, c: '#5ea5d6' }, { x: 62, y: 64, r: 3, c: '#5ea5d6' }, { x: 88, y: 64, r: 3, c: '#5ea5d6' },
    { x: 20, y: 86, r: 2.4, c: '#9db3a7' }, { x: 44, y: 86, r: 2.4, c: '#9db3a7' }, { x: 70, y: 86, r: 2.4, c: '#9db3a7' }, { x: 90, y: 86, r: 2.4, c: '#9db3a7' },
  ]
  const edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [3, 7], [4, 8], [5, 9], [6, 9]]
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke="#2a4436" strokeWidth="0.35" strokeDasharray="1.5 1.2" />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} opacity="0.16" />
          <circle cx={n.x} cy={n.y} r={n.r * 0.55} fill={n.c} />
        </g>
      ))}
    </svg>
  )
}

function AuthShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  const { t, darkMode, toggleDarkMode, toggleDirection } = useApp()
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-side relative overflow-hidden">
        <div className="absolute inset-0 opacity-60"><NetworkArt /></div>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(13,26,21,0.4), rgba(13,26,21,0.92))' }} />
        <div className="relative flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-side2 border border-white/10 flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="8" r="3.4" fill="#f2b84b" />
              <circle cx="7" cy="23" r="3.4" fill="#2cb98f" />
              <circle cx="25" cy="23" r="3.4" fill="#2cb98f" />
              <path d="M16 11.5v3.5m0 0l-6.5 5.5M16 15l6.5 5.5" stroke="#9db3a7" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="text-white font-black text-lg leading-none m-0">{t('brand')}</p>
            <p className="text-sidetx text-[0.68rem] mt-1 mb-0">{t('brandSub')}</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-white text-3xl font-black leading-[1.5] m-0">{t('loginWelcome')}</h2>
          <div className="mt-8 space-y-3.5">
            {[
              { icon: Users, text: t('loginSub') },
              { icon: Percent, text: 'پورسانت و کیف پول یکپارچه' },
              { icon: Wallet, text: 'مانیتور شبکه و زیرمجموعه در یک پنل' },
            ].map((f) => (
              <p key={f.text} className="flex items-center gap-3 text-sidetx text-sm m-0">
                <span className="badge tone-acc !p-2 !rounded-lg !text-acc2 !bg-surface/5"><f.icon size={15} /></span>
                {f.text}
              </p>
            ))}
          </div>
        </div>
        <p className="relative text-sidetx/60 text-[0.7rem] m-0">فینونت — سازمان فروش</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10 bg-bg relative">
        <div className="absolute top-4 end-4 flex items-center gap-1">
          <button type="button" className="icon-btn" onClick={toggleDirection} aria-label={t('language')}>
            <span className="font-code text-[0.72rem] font-bold">{t('language')}</span>
          </button>
          <button type="button" className="icon-btn" onClick={toggleDarkMode} aria-label={t('theme')}>
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
        <div className="w-full max-w-[400px] anim-up">
          <h1 className="text-[1.65rem] font-black tracking-tight m-0 text-ink">{title}</h1>
          <p className="text-sm text-mute mt-2 leading-6 mb-7">{subtitle}</p>
          {children}
        </div>
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
    ? 'tone-warn border border-warn/25'
    : tone === 'danger'
      ? 'tone-bad border border-bad/25'
      : 'tone-info border border-info/25'

  return (
    <div className={`rounded-2xl px-4 py-4 ${toneClass}`}>
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

function ReferralCodeGate() {
  const { t } = useApp()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      setError(t('registerNeedsReferral'))
      return
    }
    navigate(`/register?ref=${encodeURIComponent(trimmed)}`, { replace: true })
  }

  return (
    <AuthShell title={t('registerTitle')} subtitle={t('registerNeedsReferral')}>
      <form className="space-y-4" onSubmit={onSubmit} data-testid="register-ref-gate">
        <div>
          <label className="lbl">کد معرف</label>
          <input
            className="input"
            dir="ltr"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError('') }}
            placeholder="REF-…"
            required
            data-testid="register-ref-code"
          />
        </div>
        {error && <div className="text-bad text-sm font-medium">{error}</div>}
        <button className="btn btn-primary w-full btn-lg" type="submit" data-testid="register-ref-continue">
          ادامه ثبت‌نام
        </button>
        <Link to="/login" className="block text-sm text-prim text-center font-bold hover:underline">{t('registerBack')}</Link>
      </form>
    </AuthShell>
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
    return <ReferralCodeGate />
  }

  if (shareFromLink && !referralFromLink && shareLoading) {
    return (
      <AuthShell title={t('registerTitle')} subtitle={t('registerCheckingLink')}>
        <div className="text-sm text-mute">{t('loading')}</div>
      </AuthShell>
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
      <AuthShell title={t('registerTitle')} subtitle={t('registerShareLocked')}>
        <div className="space-y-4">
          <StatusPanel icon={icon} tone={tone} title={title} message={message} />
          <Link to="/login" className="btn btn-primary w-full text-center">{t('registerBack')}</Link>
        </div>
      </AuthShell>
    )
  }

  if (shareFromLink && !referralFromLink && !shareLoading && !shareInfo) {
    return (
      <AuthShell title={t('registerTitle')} subtitle={t('registerShareLocked')}>
        <div className="space-y-4">
          <StatusPanel
            icon={<AlertTriangle className="w-5 h-5" />}
            tone="danger"
            title={t('shareLinkInvalid')}
            message={t('shareLinkInvalidHint')}
          />
          <Link to="/login" className="btn btn-primary w-full text-center">{t('registerBack')}</Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t('registerTitle')} subtitle={t('registerFormHint')}>
      {referralFromLink ? (
        <div className="rounded-xl border border-prim/25 bg-primsoft text-prim text-sm px-3 py-2 mb-4">
          {t('registerReferralLocked')}: <code className="font-bold">{referralFromLink}</code>
        </div>
      ) : (
        <div className="rounded-xl border border-ok/25 bg-oksoft text-ok text-sm px-3 py-2 mb-4 font-bold">
          {t('registerShareLocked')}
        </div>
      )}
      <form
        className="space-y-4"
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
        <div>
          <label className="lbl">{t('registerName')}</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="lbl">{t('loginMobile')}</label>
          <input className="input" dir="ltr" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
        </div>
        <div>
          <label className="lbl">{t('loginPassword')}</label>
          <input className="input" dir="ltr" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
        </div>
        <div>
          <label className="lbl">{t('passwordConfirm')}</label>
          <input className="input" dir="ltr" type="password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} required minLength={8} />
        </div>
        {error && <div className="text-bad text-sm font-medium">{error}</div>}
        <button className="btn btn-primary w-full btn-lg" type="submit" disabled={shareLoading}>{t('registerSubmit')}</button>
        <Link to="/login" className="block text-sm text-prim text-center font-bold hover:underline">{t('registerBack')}</Link>
      </form>
    </AuthShell>
  )
}
