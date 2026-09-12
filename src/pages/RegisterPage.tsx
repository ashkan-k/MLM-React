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
  const setSession = useAuth((s) => s.setSession)
  const navigate = useNavigate()

  return (
    <div className="min-h-svh grid place-items-center p-4">
      <form
        className="card w-full max-w-md p-6 grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault()
          const { data } = await authApi.register(form)
          setSession(data.token, data.user)
          navigate(dashboardPath(data.user.active_role?.slug))
        }}
      >
        <h1 className="text-2xl font-extrabold">ثبت‌نام نماینده</h1>
        {Object.entries({ name: 'نام', mobile: 'موبایل', password: 'رمز', referral_code: 'کد معرف' }).map(([key, label]) => (
          <label key={key} className="grid gap-1 text-sm">{label}
            <input className="input" type={key === 'password' ? 'password' : 'text'} value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
          </label>
        ))}
        <button className="btn btn-primary" type="submit">ایجاد حساب</button>
        <Link to="/login" className="text-sm">بازگشت به ورود</Link>
      </form>
    </div>
  )
}
