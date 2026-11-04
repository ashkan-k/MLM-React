import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from './ui'
import { useApp } from '../contexts/AppContext'
import { authApi } from '../lib/api'

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useApp()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setCurrentPassword('')
    setPassword('')
    setPasswordConfirmation('')
    setSaving(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const submit = async () => {
    if (!currentPassword || !password || !passwordConfirmation) {
      toast.error(t('changePasswordRequired'))
      return
    }
    if (password !== passwordConfirmation) {
      toast.error(t('passwordMismatch'))
      return
    }
    if (password.length < 8) {
      toast.error(t('changePasswordMin'))
      return
    }
    setSaving(true)
    try {
      const { data } = await authApi.changePassword({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      })
      toast.success(data?.message || t('changePasswordOk'))
      handleClose()
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
      const errors = ax.response?.data?.errors
      const first = errors
        ? Object.values(errors).flat()[0]
        : ax.response?.data?.message
      toast.error(first || t('changePasswordFail'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('changePassword')} subtitle={t('changePasswordSub')}>
      <div className="grid gap-3" data-testid="change-password-modal">
        <label className="field">
          {t('changePasswordCurrent')}
          <input
            className="input"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            data-testid="change-password-current"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label className="field">
          {t('changePasswordNew')}
          <input
            className="input"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            data-testid="change-password-new"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="field">
          {t('changePasswordConfirm')}
          <input
            className="input"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            data-testid="change-password-confirm"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost" onClick={handleClose}>{t('cancel')}</button>
          <button type="button" className="btn btn-primary" data-testid="change-password-submit" disabled={saving} onClick={() => void submit()}>
            {saving ? t('saving') : t('changePassword')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
