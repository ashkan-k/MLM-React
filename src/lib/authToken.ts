const TOKEN_KEY = 'finopal.token'
const IMPERSONATE_FLAG = 'finopal.impersonating'

/** Prefer tab-local impersonation token so the superuser tab keeps its own session. */
export function readAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY)
}

export function isImpersonationSession(): boolean {
  return sessionStorage.getItem(IMPERSONATE_FLAG) === '1'
}

export function writeAuthToken(token: string, mode: 'normal' | 'impersonation' = 'normal') {
  if (mode === 'impersonation') {
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(IMPERSONATE_FLAG, '1')
    return
  }
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(IMPERSONATE_FLAG)
  localStorage.setItem(TOKEN_KEY, token)
}

/** Clears only the active session for this tab (impersonation uses sessionStorage). */
export function clearAuthToken(): 'impersonation' | 'normal' {
  if (isImpersonationSession() || sessionStorage.getItem(TOKEN_KEY)) {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(IMPERSONATE_FLAG)
    return 'impersonation'
  }
  localStorage.removeItem(TOKEN_KEY)
  return 'normal'
}
