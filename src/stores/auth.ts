import { create } from 'zustand'
import { authApi, type AuthUser } from '../lib/api'

type AuthState = {
  user: AuthUser | null
  loading: boolean
  setSession: (token: string, user: AuthUser) => void
  hydrate: () => Promise<void>
  switchRole: (slug: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setSession: (token, user) => {
    localStorage.setItem('finopal.token', token)
    set({ user, loading: false })
  },
  hydrate: async () => {
    const token = localStorage.getItem('finopal.token')
    if (!token) {
      set({ user: null, loading: false })
      return
    }
    try {
      const { data } = await authApi.me()
      set({ user: data, loading: false })
    } catch {
      localStorage.removeItem('finopal.token')
      set({ user: null, loading: false })
    }
  },
  switchRole: async (slug) => {
    const { data } = await authApi.switchRole(slug)
    set({ user: data })
  },
  logout: async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    localStorage.removeItem('finopal.token')
    set({ user: null })
  },
}))
