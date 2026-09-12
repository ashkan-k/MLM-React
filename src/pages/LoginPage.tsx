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
    <div className="login-wrap">
      <form
        className="card w-full max-w-md p-7 grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setError('')
          try {
            const { data } = await authApi.login(mobile, password)
            setSession(data.token, data.user)
            navigate(data.user.active_role?.slug === 'superuser' ? '/superuser' : dashboardPath(data.user.active_role?.slug))
          } catch {
            setError('ورود ناموفق بود. موبایل یا رمز عبور را بررسی کنید.')
          }
        }}
      >
        <div className="flex items-center gap-3">
          <div className="brand-mark">ف</div>
          <div>
            <div className="text-xs text-[var(--muted)]">سازمان فروش فاینوپال</div>
            <h1 className="text-xl font-extrabold m-0">ورود به پنل</h1>
          </div>
        </div>
        <label className="field">شماره موبایل
          <input className="input" data-testid="login-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </label>
        <label className="field">رمز عبور
          <input className="input" data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="btn btn-primary" data-testid="login-submit" type="submit">ورود به حساب</button>
        <Link className="text-sm text-teal-800" to="/register">ثبت‌نام نماینده جدید با کد معرف</Link>
      </form>
    </div>
  )
}
