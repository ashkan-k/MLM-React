import Swal from 'sweetalert2'
import { translate } from './i18n'

type ConfirmOptions = {
  title: string
  text?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  icon?: 'warning' | 'question' | 'info'
}

export async function confirmAction({
  title,
  text,
  confirmText = translate('confirm'),
  cancelText = translate('cancel'),
  danger = true,
  icon = 'warning',
}: ConfirmOptions) {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: danger ? '#ef4444' : '#2563eb',
    cancelButtonColor: '#64748b',
    customClass: { popup: 'swal-finopal' },
  })

  return result.isConfirmed
}
