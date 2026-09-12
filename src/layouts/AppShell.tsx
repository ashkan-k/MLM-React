import {
  Bell,
  BookOpen,
  Building2,
  CreditCard,
  FileBarChart,
  GitBranch,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  PieChart,
  ScrollText,
  Repeat,
  Settings,
  Shield,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { dashboardPath, roleMeta } from '../lib/roles'
import { useAuth } from '../stores/auth'

const roleLinks = [
  { to: '', label: 'داشبورد', icon: LayoutDashboard, end: true },
  { to: 'team', label: 'سازمان و تیم', icon: GitBranch },
  { to: 'gateways', label: 'درگاه‌ها', icon: CreditCard },
  { to: 'commissions', label: 'پورسانت', icon: TrendingUp },
  { to: 'wallet', label: 'کیف پول', icon: Wallet },
  { to: 'finance', label: 'گزارش تجمیعی', icon: PieChart },
  { to: 'withdrawals', label: 'برداشت', icon: Repeat },
  { to: 'referrals', label: 'معرف و لینک اشتراکی', icon: Users },
  { to: 'promotions', label: 'ارتقاء', icon: Building2 },
  { to: 'training', label: 'آموزش', icon: BookOpen },
  { to: 'chat', label: 'گفتگو', icon: MessagesSquare },
  { to: 'notifications', label: 'اعلان‌ها', icon: Bell },
  { to: 'transfers', label: 'انتقال مزایا', icon: Shield },
]

const adminLinks = [
  { to: '/superuser', label: 'آمار کل', icon: LayoutDashboard, end: true },
  { to: '/superuser/reports', label: 'گزارشات', icon: FileBarChart },
  { to: '/superuser/users', label: 'کاربران', icon: Users },
  { to: '/superuser/permissions', label: 'دسترسی‌ها', icon: Shield },
  { to: '/superuser/rules', label: 'قواعد پورسانت', icon: TrendingUp },
  { to: '/superuser/courses', label: 'دوره‌ها', icon: BookOpen },
  { to: '/superuser/settings', label: 'تنظیمات', icon: Settings },
  { to: '/superuser/audits', label: 'رویدادها', icon: ScrollText },
  { to: '/superuser/frasoft', label: 'فراسافت', icon: Repeat },
]

function Side({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <aside className="sidebar">
      <div className="flex items-center gap-3 mb-7">
        <div className="brand-mark">ف</div>
        <div>
          <div className="text-xs text-teal-300">{hint}</div>
          <div className="font-extrabold">{title}</div>
        </div>
      </div>
      <nav className="grid gap-1">{children}</nav>
    </aside>
  )
}

export function AppShell() {
  const { user, switchRole, logout } = useAuth()
  const navigate = useNavigate()
  const active = user?.active_role

  return (
    <div className="shell">
      <Side title={`پنل ${active?.name ?? 'نقش'}`} hint="سازمان فروش فاینوپال">
        {roleLinks.map((link) => (
          <NavLink key={link.to} end={link.end} to={link.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <link.icon size={16} /> {link.label}
          </NavLink>
        ))}
        {user?.is_superuser && (
          <NavLink to="/superuser" className="nav-link"><Shield size={16} /> پنل سوپریوزر</NavLink>
        )}
      </Side>
      <div>
        <header className="topbar">
          <div>
            <div className="font-bold">{user?.name}</div>
            <div className="text-xs text-[var(--muted)]">شناسه حساب {user?.id} · {user?.mobile}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              data-testid="role-switcher"
              className="input w-auto min-w-44"
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
            <NavLink to="notifications" className="btn btn-ghost" aria-label="اعلان‌ها"><Bell size={16} /></NavLink>
            <NavLink to="chat" className="btn btn-ghost" aria-label="گفتگو"><MessagesSquare size={16} /></NavLink>
            <button className="btn btn-ghost" onClick={async () => { await logout(); navigate('/login') }}>
              <LogOut size={16} /> خروج
            </button>
          </div>
        </header>
        <main className="page"><Outlet /></main>
      </div>
    </div>
  )
}

export function SuperuserShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const back = dashboardPath(user?.roles.find((r) => r.slug !== 'superuser')?.slug ?? 'representative')

  return (
    <div className="shell">
      <Side title="مدیریت کل سایت" hint="سوپریوزر فاینوپال">
        {adminLinks.map((item) => (
          <NavLink key={item.to} end={item.end} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <item.icon size={16} /> {item.label}
          </NavLink>
        ))}
        <NavLink to={back} className="nav-link">بازگشت به پنل نقش</NavLink>
      </Side>
      <div>
        <header className="topbar">
          <div>
            <div className="font-bold">{user?.name}</div>
            <div className="text-xs text-[var(--muted)]">دسترسی کامل مدیریت سامانه</div>
          </div>
          <button className="btn btn-ghost" onClick={async () => { await logout(); navigate('/login') }}>خروج</button>
        </header>
        <main className="page"><Outlet /></main>
      </div>
    </div>
  )
}
