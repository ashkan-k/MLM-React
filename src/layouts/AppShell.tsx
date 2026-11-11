import {
  Award,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ListTodo,
  ChevronDown,
  CreditCard,
  FileBarChart,
  GitBranch,
  LayoutDashboard,
  KeyRound,
  LogOut,
  Menu,
  MessageSquare,
  MessagesSquare,
  Moon,
  Package,
  PieChart,
  Repeat,
  ScrollText,
  Settings,
  Shield,
  Sun,
  Target,
  TrendingUp,
  User,
  Users,
  Wallet,
  Crosshair,
  Eye,
  UserCog,
  X,
  Search,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChangePasswordModal } from '../components/ChangePasswordModal'
import { Avatar, Kbd, Menu as DropMenu } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { canAccessGoalsBank, canAccessPage } from '../lib/access'
import { roleLabel } from '../lib/i18n'
import { productNavKey, useProductOriented } from '../lib/productMode'
import { dashboardPath } from '../lib/roles'
import { useAuth } from '../stores/auth'

type LinkItem = { to: string; labelKey: string; icon: typeof LayoutDashboard; end?: boolean }
type NavGroup = { key: string; items: LinkItem[]; standalone?: boolean }

const roleGroups: NavGroup[] = [
  { key: 'navDashboard', standalone: true, items: [{ to: '', labelKey: 'navDashboard', icon: LayoutDashboard, end: true }] },
  { key: 'navCrm', items: [
    { to: 'crm/activities', labelKey: 'navCrmActivities', icon: CalendarDays },
    { to: 'crm/tasks', labelKey: 'navCrmTasks', icon: ListTodo },
  ] },
  { key: 'navReportsStandalone', standalone: true, items: [{ to: 'reports', labelKey: 'navReports', icon: FileBarChart }] },
  { key: 'navOrg', items: [
    { to: 'team', labelKey: 'navTeam', icon: GitBranch },
    { to: 'org-managers', labelKey: 'navOrgManagers', icon: Users },
  ] },
  {
    key: 'navSales',
    items: [
      { to: 'gateways', labelKey: 'navGateways', icon: CreditCard },
      { to: 'transactions', labelKey: 'navTransactions', icon: Repeat },
      { to: 'commissions', labelKey: 'navCommissions', icon: TrendingUp },
      { to: 'monthly-bonus', labelKey: 'navMonthlyBonus', icon: Award },
      { to: 'points', labelKey: 'navPoints', icon: Target },
      { to: 'bonus-default', labelKey: 'navBonusDefault', icon: Award },
    ],
  },
  {
    key: 'navGoalsBankGroup',
    items: [
      { to: 'goals-bank', labelKey: 'navGoalsBankList', icon: Crosshair },
      { to: 'goals-access', labelKey: 'navGoalsAccess', icon: UserCog },
      { to: 'goals-monitor', labelKey: 'navGoalsMonitor', icon: Eye },
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
    key: 'navDashboard',
    standalone: true,
    items: [
      { to: '/superuser', labelKey: 'navStats', icon: LayoutDashboard, end: true },
    ],
  },
  {
    key: 'navCrm',
    items: [
      { to: '/superuser/crm/activities', labelKey: 'navCrmActivities', icon: CalendarDays },
      { to: '/superuser/crm/tasks', labelKey: 'navCrmTasks', icon: ListTodo },
    ],
  },
  {
    key: 'navMain',
    items: [
      { to: '/superuser/reports', labelKey: 'navReports', icon: FileBarChart },
      { to: '/superuser/transactions', labelKey: 'navTransactions', icon: Repeat },
      { to: '/superuser/commissions', labelKey: 'navCommissions', icon: TrendingUp },
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
      { to: '/superuser/points', labelKey: 'navPoints', icon: Target },
      { to: '/superuser/bonus-default', labelKey: 'navBonusDefault', icon: Award },
    ],
  },
  {
    key: 'navGoalsBankGroup',
    items: [
      { to: '/superuser/goals-bank', labelKey: 'navGoalsBankList', icon: Crosshair },
      { to: '/superuser/goals-access', labelKey: 'navGoalsAccess', icon: UserCog },
      { to: '/superuser/goals-monitor', labelKey: 'navGoalsMonitor', icon: Eye },
    ],
  },
  {
    key: 'navMlm',
    items: [
      { to: '/superuser/rules', labelKey: 'navRules', icon: TrendingUp },
      { to: '/superuser/org-criteria', labelKey: 'navOrgCriteria', icon: Award },
      { to: '/superuser/courses', labelKey: 'navCourses', icon: BookOpen },
    ],
  },
  {
    key: 'navSystem',
    items: [
      { to: '/superuser/chat', labelKey: 'navChat', icon: MessagesSquare },
      { to: '/superuser/products', labelKey: 'navProducts', icon: Package },
      { to: '/superuser/settings', labelKey: 'navSettings', icon: Settings },
      { to: '/superuser/audits', labelKey: 'navAudits', icon: ScrollText },
      { to: '/superuser/sms', labelKey: 'navSmsDebug', icon: MessageSquare },
      { to: '/superuser/queues', labelKey: 'navQueueDebug', icon: ListTodo },
      { to: '/superuser/frasoft', labelKey: 'navFrasoft', icon: Repeat },
    ],
  },
]

const titleKeys: Record<string, string> = {
  '': 'titleDashboard',
  team: 'navTeam',
  'org-managers': 'navOrgManagers',
  gateways: 'navGateways',
  transactions: 'navTransactions',
  commissions: 'navCommissions',
  'monthly-bonus': 'navMonthlyBonus',
  points: 'navPoints',
  'bonus-default': 'navBonusDefault',
  'goals-bank': 'navGoalsBankList',
  'goals-access': 'navGoalsAccess',
  'goals-monitor': 'navGoalsMonitor',
  wallet: 'navWallet',
  finance: 'navFinanceReport',
  withdrawals: 'navWithdrawals',
  referrals: 'navReferrals',
  promotions: 'navPromotions',
  training: 'navTraining',
  courses: 'navCoursesManage',
  chat: 'navChat',
  notifications: 'navNotifications',
  crm: 'navCrm',
  activities: 'navCrmActivities',
  tasks: 'navCrmTasks',
  transfers: 'navTransfers',
  reports: 'navReports',
  '/superuser': 'navStats',
  '/superuser/crm': 'navCrm',
  '/superuser/crm/activities': 'navCrmActivities',
  '/superuser/crm/tasks': 'navCrmTasks',
  '/superuser/reports': 'navReports',
  '/superuser/transactions': 'navTransactions',
  '/superuser/users': 'navUsersPage',
  '/superuser/network': 'navNetwork',
  '/superuser/org-managers': 'navOrgManagers',
  '/superuser/permissions': 'navPermissions',
  '/superuser/gateways': 'navGateways',
  '/superuser/commissions': 'navCommissions',
  '/superuser/points': 'navPoints',
  '/superuser/bonus-default': 'navBonusDefault',
  '/superuser/goals-bank': 'navGoalsBankList',
  '/superuser/goals-access': 'navGoalsAccess',
  '/superuser/goals-monitor': 'navGoalsMonitor',
  '/superuser/rules': 'navRules',
  '/superuser/org-criteria': 'navOrgCriteria',
  '/superuser/courses': 'navCourses',
  '/superuser/chat': 'navChat',
  '/superuser/notifications': 'navNotifications',
  '/superuser/products': 'navProducts',
  '/superuser/settings': 'navSettings',
  '/superuser/audits': 'navAudits',
  '/superuser/sms': 'navSmsDebug',
  '/superuser/queues': 'navQueueDebug',
  '/superuser/frasoft': 'navFrasoft',
}

function itemActive(item: LinkItem, pathname: string) {
  if (item.to.startsWith('/')) {
    if (item.end) return pathname === item.to
    return pathname === item.to || pathname.startsWith(`${item.to}/`)
  }
  const segs = pathname.split('/').filter(Boolean)
  if (item.end) return segs.length === 2 && segs[0] === 'dashboard'
  return item.to !== '' && (pathname.endsWith(`/${item.to}`) || pathname.includes(`/${item.to}/`))
}

function BrandLogo({ compact }: { compact?: boolean }) {
  const { t } = useApp()
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="w-9 h-9 rounded-xl bg-side2 border border-white/10 flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="8" r="3.4" fill="#f2b84b" />
          <circle cx="7" cy="23" r="3.4" fill="#2cb98f" />
          <circle cx="25" cy="23" r="3.4" fill="#2cb98f" />
          <path d="M16 11.5v3.5m0 0l-6.5 5.5M16 15l6.5 5.5" stroke="#9db3a7" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[0.98rem] font-black text-white tracking-tight">{t('brand')}</span>
          <span className="block text-[0.62rem] font-medium text-sidetx">{t('brandSub')}</span>
        </span>
      )}
    </div>
  )
}

