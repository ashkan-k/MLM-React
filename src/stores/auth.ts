import { create } from 'zustand'
import { authApi, type AuthUser } from '../lib/api'
import { clearAuthToken, isImpersonationSession, readAuthToken, writeAuthToken } from '../lib/authToken'

type AuthState = {
  user: AuthUser | null
  loading: boolean
  setSession: (token: string, user: AuthUser, opts?: { impersonating?: boolean }) => void
  hydrate: () => Promise<void>
  switchRole: (slug: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setSession: (token, user, opts) => {
    writeAuthToken(token, opts?.impersonating ? 'impersonation' : 'normal')
    set({
      user: opts?.impersonating ? { ...user, impersonating: true } : user,
      loading: false,
    })
  },
  hydrate: async () => {
    const token = readAuthToken()
    if (!token) {
      set({ user: null, loading: false })
      return
    }
    try {
      const { data } = await authApi.me()
      const impersonating = Boolean(data.impersonating) || isImpersonationSession()
      set({ user: { ...data, impersonating }, loading: false })
    } catch {
      clearAuthToken()
      set({ user: null, loading: false })
    }
  },
  switchRole: async (slug) => {
    const { data } = await authApi.switchRole(slug)
    const impersonating = Boolean(data.impersonating) || isImpersonationSession()
    set({ user: { ...data, impersonating } })
  },
  logout: async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    clearAuthToken()
    set({ user: null })
  },
}))
