import { Moon, Network, Sun } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { authApi } from '../lib/api'
import { dashboardPath } from '../lib/roles'
import { useAuth } from '../stores/auth'

export function RegisterPage() {
  const [params] = useSearchParams()
  const referralFromLink = (params.get('ref') ?? '').trim()
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    password: 'Password123!',
    referral_code: referralFromLink,
  })
  const [error, setError] = useState('')
  const setSession = useAuth((s) => s.setSession)
  const navigate = useNavigate()
  const { t, darkMode, toggleDarkMode, toggleDirection } = useApp()

  if (!referralFromLink) {
    return <Navigate to="/login" replace state={{ registerNeedsReferral: true }} />
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
              const { data } = await authApi.register({ ...form, referral_code: referralFromLink })
              setSession(data.token, data.user)
              navigate(dashboardPath(data.user.active_role?.slug))
            } catch (err) {
              const message = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
              setError(message?.errors?.referral_code?.[0] || message?.message || t('registerError'))
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
          <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 text-sm text-primary-800 dark:text-primary-200 px-3 py-2">
            {t('registerReferralLocked')}: <code className="font-bold">{referralFromLink}</code>
          </div>
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
          <button className="btn btn-primary" type="submit">{t('registerSubmit')}</button>
          <Link to="/login" className="text-sm text-primary-600">{t('registerBack')}</Link>
        </form>
      </div>
    </div>
  )
}
