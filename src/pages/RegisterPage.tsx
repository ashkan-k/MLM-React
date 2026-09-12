import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../lib/api'
import { dashboardPath } from '../lib/roles'
import { useAuth } from '../stores/auth'

export function RegisterPage() {
  const [params] = useSearchParams()
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    password: 'Password123!',
    referral_code: params.get('ref') ?? '',
  })
  const [error, setError] = useState('')
  const setSession = useAuth((s) => s.setSession)
  const navigate = useNavigate()

  return (
    <div className="login-wrap">
      <form
        className="card w-full max-w-md p-7 grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setError('')
          try {
            const { data } = await authApi.register(form)
            setSession(data.token, data.user)
            navigate(dashboardPath(data.user.active_role?.slug))
          } catch {
            setError('ثبت‌نام انجام نشد. موبایل تکراری یا اطلاعات ناقص است.')
          }
        }}
      >
        <h1 className="text-xl font-extrabold">ثبت‌نام نماینده</h1>
        <label className="field">نام و نام خانوادگی
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label className="field">شماره موبایل
          <input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
        </label>
        <label className="field">رمز عبور
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <label className="field">کد معرف (اختیاری)
          <input className="input" value={form.referral_code} onChange={(e) => setForm({ ...form, referral_code: e.target.value })} />
        </label>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="btn btn-primary" type="submit">ایجاد حساب نمایندگی</button>
        <Link to="/login" className="text-sm">بازگشت به ورود</Link>
      </form>
    </div>
  )
}
