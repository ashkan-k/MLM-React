import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../lib/api'
import { dashboardPath } from '../lib/roles'
import { useAuth } from '../stores/auth'

export function LoginPage() {
  const [mobile, setMobile] = useState('09125555555')
  const [password, setPassword] = useState('Password123!')
  const [error, setError] = useState('')
  const setSession = useAuth((s) => s.setSession)
  const navigate = useNavigate()

  return (
    <div className="min-h-svh grid place-items-center p-4">
      <form
        className="card w-full max-w-md p-6 grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setError('')
          try {
            const { data } = await authApi.login(mobile, password)
            setSession(data.token, data.user)
            navigate(data.user.is_superuser && !data.user.active_role?.slug?.includes('manager') && data.user.active_role?.slug === 'superuser'
              ? '/superuser'
              : dashboardPath(data.user.active_role?.slug))
          } catch {
            setError('ورود ناموفق بود. موبایل یا رمز را بررسی کنید.')
          }
        }}
      >
        <h1 className="text-2xl font-extrabold">ورود به سازمان فروش</h1>
        <p className="text-sm text-[var(--muted)]">پنل نمایندگان، مدیران و سوپریوزر فاینوپال</p>
        <label className="grid gap-1 text-sm">موبایل
          <input className="input" data-testid="login-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">رمز عبور
          <input className="input" data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="text-red-700 text-sm">{error}</div>}
        <button className="btn btn-primary" data-testid="login-submit" type="submit">ورود</button>
        <Link className="text-sm text-emerald-800" to="/register">ثبت‌نام نماینده جدید</Link>
      </form>
    </div>
  )
}