function filterGroups(groups: NavGroup[], user: ReturnType<typeof useAuth.getState>['user'], productOriented: boolean) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => {
          const goalsPath = item.to === 'goals-bank' || item.to === '/superuser/goals-bank'
            || item.to === 'goals-access' || item.to === '/superuser/goals-access'
            || item.to === 'goals-monitor' || item.to === '/superuser/goals-monitor'
          if (goalsPath) {
            if (!canAccessGoalsBank(user)) return false
            const managerOnly = item.to.includes('goals-access') || item.to.includes('goals-monitor')
            if (managerOnly) {
              return user?.active_role?.slug === 'senior_manager' || user?.active_role?.slug === 'superuser'
            }
            return true
          }
          return canAccessPage(user, item.to)
        })
        .map((item) => (
          item.to === 'gateways' || item.to === '/superuser/gateways'
            ? { ...item, labelKey: productNavKey(productOriented) }
            : item
        )),
    }))
    .filter((group) => group.items.length > 0)
}

function SideNav({
  groups,
  collapsed,
  onNavigate,
  extra,
}: {
  groups: NavGroup[]
  collapsed?: boolean
  onNavigate?: () => void
  extra?: ReactNode
}) {
  const { t } = useApp()
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const next: Record<string, boolean> = {}
    for (const g of groups) {
      next[g.key] = g.standalone || g.items.some((item) => itemActive(item, location.pathname))
    }
    setOpenGroups((prev) => {
      const merged = { ...prev }
      for (const [k, v] of Object.entries(next)) {
        if (v) merged[k] = true
        else if (merged[k] === undefined) merged[k] = true
      }
      return merged
    })
  }, [location.pathname, groups])

  if (collapsed) {
    return (
      <nav className="flex-1 overflow-y-auto py-2 scroll-slim">
        {groups.flatMap((g) => g.items).map((item) => (
          <NavLink
            key={item.to + item.labelKey}
            end={item.end}
            to={item.to}
            title={t(item.labelKey)}
            onClick={onNavigate}
            className={({ isActive }) => `nav-item !justify-center !mx-2 !px-0 ${isActive ? 'nav-item-active' : ''}`}
          >
            <item.icon size={18} />
          </NavLink>
        ))}
        {extra}
      </nav>
    )
  }

  return (
    <nav className="flex-1 overflow-y-auto py-2 scroll-slim">
      {groups.map((group) => {
        const gOpen = openGroups[group.key] !== false
        const groupActive = group.items.some((item) => itemActive(item, location.pathname))
        return (
          <div key={group.key} className="mb-1">
            {!group.standalone && (
              <button
                type="button"
                className={`w-full flex items-center gap-2 px-4 py-2 text-[0.66rem] font-extrabold tracking-wide ${groupActive ? 'text-acc2' : 'text-sidetx/70'} hover:text-white/80 transition-colors`}
                onClick={() => setOpenGroups((o) => ({ ...o, [group.key]: !gOpen }))}
              >
                <span className="flex-1 text-start">{t(group.key)}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${gOpen ? '' : '-rotate-90 rtl:rotate-90'}`} />
              </button>
            )}
            <div className={`grid transition-all duration-200 ${group.standalone || gOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to + item.labelKey}
                    end={item.end}
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
                  >
                    <item.icon size={16} className="shrink-0 opacity-80" />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        )
      })}
      {extra}
    </nav>
  )
}

function SidebarContent({
  groups,
  collapsed,
  onNavigate,
  extra,
}: {
  groups: NavGroup[]
  collapsed?: boolean
  onNavigate?: () => void
  extra?: ReactNode
}) {
  const user = useAuth((s) => s.user)
  const { t } = useApp()
  return (
    <div className="flex flex-col h-full bg-side">
      <div className="h-[62px] flex items-center border-b border-white/5 px-4 shrink-0">
        <BrandLogo compact={collapsed} />
      </div>
      <SideNav groups={groups} collapsed={collapsed} onNavigate={onNavigate} extra={extra} />
      {!collapsed && (
        <div className="p-3 shrink-0">
          <div className="rounded-xl bg-side2 border border-white/5 p-3 flex items-center gap-2.5">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-[34px] h-[34px] rounded-full object-cover" />
            ) : (
              <Avatar name={user?.name || 'U'} size={34} status="online" />
            )}
            <div className="min-w-0">
              <p className="text-[0.8rem] font-bold text-white truncate m-0">{user?.name}</p>
              <p className="text-[0.66rem] text-sidetx truncate m-0">
                {user?.active_role ? roleLabel(user.active_role.slug) : t('brandSub')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BadgeCount({ count }: { count?: number }) {
  if (!count) return null
  return <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-bad border-2 border-surface" />
}

function HeaderIcons({ panel }: { panel: 'role' | 'admin' }) {
  const { t } = useApp()
  const { data: notif } = useQuery({ queryKey: ['notif-unread'], queryFn: async () => (await api.get('/notifications/unread-count')).data, refetchInterval: 20_000 })
  const { data: chat } = useQuery({ queryKey: ['chat-unread'], queryFn: async () => (await api.get('/conversations/unread-count')).data, refetchInterval: 20_000 })
  return (
    <>
      <NavLink to={panel === 'admin' ? '/superuser/chat' : 'chat'} className="icon-btn relative" aria-label={t('navChat')}>
        <MessagesSquare size={18} />
        <BadgeCount count={Number(chat?.unread ?? 0)} />
      </NavLink>
      <NavLink to={panel === 'admin' ? '/superuser/notifications' : 'notifications'} className="icon-btn relative" aria-label={t('navNotifications')}>
        <Bell size={18} />
        <BadgeCount count={Number(notif?.unread ?? 0)} />
      </NavLink>
    </>
  )
}

function ImpersonationBanner() {
  const { user, logout } = useAuth()
  const { t } = useApp()
  const navigate = useNavigate()
  if (!user?.impersonating) return null
  return (
    <div
      data-testid="impersonation-banner"
      className="bg-acc2 text-[#3a2a05] px-4 py-2 text-sm flex flex-wrap items-center justify-between gap-2"
    >
      <span>
        {t('impersonatingAs')} <strong>{user.name}</strong>
        {user.active_role ? ` · ${roleLabel(user.active_role.slug)}` : ''}
        {' '}({user.mobile})
      </span>
      <button
        type="button"
        data-testid="impersonation-exit"
        className="px-3 py-1 rounded-lg bg-black/10 hover:bg-black/15 font-medium"
        onClick={async () => {
          await logout()
          navigate('/login', { replace: true })
        }}
      >
        {t('impersonationExit')}
      </button>
    </div>
  )
}

function CommandPalette({
  open,
  onClose,
  flatItems,
}: {
  open: boolean
  onClose: () => void
  flatItems: { to: string; label: string; icon: typeof LayoutDashboard }[]
}) {
  const { t, darkMode, toggleDarkMode, toggleDirection, locale } = useApp()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const navItems = flatItems
      .filter((i) => !qq || i.label.toLowerCase().includes(qq) || i.to.includes(qq))
      .map((i) => ({ label: i.label, icon: i.icon, run: () => navigate(i.to.startsWith('/') ? i.to : i.to || '.'), kind: locale === 'en' ? 'Page' : 'صفحه' }))
    const acts = [
      { label: darkMode ? (locale === 'en' ? 'Switch to light' : 'حالت روشن') : (locale === 'en' ? 'Switch to dark' : 'حالت تاریک'), icon: darkMode ? Sun : Moon, run: toggleDarkMode, kind: locale === 'en' ? 'Action' : 'عملیات' },
      { label: locale === 'fa' ? 'English / LTR' : 'فارسی / RTL', icon: Search, run: toggleDirection, kind: locale === 'en' ? 'Action' : 'عملیات' },
    ].filter((a) => !qq || a.label.toLowerCase().includes(qq))
    return [...navItems, ...acts]
  }, [q, flatItems, darkMode, locale, navigate, toggleDarkMode, toggleDirection])

  useEffect(() => { setIdx(0) }, [q, open])
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && items[idx]) { items[idx].run(); onClose() }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, idx, items, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] p-4">
      <div className="absolute inset-0 bg-black/50 anim-in" onClick={onClose} />
      <div className="relative card w-full max-w-xl anim-pop overflow-hidden">
        <div className="flex items-center gap-3 px-4 border-b border-line">
          <Search size={17} className="text-faint" />
          <input
            autoFocus
            className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-faint"
            placeholder={t('search') || 'جستجوی صفحه یا عملیات…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Kbd>ESC</Kbd>
        </div>
        <div className="max-h-[46vh] overflow-y-auto p-2 scroll-slim">
          {items.length === 0 && <p className="text-center text-sm text-mute py-8">{locale === 'en' ? 'Nothing found.' : 'چیزی پیدا نشد.'}</p>}
          {items.map((it, i) => (
            <button
              key={it.label + i}
              type="button"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${i === idx ? 'bg-primsoft text-prim' : 'hover:bg-surface2'}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => { it.run(); onClose() }}
            >
              <it.icon size={16} className={i === idx ? 'text-prim' : 'text-faint'} />
              <span className="flex-1 text-start">{it.label}</span>
              <span className="text-[0.64rem] font-bold text-faint badge tone-neutral">{it.kind}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-line text-[0.66rem] text-faint font-medium">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd></span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd></span>
          <span className="ms-auto flex items-center gap-1"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
        </div>
      </div>
    </div>
  )
}

function ShellChrome({
  groups,
  panel,
  title,
  extra,
}: {
  groups: NavGroup[]
  panel: 'role' | 'admin'
  title: string
  extra?: ReactNode
}) {
  const { user, switchRole, logout } = useAuth()
  const { darkMode, toggleDarkMode, toggleDirection, sidebarCollapsed, toggleSidebarCollapsed, sidebarOpen, setSidebarOpen, t, locale } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const productOriented = useProductOriented()
  const [palette, setPalette] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const active = user?.active_role
  const impersonating = Boolean(user?.impersonating)
  const switchableRoles = user?.roles.filter((r) => r.is_active !== false && r.slug !== 'superuser') ?? []

  const visibleGroups = useMemo(
    () => filterGroups(groups, user, productOriented),
    [groups, user, productOriented],
  )

  const flatItems = useMemo(
    () => visibleGroups.flatMap((g) => g.items.map((i) => ({
      to: i.to.startsWith('/') || i.to === '' ? (i.to || location.pathname.split('/').slice(0, 3).join('/') || '.') : i.to,
      label: t(i.labelKey),
      icon: i.icon,
    }))),
    [visibleGroups, t, location.pathname],
  )

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname, setSidebarOpen])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((p) => !p)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div className="min-h-screen bg-bg">
      <aside className={`hidden lg:block fixed inset-y-0 start-0 z-40 transition-all duration-300 ${sidebarCollapsed ? 'w-[76px]' : 'w-[264px]'}`}>
        <SidebarContent groups={visibleGroups} collapsed={sidebarCollapsed} extra={extra} />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[75]">
          <div className="absolute inset-0 bg-black/50 anim-in" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-[280px] anim-slide shadow-2xl">
            <button type="button" className="absolute top-4 end-[-46px] icon-btn bg-side text-white hover:bg-side2" onClick={() => setSidebarOpen(false)} aria-label="close menu">
              <X size={18} />
            </button>
            <SidebarContent groups={visibleGroups} onNavigate={() => setSidebarOpen(false)} extra={extra} />
          </div>
        </div>
      )}

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ps-[76px]' : 'lg:ps-[264px]'}`}>
        <ImpersonationBanner />
        <header className="sticky top-0 z-40 h-[62px] flex items-center gap-2 px-4 lg:px-6 border-b border-line bg-bg/85 backdrop-blur-md">
          <button type="button" className="icon-btn lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="menu"><Menu size={19} /></button>
          <button type="button" className="icon-btn hidden lg:inline-flex" onClick={toggleSidebarCollapsed} aria-label="collapse sidebar">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path d="M15.5 4v16" className="rtl:hidden" />
              <path d="M8.5 4v16" className="ltr:hidden" />
            </svg>
          </button>
          <div className="hidden md:block min-w-0 flex-1">
            <nav className="flex items-center gap-1.5 text-[0.8rem] min-w-0">
              <span className="text-mute font-medium shrink-0">{t('home')}</span>
              <span className="text-faint shrink-0">/</span>
              <span className="font-bold truncate">{title}</span>
            </nav>
          </div>
          {panel === 'role' && active && switchableRoles.length > 1 && (
            <select
              data-testid="role-switcher"
              title={roleLabel(active.slug, locale)}
              aria-label={t('role')}
              className="input !w-auto !min-w-[7.5rem] !max-w-[9rem] shrink-0 !py-1.5 !h-9 !px-2.5 text-[0.8rem] hidden sm:block"
              value={active.slug}
              onChange={async (e) => {
                const slug = e.target.value
                if (slug === active.slug) return
                try {
                  await switchRole(slug)
                  navigate(dashboardPath(slug), { replace: true })
                } finally {
                  void qc.invalidateQueries()
                }
              }}
            >
              {switchableRoles.map((role) => (
                <option key={role.slug} value={role.slug}>{roleLabel(role.slug, locale)}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="hidden sm:flex items-center gap-2.5 h-9 px-3 rounded-[10px] border border-line bg-surface text-faint text-[0.8rem] font-medium hover:border-line2 hover:text-mute transition-colors w-36 md:w-40 lg:w-48"
          >
            <Search size={15} />
            <span className="flex-1 text-start truncate">{t('search') || 'جستجو…'}</span>
            <span className="flex gap-1"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
          </button>
          <button type="button" className="icon-btn sm:hidden" onClick={() => setPalette(true)} aria-label="search"><Search size={18} /></button>
          <button type="button" data-testid="theme-toggle" className="icon-btn" onClick={toggleDarkMode} aria-label={t('theme')}>
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button type="button" data-testid="lang-toggle" className="icon-btn" onClick={toggleDirection} aria-label={t('language')}>
            <span className="font-code text-[0.72rem] font-bold">{locale === 'fa' ? 'EN' : 'فا'}</span>
          </button>
          <HeaderIcons panel={panel} />
          <DropMenu
            button={
              <button type="button" className="flex items-center gap-2 ms-1 cursor-pointer" data-testid="user-menu">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-[34px] h-[34px] rounded-full object-cover" />
                ) : user?.name ? (
                  <Avatar name={user.name} size={34} status="online" />
                ) : (
                  <span className="w-[34px] h-[34px] rounded-full bg-prim flex items-center justify-center"><User size={16} className="text-white" /></span>
                )}
              </button>
            }
            items={[
              {
                label: 'user-meta',
                node: (
                  <div className="px-3 py-2.5 mb-1 border-b border-line">
                    <div className="text-sm font-bold text-ink truncate">{user?.name || '—'}</div>
                    <div className="text-[0.7rem] text-mute truncate mt-0.5">
                      {active ? roleLabel(active.slug, locale) : (panel === 'admin' ? t('navStats') : '—')}
                    </div>
                  </div>
                ),
              },
              {
                label: t('changePassword'),
                icon: KeyRound,
                onClick: () => setPasswordOpen(true),
              },
              {
                label: t('navNotifications'),
                icon: Bell,
                onClick: () => navigate(panel === 'admin' ? '/superuser/notifications' : 'notifications'),
              },
              ...(panel === 'admin' ? [{
                label: t('navSettings'),
                icon: Settings,
                onClick: () => navigate('/superuser/settings'),
              }] : panel === 'role' ? [{
                label: t('navWallet'),
                icon: Wallet,
                onClick: () => navigate('wallet'),
              }] : []),
              {
                label: impersonating ? t('impersonationExit') : t('logout'),
                icon: LogOut,
                danger: true,
                onClick: async () => { await logout(); navigate('/login') },
              },
            ]}
          />
        </header>

        <main className="p-4 lg:p-6 max-w-[1440px] mx-auto animate-fadeIn">
          <Outlet />
        </main>

        <footer className="px-6 pb-6 text-[0.7rem] text-faint flex items-center gap-2 max-w-[1440px] mx-auto">
          <span className="live-dot" />
          <span>{t('brand')} — {title}</span>
        </footer>
      </div>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <CommandPalette open={palette} onClose={() => setPalette(false)} flatItems={flatItems} />
    </div>
  )
}

function currentTitle(pathname: string, t: (key: string) => string, fallback: string, productOriented: boolean) {
  if (/^\/dashboard\/[^/]+$/.test(pathname)) return t('titleDashboard')
  if (pathname.endsWith('/gateways') || pathname === '/superuser/gateways') return t(productNavKey(productOriented))
  if (titleKeys[pathname]) return t(titleKeys[pathname])
  if (pathname.match(/^\/superuser\/audits\/\d+$/)) return t('titleAuditDetail')
  if (/\/crm\/activities\/\d+$/.test(pathname)) return t('navCrmActivities')
  const last = pathname.split('/').filter(Boolean).pop() ?? ''
  if (last === 'gateways') return t(productNavKey(productOriented))
  if (titleKeys[last]) return t(titleKeys[last])
  return fallback
}

export function AppShell() {
  const { user } = useAuth()
  const { t } = useApp()
  const location = useLocation()
  const productOriented = useProductOriented()
  const extra = user?.is_superuser && !user?.impersonating ? (
    <NavLink to="/superuser" className="nav-item text-acc2">
      <Building2 size={16} className="shrink-0 opacity-80" />
      <span className="truncate">{t('navSuperuser')}</span>
    </NavLink>
  ) : null

  return (
    <ShellChrome
      groups={roleGroups}
      panel="role"
      title={currentTitle(location.pathname, t, `${t('titleDashboard')} ${roleLabel(user?.active_role?.slug)}`, productOriented)}
      extra={extra}
    />
  )
}

export function SuperuserShell() {
  const { user } = useAuth()
  const { t } = useApp()
  const location = useLocation()
  const productOriented = useProductOriented()
  const back = dashboardPath(user?.roles.find((r) => r.slug !== 'superuser')?.slug ?? 'representative')
  const extra = user?.impersonating ? null : (
    <NavLink to={back} className="nav-item">
      <User size={16} className="shrink-0 opacity-80" />
      <span className="truncate">{t('navBackRole')}</span>
    </NavLink>
  )

  return (
    <ShellChrome
      groups={adminGroups}
      panel="admin"
      title={currentTitle(location.pathname, t, t('titleAdmin'), productOriented)}
      extra={extra}
    />
  )
}
