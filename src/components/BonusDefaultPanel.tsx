import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '../lib/api'
import { roleLabel } from '../lib/i18n'
import { Badge, Empty, Modal } from './ui'

type BonusRole = { slug: string; name: string; bonus_default: boolean }
type BonusUser = { id: number; name: string; mobile?: string | null; roles: BonusRole[] }

function invalidateBonusViews(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['bonus-defaults'] })
  qc.invalidateQueries({ queryKey: ['points-monitor'] })
  qc.invalidateQueries({ queryKey: ['points-detail'] })
  qc.invalidateQueries({ queryKey: ['monthly-bonus'] })
  qc.invalidateQueries({ queryKey: ['dashboard'] })
}

export function BonusDefaultToggle({
  userId,
  roleSlug,
  enabled,
  compact = false,
}: {
  userId: number
  roleSlug: string
  enabled: boolean
  compact?: boolean
}) {
  const qc = useQueryClient()
  const [pending, setPending] = useState(false)

  const run = async () => {
    setPending(true)
    try {
      const { data } = await api.post('/points/bonus-default', {
        user_id: userId,
        role_slug: roleSlug,
        enabled: !enabled,
      })
      toast.success(data?.message || 'پاداش پیش‌فرض به‌روز شد')
      invalidateBonusViews(qc)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data
      const first = data?.errors ? Object.values(data.errors).flat()[0] : undefined
      toast.error(first ?? data?.message ?? 'خطا در تغییر پاداش پیش‌فرض')
    } finally {
      setPending(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {enabled && <Badge tone="ok">پاداش فعال است</Badge>}
      <button
        type="button"
        className={`btn btn-sm whitespace-nowrap inline-flex items-center gap-1.5 ${enabled ? 'btn-ghost' : 'btn-primary'}`}
        disabled={pending}
        onClick={run}
      >
        {!enabled && <Award className="w-3.5 h-3.5" />}
        {pending ? 'در حال ذخیره...' : enabled ? 'لغو پاداش' : 'فعال کردن پاداش'}
      </button>
    </span>
  )
}

function UserCard({ user }: { user: BonusUser }) {
  return (
    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between" data-testid="bonus-default-user">
      <div className="min-w-0">
        <div className="font-semibold text-sm text-surface-900 dark:text-surface-50">{user.name}</div>
        {user.mobile ? (
          <div className="text-xs text-surface-500 mt-0.5">
            <bdi className="tabular-nums" dir="ltr">{user.mobile}</bdi>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {user.roles.length === 0 ? (
          <span className="text-xs text-surface-400">نقش پاداش‌دار ندارد</span>
        ) : user.roles.map((role) => (
          <div key={role.slug} className="flex items-center gap-2 rounded-xl bg-surface-50 dark:bg-surface-800/60 px-2 py-1.5">
            <Badge tone="info">{roleLabel(role.slug) || role.name}</Badge>
            <BonusDefaultToggle userId={user.id} roleSlug={role.slug} enabled={role.bonus_default} compact />
          </div>
        ))}
      </div>
    </div>
  )
}

export function BonusDefaultFinder() {
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['bonus-defaults', search],
    queryFn: async () => (await api.get('/points/bonus-defaults', {
      params: { search: search || undefined },
    })).data as { users: BonusUser[] },
  })
  const users = data?.users ?? []

  return (
    <section className="card p-4 sm:p-5 space-y-4" data-testid="bonus-default-finder">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-200 flex items-center justify-center shrink-0">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-surface-500 m-0 leading-6">
            نام یا موبایل را جستجو کنید و برای همان نقش دکمه را بزنید. درصد پاداش (برای نماینده ۵٪ روی ۱۵٪ پایه) برای همه درگاه‌های قبلی و بعدی، بدون حد نصاب، فعال می‌شود.
          </p>
        </div>
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(input.trim())
        }}
      >
        <label className="relative grow min-w-[14rem]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
          <input
            className="input with-icon w-full"
            value={input}
            placeholder="نام یا موبایل"
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary">جستجو</button>
        {search && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => { setInput(''); setSearch('') }}
          >
            پاک کردن
          </button>
        )}
      </form>
      {isLoading ? (
        <p className="text-sm text-surface-500 m-0">در حال بارگذاری...</p>
      ) : users.length === 0 ? (
        <Empty text="کاربری با نقش پاداش‌دار پیدا نشد" />
      ) : (
        <div className="space-y-2">
          {users.map((user) => <UserCard key={user.id} user={user} />)}
          {isFetching && <p className="text-xs text-surface-400 m-0">به‌روزرسانی...</p>}
          {!search && users.length >= 20 && (
            <p className="text-xs text-surface-400 m-0">۲۰ نفر اول نمایش داده شد. برای بقیه، نام یا موبایل را جستجو کنید.</p>
          )}
        </div>
      )}
    </section>
  )
}

export function BonusDefaultDialog({
  user,
  onClose,
}: {
  user: { id: number; name: string } | null
  onClose: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['bonus-defaults', 'user', user?.id],
    enabled: Boolean(user),
    queryFn: async () => (await api.get('/points/bonus-defaults', {
      params: { user_id: user!.id },
    })).data as { users: BonusUser[] },
  })
  const found = data?.users?.[0]

  return (
    <Modal open={Boolean(user)} onClose={onClose} title={user ? `پاداش پیش‌فرض ${user.name}` : 'پاداش پیش‌فرض'}>
      {isLoading && <p className="text-sm text-surface-500 m-0">در حال بارگذاری...</p>}
      {!isLoading && !found && (
        <p className="text-sm text-surface-500 m-0 leading-6">
          این کاربر نقش نماینده، مدیر فروش یا مدیر توسعه ندارد. پاداش پیش‌فرض فقط برای همین نقش‌هاست.
        </p>
      )}
      {!isLoading && found && <UserCard user={found} />}
    </Modal>
  )
}
