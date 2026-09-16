import { Moon, Network, Sun } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { authApi } from '../lib/api'
import { dashboardPath } from '../lib/roles'
import { useAuth } from '../stores/auth'

export function LoginPage() {
  const [mobile, setMobile] = useState('09125555555')
  const [password, setPassword] = useState('Password123!')
  const [error, setError] = useState('')
  const setSession = useAuth((s) => s.setSession)
  const navigate = useNavigate()
  const location = useLocation()
  const { t, darkMode, toggleDarkMode, toggleDirection } = useApp()
  const needsReferral = Boolean((location.state as { registerNeedsReferral?: boolean } | null)?.registerNeedsReferral)

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
          className="login-form grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            try {
              const { data } = await authApi.login(mobile, password)
              setSession(data.token, data.user)
              navigate(data.user.active_role?.slug === 'superuser' ? '/superuser' : dashboardPath(data.user.active_role?.slug))
            } catch (err: unknown) {
              const ax = err as { response?: { data?: { errors?: { mobile?: string[] } } }; code?: string }
              const msg = ax.response?.data?.errors?.mobile?.[0]
              if (!ax.response) {
                setError(t('loginOffline'))
              } else if (msg?.includes('مسدود')) {
                setError(t('loginBlocked'))
              } else {
                setError(t('loginError'))
              }
            }
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-surface-500">{t('loginSub')}</div>
              <h1 className="text-xl font-bold m-0 text-surface-800 dark:text-surface-100">{t('loginTitle')}</h1>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" data-testid="lang-toggle" className="btn btn-ghost text-xs px-2 py-1" onClick={toggleDirection}>{t('language')}</button>
              <button type="button" data-testid="theme-toggle" className="btn btn-ghost p-2" onClick={toggleDarkMode} aria-label={t('theme')}>
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className={`rounded-xl border text-sm px-3 py-2 ${needsReferral ? 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-100' : 'border-surface-200 bg-surface-50 text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300'}`}>
            {t('registerNeedsReferral')}
          </div>
          <label className="field">{t('loginMobile')}
            <input className="input" data-testid="login-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </label>
          <label className="field">{t('loginPassword')}
            <input className="input" data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div className="text-danger-500 text-sm">{error}</div>}
          <button className="btn btn-primary" data-testid="login-submit" type="submit">{t('loginSubmit')}</button>
        </form>
      </div>
    </div>
  )
}
