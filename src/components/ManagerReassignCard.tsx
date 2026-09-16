import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { SearchSelect } from './SearchSelect'

type DirectoryUser = {
  id: number
  name: string
  mobile: string
  roles: Array<{ id: number; name: string; slug: string }>
}

type Mode = 'reassign' | 'appoint'

export function ManagerReassignCard() {
  const { t } = useApp()
  const qc = useQueryClient()
  const { data: directory = [] } = useQuery({
    queryKey: ['directory'],
    queryFn: async () => (await api.get('/users/directory')).data as DirectoryUser[],
  })
  const [mode, setMode] = useState<Mode>('reassign')
  const [managerRole, setManagerRole] = useState<'sales_manager' | 'development_manager'>('sales_manager')
  const [targetUserId, setTargetUserId] = useState('')
  const [managerUserId, setManagerUserId] = useState('')
  const [appointUserId, setAppointUserId] = useState('')

  const childSlug = managerRole === 'sales_manager' ? 'representative' : 'sales_manager'
  const parentSlug = managerRole === 'sales_manager' ? 'development_manager' : 'senior_manager'

  const targets = useMemo(
    () => directory.filter((u) => u.roles.some((r) => r.slug === childSlug)),
    [directory, childSlug],
  )
  const managers = useMemo(
    () => directory.filter((u) => u.roles.some((r) => r.slug === managerRole)),
    [directory, managerRole],
  )
  const parents = useMemo(
    () => directory.filter((u) => u.roles.some((r) => r.slug === parentSlug || (parentSlug === 'development_manager' && r.slug === 'senior_manager'))),
    [directory, parentSlug],
  )
  const appointCandidates = useMemo(
    () => directory.filter((u) => !u.roles.some((r) => r.slug === 'superuser')),
    [directory],
  )

  const canSubmit = mode === 'reassign'
    ? Boolean(targetUserId && managerUserId)
    : Boolean(appointUserId && managerUserId)

  const mutate = useMutation({
    mutationFn: async () => {
      if (mode === 'appoint') {
        await api.post('/organization/reassign-manager', {
          mode: 'appoint',
          appoint_user_id: Number(appointUserId),
          manager_user_id: Number(managerUserId),
          manager_role: managerRole,
        })
        return
      }
      await api.post('/organization/reassign-manager', {
        mode: 'reassign',
        target_user_id: Number(targetUserId),
        manager_user_id: Number(managerUserId),
        manager_role: managerRole,
      })
    },
    onSuccess: () => {
      toast.success(mode === 'appoint' ? t('appointOk') : t('reassignOk'))
      setTargetUserId('')
      setManagerUserId('')
      setAppointUserId('')
      qc.invalidateQueries({ queryKey: ['tree'] })
      qc.invalidateQueries({ queryKey: ['team'] })
      qc.invalidateQueries({ queryKey: ['directory'] })
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
      const first = message?.errors ? Object.values(message.errors)[0]?.[0] : undefined
      toast.error(first || message?.message || (mode === 'appoint' ? t('appointFail') : t('reassignFail')))
    },
  })

  return (
    <div className="card p-4 space-y-4" data-testid="manager-reassign">
      <div>
        <div className="font-semibold text-surface-800 dark:text-surface-100">{t('reassignTitle')}</div>
        <p className="text-sm text-surface-500 m-0 mt-1">{mode === 'appoint' ? t('appointSub') : t('reassignSub')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn text-sm ${mode === 'reassign' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setMode('reassign'); setManagerUserId(''); setTargetUserId('') }}
        >
          {t('reassignModeMove')}
        </button>
        <button
          type="button"
          className={`btn text-sm ${mode === 'appoint' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setMode('appoint'); setManagerUserId(''); setAppointUserId('') }}
        >
          {t('reassignModeAppoint')}
        </button>
      </div>

      {mode === 'reassign' ? (
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="field">{t('reassignManagerRole')}
            <select
              className="input"
              value={managerRole}
              onChange={(e) => {
                setManagerRole(e.target.value as 'sales_manager' | 'development_manager')
                setTargetUserId('')
                setManagerUserId('')
              }}
            >
              <option value="sales_manager">{t('role_sales_manager')}</option>
              <option value="development_manager">{t('role_development_manager')}</option>
            </select>
          </label>
          <label className="field">{managerRole === 'sales_manager' ? t('reassignTargetRep') : t('reassignTargetSm')}
            <SearchSelect
              value={targetUserId}
              onChange={setTargetUserId}
              placeholder={t('searchPlaceholder')}
              testId="reassign-target"
              options={targets.map((u) => ({
                value: u.id,
                label: `${u.name} — ${u.mobile}`,
                keywords: u.roles.map((r) => r.name).join(' '),
              }))}
            />
          </label>
          <label className="field">{t('reassignNewManager')}
            <SearchSelect
              value={managerUserId}
              onChange={setManagerUserId}
              placeholder={t('searchPlaceholder')}
              testId="reassign-manager"
              options={managers.map((u) => ({
                value: u.id,
                label: `${u.name} — ${u.mobile}`,
                keywords: u.roles.map((r) => r.name).join(' '),
              }))}
            />
          </label>
        </div>
      ) : (
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="field">{t('appointVacantRole')}
            <select
              className="input"
              value={managerRole}
              onChange={(e) => {
                setManagerRole(e.target.value as 'sales_manager' | 'development_manager')
                setAppointUserId('')
                setManagerUserId('')
              }}
            >
              <option value="sales_manager">{t('role_sales_manager')}</option>
              <option value="development_manager">{t('role_development_manager')}</option>
            </select>
          </label>
          <label className="field">{t('appointUser')}
            <SearchSelect
              value={appointUserId}
              onChange={setAppointUserId}
              placeholder={t('searchPlaceholder')}
              testId="appoint-user"
              options={appointCandidates.map((u) => ({
                value: u.id,
                label: `${u.name} — ${u.mobile}`,
                keywords: u.roles.map((r) => r.name).join(' '),
              }))}
            />
          </label>
          <label className="field">{t('appointParent')}
            <SearchSelect
              value={managerUserId}
              onChange={setManagerUserId}
              placeholder={t('searchPlaceholder')}
              testId="appoint-parent"
              options={parents.map((u) => ({
                value: u.id,
                label: `${u.name} — ${u.mobile}`,
                keywords: u.roles.map((r) => r.name).join(' '),
              }))}
            />
          </label>
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary"
        disabled={!canSubmit || mutate.isPending}
        onClick={() => mutate.mutate()}
      >
        {mode === 'appoint' ? t('appointSubmit') : t('reassignSubmit')}
      </button>
    </div>
  )
}
