import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'
import { isImpersonationSession, readAuthToken, writeAuthToken } from '../lib/authToken'
import { dashboardPath } from '../lib/roles'
import { useAuth } from '../stores/auth'

const PENDING_KEY = 'finopal.impersonate.pending'

type Pending = { token: string; redirect: string }

function readPending(): Pending | null {
  const tokenFromSession = isImpersonationSession() ? readAuthToken() : null
  const params = new URLSearchParams(window.location.search)
  const redirectFromQuery = params.get('redirect') || ''

  if (tokenFromSession) {
    return { token: tokenFromSession, redirect: redirectFromQuery }
  }

  const rawHash = window.location.hash.replace(/^#/, '')
  if (rawHash) {
    const hashParams = new URLSearchParams(rawHash)
    const token = hashParams.get('token')
    if (token) {
      const pending = { token, redirect: hashParams.get('redirect') || redirectFromQuery }
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
      window.history.replaceState(null, '', '/impersonate')
      return pending
    }
  }

  const cached = sessionStorage.getItem(PENDING_KEY)
  if (cached) {
    try {
      return JSON.parse(cached) as Pending
    } catch {
      return null
    }
  }

  return null
}

/** Consumes an impersonation token into this tab's sessionStorage and opens the target panel. */
export function ImpersonatePage() {
  const navigate = useNavigate()
  const setSession = useAuth((s) => s.setSession)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const pending = readPending()
      if (!pending?.token) {
        setError('توکن ورود به پنل یافت نشد.')
        return
      }

      try {
        writeAuthToken(pending.token, 'impersonation')
        setSession(pending.token, {
          id: 0,
          name: '',
          mobile: '',
          is_superuser: false,
          roles: [],
          active_role: null,
          impersonating: true,
        }, { impersonating: true })
        const { data } = await authApi.me()
        if (cancelled) return
        sessionStorage.removeItem(PENDING_KEY)
        setSession(pending.token, { ...data, impersonating: true }, { impersonating: true })
        const dest = pending.redirect
          || (data.active_role?.slug === 'superuser' ? '/superuser' : dashboardPath(data.active_role?.slug))
        navigate(dest, { replace: true })
      } catch {
        if (!cancelled) setError('ورود به پنل کاربر ناموفق بود.')
      }
    }
    void run()
    return () => { cancelled = true }
  }, [navigate, setSession])

  return (
    <div className="min-h-screen flex items-center justify-center p-6" data-testid="impersonate-loading">
      <div className="text-center space-y-2">
        <div className="text-lg font-semibold text-ink">
          {error ?? 'در حال ورود بی‌سر و صدا به پنل کاربر...'}
        </div>
        {error && (
          <button type="button" className="btn btn-primary" onClick={() => navigate('/login', { replace: true })}>
            بازگشت
          </button>
        )}
      </div>
    </div>
  )
}
