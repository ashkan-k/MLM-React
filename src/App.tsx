import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppShell, SuperuserShell } from './layouts/AppShell'
import { canAccessPage } from './lib/access'
import { dashboardPath } from './lib/roles'
import { AdminAuditDetail } from './pages/AdminAuditDetail'
import { AdminAudits, AdminCourses, AdminFraSoft, AdminHome, AdminPermissions, AdminRules, AdminSettings, AdminUsers } from './pages/AdminPages'
import { AdminNetwork } from './pages/AdminNetwork'
import { AdminReports } from './pages/AdminReports'
import { ChatPage } from './pages/ChatPage'
import { DashboardPage } from './pages/DashboardPage'
import { CommissionsPage, FinancePage, GatewaysPage, NotificationsPage, OrgManagersPage, PromotionsPage, ReferralsPage, TeamPage, TrainingPage, TransfersPage, WalletPage, WithdrawalsPage } from './pages/DataPages'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { SharedLinkPage } from './pages/SharedLinkPage'
import { AdminOrgManagers } from './pages/AdminOrgManagers'
import { useAuth } from './stores/auth'

function Guard({ superuserOnly = false }: { superuserOnly?: boolean }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8">در حال بارگذاری...</div>
  if (!user) return <Navigate to="/login" replace />
  if (superuserOnly && !user.is_superuser) return <Navigate to={dashboardPath(user.active_role?.slug)} replace />
  return <Outlet />
}

function PageGate({ page, children }: { page: string; children: ReactNode }) {
  const { user } = useAuth()
  if (!canAccessPage(user, page)) return <Navigate to={dashboardPath(user?.active_role?.slug)} replace />
  return children
}

function Guest() {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8">در حال بارگذاری...</div>
  if (user) {
    const dest = user.active_role?.slug === 'superuser' ? '/superuser' : dashboardPath(user.active_role?.slug)
    return <Navigate to={dest} replace />
  }
  return <Outlet />
}

const roleChildren = (
  <>
    <Route index element={<PageGate page=""><DashboardPage /></PageGate>} />
    <Route path="team" element={<PageGate page="team"><TeamPage /></PageGate>} />
    <Route path="org-managers" element={<PageGate page="team"><OrgManagersPage /></PageGate>} />
    <Route path="gateways" element={<PageGate page="gateways"><GatewaysPage /></PageGate>} />
    <Route path="commissions" element={<PageGate page="commissions"><CommissionsPage /></PageGate>} />
    <Route path="wallet" element={<PageGate page="wallet"><WalletPage /></PageGate>} />
    <Route path="finance" element={<PageGate page="finance"><FinancePage /></PageGate>} />
    <Route path="withdrawals" element={<PageGate page="withdrawals"><WithdrawalsPage /></PageGate>} />
    <Route path="referrals" element={<PageGate page="referrals"><ReferralsPage /></PageGate>} />
    <Route path="promotions" element={<PageGate page="promotions"><PromotionsPage /></PageGate>} />
    <Route path="training" element={<PageGate page="training"><TrainingPage /></PageGate>} />
    <Route path="courses" element={<PageGate page="courses"><AdminCourses /></PageGate>} />
    <Route path="chat" element={<PageGate page="chat"><ChatPage /></PageGate>} />
    <Route path="notifications" element={<PageGate page="notifications"><NotificationsPage /></PageGate>} />
    <Route path="transfers" element={<PageGate page="transfers"><TransfersPage /></PageGate>} />
  </>
)

export default function App() {
  return (
    <Routes>
      <Route path="/shared-link/:token" element={<SharedLinkPage />} />
      <Route element={<Guest />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<Guard />}>
        <Route path="/dashboard/representative" element={<AppShell />}>{roleChildren}</Route>
        <Route path="/dashboard/representative-referrer" element={<AppShell />}>{roleChildren}</Route>
        <Route path="/dashboard/sales-manager" element={<AppShell />}>{roleChildren}</Route>
        <Route path="/dashboard/development-manager" element={<AppShell />}>{roleChildren}</Route>
        <Route path="/dashboard/senior-manager" element={<AppShell />}>{roleChildren}</Route>
      </Route>
      <Route element={<Guard superuserOnly />}>
        <Route path="/superuser" element={<SuperuserShell />}>
          <Route index element={<AdminHome />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="network" element={<AdminNetwork />} />
          <Route path="org-managers" element={<AdminOrgManagers />} />
          <Route path="permissions" element={<AdminPermissions />} />
          <Route path="gateways" element={<GatewaysPage />} />
          <Route path="rules" element={<AdminRules />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="audits" element={<AdminAudits />} />
          <Route path="audits/:id" element={<AdminAuditDetail />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="frasoft" element={<AdminFraSoft />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
