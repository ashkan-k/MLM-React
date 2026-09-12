import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../lib/api'

export function AdminHome() {
  const { data } = useQuery({ queryKey: ['stats'], queryFn: async () => (await api.get('/superuser/stats')).data })
  return (
    <div className="grid md:grid-cols-3 gap-3" data-testid="admin-stats">
      {Object.entries(data ?? {}).map(([k, v]) => (
        <div key={k} className="card p-4"><div className="text-sm">{k}</div><div className="text-2xl font-extrabold">{String(v)}</div></div>
      ))}
    </div>
  )
}

export function AdminUsers() {
  const { data } = useQuery({ queryKey: ['admin-users'], queryFn: async () => (await api.get('/superuser/users')).data })
  const [form, setForm] = useState({ name: '', mobile: '', password: 'Password123!', role_slugs: 'representative' })
  return (
    <div className="grid gap-4">
      <form className="card p-4 grid gap-2 max-w-lg" onSubmit={async (e) => {
        e.preventDefault()
        await api.post('/superuser/users', { ...form, role_slugs: form.role_slugs.split(',').map((s) => s.trim()) })
        toast.success('کاربر ایجاد شد')
      }}>
        <h2 className="font-extrabold">ایجاد کاربر</h2>
        <input className="input" placeholder="نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="موبایل" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
        <input className="input" placeholder="نقش‌ها با کاما" value={form.role_slugs} onChange={(e) => setForm({ ...form, role_slugs: e.target.value })} />
        <button className="btn btn-gold" type="submit">ثبت</button>
      </form>
      <div className="card p-4 overflow-auto">
        <table className="table">
          <thead><tr><th>نام</th><th>موبایل</th></tr></thead>
          <tbody>{(data?.data ?? []).map((u: { id: number; name: string; mobile: string }) => <tr key={u.id}><td>{u.name}</td><td>{u.mobile}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminPermissions() {
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get('/superuser/roles')).data })
  const { data: perms } = useQuery({ queryKey: ['perms'], queryFn: async () => (await api.get('/superuser/permissions')).data })
  return (
    <div className="card p-4" data-testid="permissions-admin">
      <h2 className="font-extrabold mb-3">دسترسی‌های پویا</h2>
      {(perms ?? []).map((p: { id: number; slug: string }) => <div key={p.id} className="py-1">{p.slug}</div>)}
      <div className="mt-4 text-sm text-[var(--muted)]">{(roles ?? []).length} نقش</div>
    </div>
  )
}

export function AdminRules() {
  const { data } = useQuery({ queryKey: ['rules'], queryFn: async () => (await api.get('/superuser/commission-rules')).data })
  return (
    <div className="card p-4" data-testid="commission-rules">
      {(data ?? []).map((r: { id: number; name: string; default_percent: string; versions?: Array<{ percent: string }> }) => (
        <div key={r.id} className="py-2 border-b">{r.name}: {r.default_percent}% (نسخه جاری {r.versions?.[r.versions.length - 1]?.percent})</div>
      ))}
    </div>
  )
}

export function AdminCourses() {
  const [title, setTitle] = useState('دوره جدید')
  const { data } = useQuery({ queryKey: ['admin-courses'], queryFn: async () => (await api.get('/superuser/courses')).data })
  return (
    <div className="grid gap-3">
      <form className="card p-4 grid gap-2 max-w-lg" onSubmit={async (e) => {
        e.preventDefault()
        await api.post('/superuser/courses', {
          title,
          is_required_for_promotion: true,
          levels: [{ title: 'سطح پویا ۱', sort_order: 1, passing_score: 70 }],
        })
        toast.success('دوره ساخته شد')
      }}>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="btn btn-primary" type="submit">ایجاد دوره با سطح داینامیک</button>
      </form>
      {(data ?? []).map((c: { id: number; title: string }) => <div key={c.id} className="card p-3">{c.title}</div>)}
    </div>
  )
}

export function AdminSettings() {
  const { data } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get('/superuser/settings')).data })
  return (
    <div className="card p-4">
      {(data ?? []).map((s: { id: number; key: string }) => <div key={s.id}>{s.key}</div>)}
    </div>
  )
}

export function AdminAudits() {
  const { data } = useQuery({ queryKey: ['audits'], queryFn: async () => (await api.get('/superuser/audits')).data })
  return (
    <div className="card p-4" data-testid="audit-log">
      {(data?.data ?? []).map((a: { id: number; action: string }) => <div key={a.id}>{a.action}</div>)}
    </div>
  )
}

export function AdminFraSoft() {
  const { data } = useQuery({ queryKey: ['fs'], queryFn: async () => (await api.get('/superuser/frasoft/logs')).data })
  return (
    <div className="grid gap-3">
      <button className="btn btn-gold w-fit" onClick={async () => {
        await api.post('/superuser/frasoft/sync', {
          event: 'user.upsert',
          payload: { id: 'FS-UI-1', name: 'نماینده UI فراسافت', mobile: '09120002222', roles: ['representative'] },
          idempotency_key: `ui-${Date.now()}`,
        })
        toast.success('همگام‌سازی ارسال شد')
      }}>همگام‌سازی آزمایشی</button>
      <div className="card p-4">{(data?.data ?? []).map((l: { id: number; status: string; event_type: string }) => <div key={l.id}>{l.event_type} - {l.status}</div>)}</div>
    </div>
  )
}
