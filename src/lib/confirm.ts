import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
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

export async function promptAction({
  title,
  text,
  confirmText = translate('confirm'),
  cancelText = translate('cancel'),
  placeholder = translate('reason'),
  danger = true,
}: ConfirmOptions & { placeholder?: string }) {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    input: 'textarea',
    inputPlaceholder: placeholder,
    inputAttributes: { 'aria-label': placeholder },
    showCancelButton: true,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: danger ? '#ef4444' : '#2563eb',
    cancelButtonColor: '#64748b',
    customClass: { popup: 'swal-finopal' },
    inputValidator: (value) => value.trim() ? undefined : translate('reasonRequired'),
  })
  return result.isConfirmed ? String(result.value ?? '').trim() : null
}
