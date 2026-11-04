import { Eye, EyeOff, Moon, Percent, Sun, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { authApi } from '../lib/api'
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

export function LoginPage() {
  const [mobile, setMobile] = useState('09121111111')
  const [password, setPassword] = useState('Password123!')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setSession = useAuth((s) => s.setSession)
  const navigate = useNavigate()
  const location = useLocation()
  const { t, darkMode, toggleDarkMode, toggleDirection } = useApp()
  const state = location.state as { registerNeedsReferral?: boolean; from?: string } | null
  const needsReferral = Boolean(state?.registerNeedsReferral)
  const returnTo = typeof state?.from === 'string' && state.from.startsWith('/') ? state.from : null

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
          <h2 className="text-white text-3xl font-black leading-[1.5] m-0">
            {t('loginWelcome')}
          </h2>
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
        <p className="relative text-sidetx/60 text-[0.7rem] m-0">فاینوپال — سازمان فروش</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 bg-bg relative">
        <div className="absolute top-4 end-4 flex items-center gap-1">
          <button type="button" data-testid="lang-toggle" className="icon-btn" onClick={toggleDirection} aria-label={t('language')}>
            <span className="font-code text-[0.72rem] font-bold">{t('language')}</span>
          </button>
          <button type="button" data-testid="theme-toggle" className="icon-btn" onClick={toggleDarkMode} aria-label={t('theme')}>
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
        <div className="w-full max-w-[400px] anim-up">
          <h1 className="text-[1.65rem] font-black tracking-tight m-0 text-ink">{t('loginTitle')}</h1>
          <p className="text-sm text-mute mt-2 leading-6 mb-7">{t('loginSub')}</p>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              setError('')
              setLoading(true)
              try {
                const { data } = await authApi.login(mobile, password)
                setSession(data.token, data.user)
                if (returnTo) {
                  navigate(returnTo)
                  return
                }
                navigate(data.user.active_role?.slug === 'superuser' ? '/superuser' : dashboardPath(data.user.active_role?.slug))
              } catch (err: unknown) {
                const ax = err as { response?: { data?: { errors?: { mobile?: string[] } } } }
                const msg = ax.response?.data?.errors?.mobile?.[0]
                if (!ax.response) setError(t('loginOffline'))
                else if (msg?.includes('مسدود')) setError(t('loginBlocked'))
                else setError(t('loginError'))
              } finally {
                setLoading(false)
              }
            }}
          >
            {needsReferral && (
              <div className="rounded-xl border border-line bg-accsoft text-acc text-sm px-3 py-2 font-bold">
                {t('registerNeedsReferral')}
              </div>
            )}
            <div>
              <label className="lbl">{t('loginMobile')}</label>
              <input
                className="input"
                dir="ltr"
                data-testid="login-mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="lbl">{t('loginPassword')}</label>
              <div className="relative" dir="ltr">
                <input
                  className="input pe-10"
                  dir="ltr"
                  data-testid="login-password"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="absolute end-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink" onClick={() => setShow((s) => !s)} aria-label={show ? 'hide' : 'show'}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <div className="text-bad text-sm font-medium">{error}</div>}
            <button className="btn btn-primary w-full btn-lg" data-testid="login-submit" type="submit" disabled={loading}>
              {loading ? <span className="spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : null}
              {t('loginSubmit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
