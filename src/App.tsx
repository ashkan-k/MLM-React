import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell, SuperuserShell } from './layouts/AppShell'
import { dashboardPath } from './lib/roles'
import { AdminAuditDetail } from './pages/AdminAuditDetail'
import { AdminAudits, AdminCourses, AdminFraSoft, AdminHome, AdminPermissions, AdminRules, AdminSettings, AdminUsers } from './pages/AdminPages'
import { AdminNetwork } from './pages/AdminNetwork'
import { AdminReports } from './pages/AdminReports'
import { ChatPage } from './pages/ChatPage'
import { DashboardPage } from './pages/DashboardPage'
import { CommissionsPage, FinancePage, GatewaysPage, NotificationsPage, PromotionsPage, ReferralsPage, TeamPage, TrainingPage, TransfersPage, WalletPage, WithdrawalsPage } from './pages/DataPages'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { useAuth } from './stores/auth'

function Guard({ superuserOnly = false }: { superuserOnly?: boolean }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8">در حال بارگذاری...</div>
  if (!user) return <Navigate to="/login" replace />
  if (superuserOnly && !user.is_superuser) return <Navigate to={dashboardPath(user.active_role?.slug)} replace />
  return <Outlet />
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
    <Route index element={<DashboardPage />} />
    <Route path="team" element={<TeamPage />} />
    <Route path="gateways" element={<GatewaysPage />} />
    <Route path="commissions" element={<CommissionsPage />} />
    <Route path="wallet" element={<WalletPage />} />
    <Route path="finance" element={<FinancePage />} />
    <Route path="withdrawals" element={<WithdrawalsPage />} />
    <Route path="referrals" element={<ReferralsPage />} />
    <Route path="promotions" element={<PromotionsPage />} />
    <Route path="training" element={<TrainingPage />} />
    <Route path="chat" element={<ChatPage />} />
    <Route path="notifications" element={<NotificationsPage />} />
    <Route path="transfers" element={<TransfersPage />} />
  </>
)

export default function App() {
  return (
    <Routes>
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
          <Route path="permissions" element={<AdminPermissions />} />
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
