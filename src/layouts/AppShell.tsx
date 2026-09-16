import {
  Award,
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileBarChart,
  GitBranch,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Moon,
  Network,
  PieChart,
  Repeat,
  ScrollText,
  Settings,
  Shield,
  Sun,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { canAccessPage } from '../lib/access'
import { roleLabel } from '../lib/i18n'
import { dashboardPath } from '../lib/roles'
import { useAuth } from '../stores/auth'

type LinkItem = { to: string; labelKey: string; icon: typeof LayoutDashboard; end?: boolean }
type NavGroup = { key: string; items: LinkItem[] }

const roleGroups: NavGroup[] = [
  { key: 'navMain', items: [{ to: '', labelKey: 'navDashboard', icon: LayoutDashboard, end: true }] },
  { key: 'navOrg', items: [
    { to: 'team', labelKey: 'navTeam', icon: GitBranch },
    { to: 'org-managers', labelKey: 'navOrgManagers', icon: Users },
  ] },
  {
    key: 'navSales',
    items: [
      { to: 'gateways', labelKey: 'navGateways', icon: CreditCard },
      { to: 'commissions', labelKey: 'navCommissions', icon: TrendingUp },
    ],
  },
  {
    key: 'navFinance',
    items: [
      { to: 'wallet', labelKey: 'navWallet', icon: Wallet },
      { to: 'finance', labelKey: 'navFinanceReport', icon: PieChart },
      { to: 'withdrawals', labelKey: 'navWithdrawals', icon: Repeat },
      { to: 'transfers', labelKey: 'navTransfers', icon: Shield },
    ],
  },
  {
    key: 'navGrowth',
    items: [
      { to: 'referrals', labelKey: 'navReferrals', icon: Users },
      { to: 'promotions', labelKey: 'navPromotions', icon: Award },
      { to: 'training', labelKey: 'navTraining', icon: BookOpen },
      { to: 'courses', labelKey: 'navCoursesManage', icon: BookOpen },
    ],
  },
  {
    key: 'navComm',
    items: [
      { to: 'chat', labelKey: 'navChat', icon: MessagesSquare },
      { to: 'notifications', labelKey: 'navNotifications', icon: Bell },
    ],
  },
]

const adminGroups: NavGroup[] = [
  {
    key: 'navMain',
    items: [
      { to: '/superuser', labelKey: 'navStats', icon: LayoutDashboard, end: true },
      { to: '/superuser/reports', labelKey: 'navReports', icon: FileBarChart },
    ],
  },
  {
    key: 'navUsers',
    items: [
      { to: '/superuser/users', labelKey: 'navUsersPage', icon: Users },
      { to: '/superuser/network', labelKey: 'navNetwork', icon: GitBranch },
      { to: '/superuser/org-managers', labelKey: 'navOrgManagers', icon: Building2 },
      { to: '/superuser/permissions', labelKey: 'navPermissions', icon: Shield },
      { to: '/superuser/gateways', labelKey: 'navGateways', icon: CreditCard },
    ],
  },
  {
    key: 'navMlm',
    items: [
      { to: '/superuser/rules', labelKey: 'navRules', icon: TrendingUp },
      { to: '/superuser/courses', labelKey: 'navCourses', icon: BookOpen },
    ],
  },
  {
    key: 'navSystem',
    items: [
      { to: '/superuser/chat', labelKey: 'navChat', icon: MessagesSquare },
      { to: '/superuser/settings', labelKey: 'navSettings', icon: Settings },
      { to: '/superuser/audits', labelKey: 'navAudits', icon: ScrollText },
      { to: '/superuser/frasoft', labelKey: 'navFrasoft', icon: Repeat },
    ],
  },
]

const titleKeys: Record<string, string> = {
  '': 'titleDashboard',
  team: 'navTeam',
  'org-managers': 'navOrgManagers',
  gateways: 'navGateways',
  commissions: 'navCommissions',
  wallet: 'navWallet',
  finance: 'navFinanceReport',
  withdrawals: 'navWithdrawals',
  referrals: 'navReferrals',
  promotions: 'navPromotions',
  training: 'navTraining',
  courses: 'navCoursesManage',
  chat: 'navChat',
  notifications: 'navNotifications',
  transfers: 'navTransfers',
  '/superuser': 'navStats',
  '/superuser/reports': 'navReports',
  '/superuser/users': 'navUsersPage',
  '/superuser/network': 'navNetwork',
  '/superuser/org-managers': 'navOrgManagers',
  '/superuser/permissions': 'navPermissions',
  '/superuser/gateways': 'navGateways',
  '/superuser/rules': 'navRules',
  '/superuser/courses': 'navCourses',
  '/superuser/chat': 'navChat',
  '/superuser/notifications': 'navNotifications',
  '/superuser/settings': 'navSettings',
  '/superuser/audits': 'navAudits',
  '/superuser/frasoft': 'navFrasoft',
}

function itemActive(item: LinkItem, pathname: string) {
  if (item.to.startsWith('/')) {
    if (item.end) return pathname === item.to
    return pathname === item.to || pathname.startsWith(`${item.to}/`)
  }
  const segs = pathname.split('/').filter(Boolean)
  if (item.end) return segs.length === 2 && segs[0] === 'dashboard'
  return segs[segs.length - 1] === item.to
}

function SidebarNav({ groups, extra }: { groups: NavGroup[]; extra?: ReactNode }) {
  const { sidebarCollapsed, toggleSidebarCollapsed, sidebarOpen, setSidebarOpen, direction, t } = useApp()
  const user = useAuth((s) => s.user)
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState<string[]>([])
  const ChevronIcon = direction === 'rtl' ? (sidebarCollapsed ? ChevronLeft : ChevronRight) : (sidebarCollapsed ? ChevronRight : ChevronLeft)
  const visibleGroups = useMemo(
    () => groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.to === 'org-managers' && user?.active_role?.slug !== 'senior_manager') return false
          return canAccessPage(user, item.to.startsWith('/') ? item.to : item.to)
        }),
      }))
      .filter((group) => group.items.length > 0),
    [groups, user],
  )

  useEffect(() => {
    const active = visibleGroups.filter((g) => g.items.some((item) => itemActive(item, location.pathname))).map((g) => g.key)
    setOpenGroups(active)
  }, [location.pathname, visibleGroups])

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`
        fixed top-0 ${direction === 'rtl' ? 'right-0' : 'left-0'} h-full z-50
        bg-white dark:bg-surface-900 border-s border-surface-200 dark:border-surface-700
        transition-all duration-300
        ${sidebarOpen ? 'translate-x-0' : (direction === 'rtl' ? 'translate-x-full' : '-translate-x-full')}
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarCollapsed ? 'w-[68px]' : 'w-64'}
        flex flex-col
      `}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-surface-200 dark:border-surface-700">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <Network className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm text-surface-800 dark:text-surface-100">{t('brand')}</div>
                <div className="text-[10px] text-surface-400">{t('brandSub')}</div>
              </div>
            </div>
          )}
          <button type="button" onClick={toggleSidebarCollapsed} className="hidden lg:flex p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500">
            <ChevronIcon className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {visibleGroups.map((group) => (
            <div key={group.key} className="mb-1">
              {!sidebarCollapsed && (
                <button type="button" onClick={() => setOpenGroups((prev) => prev.includes(group.key) ? prev.filter((g) => g !== group.key) : [...prev, group.key])} className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-surface-400 uppercase">
                  <span>{t(group.key)}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${openGroups.includes(group.key) ? 'rotate-180' : ''}`} />
                </button>
              )}
              {(sidebarCollapsed || openGroups.includes(group.key)) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to + item.labelKey}
                      end={item.end}
                      to={item.to}
                      onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
                      className={({ isActive }) => `nav-link w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive ? 'active bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium' : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'} ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{t(item.labelKey)}</span>}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
          {extra}
        </nav>
      </aside>
    </>
  )
}

function BadgeCount({ count }: { count?: number }) {
  if (!count) return null
  return <span className="absolute -top-1 -end-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center">{count > 99 ? '99+' : count}</span>
}

function HeaderIcons({ panel }: { panel: 'role' | 'admin' }) {
  const { t } = useApp()
  const { data: notif } = useQuery({ queryKey: ['notif-unread'], queryFn: async () => (await api.get('/notifications/unread-count')).data, refetchInterval: 20_000 })
  const { data: chat } = useQuery({ queryKey: ['chat-unread'], queryFn: async () => (await api.get('/conversations/unread-count')).data, refetchInterval: 20_000 })
  return (
    <>
      <NavLink to={panel === 'admin' ? '/superuser/chat' : 'chat'} className="relative p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500" aria-label={t('navChat')}>
        <MessagesSquare className="w-4 h-4" />
        <BadgeCount count={Number(chat?.unread ?? 0)} />
      </NavLink>
      <NavLink to={panel === 'admin' ? '/superuser/notifications' : 'notifications'} className="relative p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500" aria-label={t('navNotifications')}>
        <Bell className="w-4 h-4" />
        <BadgeCount count={Number(notif?.unread ?? 0)} />
      </NavLink>
    </>
  )
}

function ShellTopbar({ title, panel }: { title: string; panel: 'role' | 'admin' }) {
  const { user, switchRole, logout } = useAuth()
  const { darkMode, toggleDarkMode, toggleDirection, setSidebarOpen, t, locale } = useApp()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const active = user?.active_role

  return (
    <header className="h-16 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500">
          <Menu className="w-5 h-5" />
        </button>
        <nav className="hidden md:flex items-center gap-2 text-sm">
          <span className="text-surface-400">{t('home')}</span>
          <span className="text-surface-300">/</span>
          <span className="text-surface-800 dark:text-surface-200 font-medium">{title}</span>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {panel === 'role' && active && (
          <select
            data-testid="role-switcher"
            className="input w-auto min-w-40 py-1.5"
            value={active.slug}
            onChange={async (e) => {
              await switchRole(e.target.value)
              navigate(dashboardPath(e.target.value))
            }}
          >
            {user?.roles.filter((r) => r.is_active !== false).map((role) => (
              <option key={role.slug} value={role.slug}>{roleLabel(role.slug, locale)}</option>
            ))}
          </select>
        )}
        <button type="button" data-testid="lang-toggle" onClick={toggleDirection} className="px-2.5 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300 text-xs font-semibold" title={t('dir')}>
          <span className="inline-flex items-center gap-1"><Globe className="w-4 h-4" />{t('language')}</span>
        </button>
        <button type="button" data-testid="theme-toggle" onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500" title={t('theme')}>
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <HeaderIcons panel={panel} />
        <div className="relative">
          <button type="button" onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-white" />}
            </div>
            <div className="hidden md:block text-start">
              <div className="text-xs font-medium text-surface-700 dark:text-surface-300">{user?.name}</div>
              <div className="text-[10px] text-surface-400">{t('id')} {user?.id} · {user?.mobile}</div>
            </div>
          </button>
          {menu && (
            <div className="absolute top-full mt-2 end-0 w-56 bg-white dark:bg-surface-800 rounded-xl shadow-lg border border-surface-200 dark:border-surface-700 p-1.5 z-40">
              <button type="button" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger-500 hover:bg-danger-500/10" onClick={async () => { await logout(); navigate('/login') }}>
                <LogOut className="w-4 h-4" /> {t('logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function currentTitle(pathname: string, t: (key: string) => string, fallback: string) {
  if (/^\/dashboard\/[^/]+$/.test(pathname)) return t('titleDashboard')
  if (titleKeys[pathname]) return t(titleKeys[pathname])
  if (pathname.match(/^\/superuser\/audits\/\d+$/)) return t('titleAuditDetail')
  const last = pathname.split('/').filter(Boolean).pop() ?? ''
  if (titleKeys[last]) return t(titleKeys[last])
  return fallback
}

export function AppShell() {
  const { user } = useAuth()
  const { t } = useApp()
  const location = useLocation()
  const extra = user?.is_superuser ? (
    <NavLink to="/superuser" className="nav-link w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20">
      <Building2 className="w-4 h-4" /> <span>{t('navSuperuser')}</span>
    </NavLink>
  ) : null

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950">
      <SidebarNav groups={roleGroups} extra={extra} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ShellTopbar panel="role" title={currentTitle(location.pathname, t, `${t('titleDashboard')} ${roleLabel(user?.active_role?.slug)}`)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fadeIn"><Outlet /></main>
      </div>
    </div>
  )
}

export function SuperuserShell() {
  const { user } = useAuth()
  const { t } = useApp()
  const location = useLocation()
  const back = dashboardPath(user?.roles.find((r) => r.slug !== 'superuser')?.slug ?? 'representative')

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950">
      <SidebarNav
        groups={adminGroups}
        extra={<NavLink to={back} className="nav-link w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">{t('navBackRole')}</NavLink>}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ShellTopbar panel="admin" title={currentTitle(location.pathname, t, t('titleAdmin'))} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fadeIn"><Outlet /></main>
      </div>
    </div>
  )
}
