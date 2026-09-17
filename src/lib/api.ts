import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('finopal.token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export type Role = { id: number; name: string; slug: string; hierarchy_level?: number; is_organizational?: boolean; is_active?: boolean }
export type AuthUser = {
  id: number
  name: string
  mobile: string
  email?: string | null
  avatar_url?: string | null
  is_superuser: boolean
  roles: Role[]
  active_role: { id: number; name: string; slug: string } | null
  permissions?: string[]
  features?: {
    shared_links?: {
      referral_enabled?: boolean
      gateway_sale_enabled?: boolean
    }
  }
}

export const authApi = {
  login: (mobile: string, password: string, role_slug?: string) =>
    api.post<{ token: string; user: AuthUser }>('/auth/login', { mobile, password, role_slug }),
  register: (payload: Record<string, string>) => api.post('/auth/register', payload),
  me: () => api.get<AuthUser>('/auth/me'),
  switchRole: (role_slug: string) => api.post<AuthUser>('/auth/switch-role', { role_slug }),
  logout: () => api.post('/auth/logout'),
}
