import { Bell, LogOut, MessagesSquare } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { dashboardPath, roleMeta } from '../lib/roles'
import { useAuth } from '../stores/auth'

const links = [
  { to: '', label: 'داشبورد', end: true },
  { to: 'team', label: 'سازمان و تیم' },
  { to: 'gateways', label: 'درگاه‌ها' },
  { to: 'commissions', label: 'پورسانت' },
  { to: 'wallet', label: 'کیف پول' },
  { to: 'finance', label: 'گزارش تجمیعی' },
  { to: 'withdrawals', label: 'برداشت' },
  { to: 'referrals', label: 'معرف و لینک اشتراکی' },
  { to: 'promotions', label: 'ارتقاء' },
  { to: 'training', label: 'آموزش' },
  { to: 'chat', label: 'گفتگو' },
  { to: 'notifications', label: 'اعلان‌ها' },
  { to: 'transfers', label: 'انتقال مزایا' },
]

export function AppShell() {
  const { user, switchRole, logout } = useAuth()
  const navigate = useNavigate()
  const active = user?.active_role

  return (
    <div className="min-h-svh grid lg:grid-cols-[260px_1fr]">
      <aside className="card m-3 p-4 h-fit lg:sticky lg:top-3">
        <div className="text-xs text-emerald-800 mb-1">سازمان فروش فاینوپال</div>
        <h1 className="text-lg font-extrabold mb-4">پنل {active?.name ?? 'کاربری'}</h1>
        <nav className="grid gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              end={link.end}
              to={link.to}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm ${isActive ? 'bg-emerald-700 text-white' : 'hover:bg-emerald-50'}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          {user?.is_superuser && (
            <NavLink to="/superuser" className="rounded-xl px-3 py-2 text-sm hover:bg-amber-50">پنل سوپریوزر</NavLink>
          )}
        </nav>
      </aside>
      <div className="p-3 lg:p-6">
        <header className="card px-4 py-3 mb-4 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <div className="font-bold">{user?.name}</div>
            <div className="text-sm text-[var(--muted)]">{user?.mobile}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              data-testid="role-switcher"
              className="input w-auto"
              value={active?.slug ?? ''}
              onChange={async (e) => {
                await switchRole(e.target.value)
                navigate(dashboardPath(e.target.value))
              }}
            >
              {user?.roles.filter((r) => r.is_active !== false).map((role) => (
                <option key={role.slug} value={role.slug}>{roleMeta[role.slug]?.title ?? role.name}</option>
              ))}
            </select>
            <NavLink to="notifications" className="btn btn-ghost" aria-label="notifications"><Bell size={16} /></NavLink>
            <NavLink to="chat" className="btn btn-ghost" aria-label="chat"><MessagesSquare size={16} /></NavLink>
            <button className="btn btn-ghost" onClick={async () => { await logout(); navigate('/login') }}>
              <LogOut size={16} /> خروج
            </button>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  )
}

export function SuperuserShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const items = [
    { to: '/superuser', label: 'آمار کل', end: true },
    { to: '/superuser/users', label: 'کاربران' },
    { to: '/superuser/permissions', label: 'دسترسی‌ها' },
    { to: '/superuser/rules', label: 'قواعد پورسانت' },
    { to: '/superuser/courses', label: 'دوره‌ها' },
    { to: '/superuser/settings', label: 'تنظیمات' },
    { to: '/superuser/audits', label: 'ممیزی' },
    { to: '/superuser/frasoft', label: 'فراسافت' },
  ]

  return (
    <div className="min-h-svh grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-[#1f2a24] text-white m-3 rounded-2xl p-4 h-fit">
        <div className="text-amber-300 text-xs mb-1">سوپریوزر</div>
        <h1 className="font-extrabold mb-4">ادمین فاینوپال</h1>
        <nav className="grid gap-1">
          {items.map((item) => (
            <NavLink key={item.to} end={item.end} to={item.to} className={({ isActive }) => `rounded-xl px-3 py-2 text-sm ${isActive ? 'bg-amber-400 text-black' : 'hover:bg-white/10'}`}>
              {item.label}
            </NavLink>
          ))}
          <NavLink to={dashboardPath(user?.roles.find((r) => r.slug !== 'superuser')?.slug ?? 'representative')} className="rounded-xl px-3 py-2 text-sm hover:bg-white/10">بازگشت به پنل نقش</NavLink>
        </nav>
      </aside>
      <div className="p-4">
        <header className="flex justify-between items-center mb-4">
          <div className="font-bold">{user?.name}</div>
          <button className="btn btn-ghost" onClick={async () => { await logout(); navigate('/login') }}>خروج</button>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
