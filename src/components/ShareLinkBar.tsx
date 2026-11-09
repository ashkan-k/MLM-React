import { useMutation } from '@tanstack/react-query'
import { Copy, ExternalLink, MessageSquare, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from './ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import {
  SHARE_TEXT_TEMPLATE,
  copyQrImage,
  downloadBlob,
  messengerShareUrl,
  qrDataUrl,
  qrShareCardBlob,
  tryNativeShare,
} from '../lib/qrShare'

type ShareKind = 'register' | 'sale' | 'shared' | 'code'

export function ShareLinkBar({
  value,
  href,
  kind = 'register',
}: {
  value: string
  href?: string
  kind?: ShareKind
}) {
  const { t } = useApp()
  const link = href || value
  const [shareOpen, setShareOpen] = useState(false)
  const [smsOpen, setSmsOpen] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="share-link-bar">
      {href ? (
        <a className="text-sm text-prim break-all" href={href} target="_blank" rel="noreferrer">{href}</a>
      ) : (
        <code className="text-sm">{value}</code>
      )}
      <button
        type="button"
        className="btn btn-ghost text-xs px-2 py-1"
        data-testid="share-copy"
        onClick={async () => {
          await navigator.clipboard.writeText(link)
          toast.success(t('copied'))
        }}
      >
        <Copy className="w-3.5 h-3.5" /> {t('copy')}
      </button>
      {href && (
        <a className="btn btn-ghost text-xs px-2 py-1" href={href} target="_blank" rel="noreferrer" data-testid="share-open">
          <ExternalLink className="w-3.5 h-3.5" /> {t('openLink')}
        </a>
      )}
      <button
        type="button"
        className="btn btn-soft text-xs px-2 py-1"
        data-testid="share-open-modal"
        onClick={() => setShareOpen(true)}
      >
        <Share2 className="w-3.5 h-3.5" /> {t('shareActions')}
      </button>
      <button
        type="button"
        className="btn btn-outline text-xs px-2 py-1"
        data-testid="share-sms-open"
        onClick={() => setSmsOpen(true)}
      >
        <MessageSquare className="w-3.5 h-3.5" /> {t('shareSmsTitle')}
      </button>
      <ShareNetworksModal open={shareOpen} link={link} onClose={() => setShareOpen(false)} />
      <ShareSmsModal open={smsOpen} link={link} kind={kind} onClose={() => setSmsOpen(false)} />
    </div>
  )
}

type ShareNetwork = 'telegram' | 'bale' | 'eitaa' | 'whatsapp' | 'rubika'

function ShareNetworksModal({
  open,
  link,
  onClose,
}: {
  open: boolean
  link: string
  onClose: () => void
}) {
  const { t } = useApp()
  const [qr, setQr] = useState<string>('')
  const [attachFor, setAttachFor] = useState<ShareNetwork | null>(null)
  const [qrCopied, setQrCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) {
      setAttachFor(null)
      setQrCopied(false)
      return
    }
    let cancelled = false
    qrDataUrl(link, 240).then((url) => {
      if (!cancelled) setQr(url)
    })
    return () => {
      cancelled = true
    }
  }, [open, link])

  const prepareQrForPaste = async () => {
    const copied = await copyQrImage(link)
    if (copied) {
      setQrCopied(true)
      return true
    }
    try {
      downloadBlob(await qrShareCardBlob(link), 'finonet-qr.png')
      setQrCopied(false)
      return false
    } catch {
      return false
    }
  }

  const openMessengerWithText = (network: ShareNetwork) => {
    if (network === 'rubika') return
    window.open(messengerShareUrl(network, link), '_blank', 'noopener,noreferrer')
  }

  const prepareMessenger = async (network: ShareNetwork) => {
    setBusy(true)
    try {
      // موبایل/سیستم‌عامل: فایل تصویر QR + متن با هم
      const native = await tryNativeShare(link)
      if (native === 'shared') {
        toast.success(t('shareNativeOk'))
        setAttachFor(null)
        return
      }
      if (native === 'aborted') return

      // دسکتاپ: لینک وب پیام‌رسان عکس نمی‌پذیرد → راهنمای Paste تصویر
      await prepareQrForPaste()
      setAttachFor(network)
      openMessengerWithText(network)
      toast.message(t('sharePasteQrHint'))
    } finally {
      setBusy(false)
    }
  }

  const nativeShare = async () => {
    setBusy(true)
    try {
      const result = await tryNativeShare(link)
      if (result === 'shared') {
        toast.success(t('shareNativeOk'))
        return
      }
      if (result === 'aborted') return
      await prepareQrForPaste()
      setAttachFor('telegram')
      toast.message(t('sharePasteQrHint'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title={t('shareModalTitle')} subtitle={t('shareModalHint')} onClose={onClose} size="md">
      <div className="space-y-5" data-testid="share-modal">
        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
          <div className="rounded-xl border border-line bg-white p-3 shrink-0" data-testid="share-qr-preview">
            {qr ? (
              <img src={qr} alt="QR" width={180} height={180} className="block" />
            ) : (
              <div className="w-[180px] h-[180px] bg-surface2 animate-pulse rounded-lg" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2 text-sm">
            <div className="font-semibold text-ink">{t('shareLinkLabel')}</div>
            <a className="text-prim break-all block leading-6" href={link} target="_blank" rel="noreferrer">{link}</a>
            <p className="text-xs text-mute m-0 leading-6">{t('shareBothHint')}</p>
            <button type="button" className="btn btn-primary w-full sm:w-auto" data-testid="share-native" disabled={busy} onClick={() => void nativeShare()}>
              <Share2 className="w-4 h-4" /> {t('shareNative')}
            </button>
          </div>
        </div>

        <div>
          <div className="font-semibold text-sm mb-2 text-ink">{t('shareNetworks')}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {([
              ['telegram', t('shareTelegram')],
              ['bale', t('shareBale')],
              ['rubika', t('shareRubika')],
              ['eitaa', t('shareEitaa')],
              ['whatsapp', t('shareWhatsapp')],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="btn btn-outline text-xs justify-center"
                data-testid={`share-net-${id}`}
                disabled={busy}
                onClick={() => void prepareMessenger(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {attachFor && (
          <div className="rounded-xl border border-prim/30 bg-primsoft/40 p-4 space-y-3" data-testid="share-attach-guide">
            <div className="font-semibold text-sm text-ink">{t('shareAttachTitle')}</div>
            <p className="text-xs text-mute m-0 leading-6">{t('shareAttachBody')}</p>
            <ol className="m-0 pr-4 text-xs text-ink leading-7 list-decimal">
              <li>{qrCopied ? t('shareAttachStepCopied') : t('shareAttachStepDownload')}</li>
              <li>{t('shareAttachStepPaste')}</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary text-xs"
                data-testid="share-copy-qr"
                onClick={async () => {
                  const ok = await copyQrImage(link)
                  setQrCopied(ok)
                  if (ok) toast.success(t('shareQrImageCopied'))
                  else {
                    downloadBlob(await qrShareCardBlob(link), 'finonet-qr.png')
                    toast.success(t('shareQrDownloadHint'))
                  }
                }}
              >
                {t('shareCopyQrImage')}
              </button>
              <button
                type="button"
                className="btn btn-outline text-xs"
                data-testid="share-download-qr"
                onClick={async () => {
                  downloadBlob(await qrShareCardBlob(link), 'finonet-qr.png')
                  toast.success(t('shareQrDownloadHint'))
                }}
              >
                {t('shareDownloadQr')}
              </button>
              {attachFor !== 'rubika' && (
                <button
                  type="button"
                  className="btn btn-soft text-xs"
                  data-testid="share-reopen-messenger"
                  onClick={() => openMessengerWithText(attachFor)}
                >
                  {t('shareOpenApp')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function ShareSmsModal({
  open,
  link,
  kind,
  onClose,
}: {
  open: boolean
  link: string
  kind: ShareKind
  onClose: () => void
}) {
  const { t } = useApp()
  const [mobile, setMobile] = useState('')
  const message = SHARE_TEXT_TEMPLATE(link)

  useEffect(() => {
    if (!open) setMobile('')
  }, [open])

  const sms = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/referrals/share-sms', {
        mobile: mobile.trim(),
        link,
        kind,
      })
      return data as { success: boolean; logged_only?: boolean; message?: string; reason?: string }
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || t('shareSmsOk'))
        onClose()
      } else {
        toast.error(data.message || data.reason || t('shareSmsFail'))
      }
    },
    onError: (error: { response?: { data?: { message?: string; logged_only?: boolean; errors?: Record<string, string[]> } }; message?: string }) => {
      const msg =
        error.response?.data?.message
        ?? error.response?.data?.errors?.mobile?.[0]
        ?? error.response?.data?.errors?.link?.[0]
        ?? error.message
        ?? t('shareSmsFail')
      toast.error(msg)
    },
  })

  const previewTo = mobile.trim() || '09xxxxxxxxx'

  return (
    <Modal open={open} title={t('shareSmsTitle')} onClose={onClose} size="md">
      <div className="space-y-4" data-testid="share-sms-modal">
        <label className="field">
          {t('mobile')}
          <input
            className="input"
            data-testid="share-sms-mobile"
            inputMode="tel"
            placeholder="09xxxxxxxxx"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            autoFocus
          />
        </label>

        <div>
          <div className="font-semibold text-sm mb-2 text-ink">{t('shareSmsPreviewTitle')}</div>
          <div
            className="rounded-2xl border border-line bg-[#e8f0ea] p-4"
            data-testid="share-sms-preview"
            dir="rtl"
          >
            <div className="text-[11px] text-mute mb-2">{t('shareSmsPreviewTo', { mobile: previewTo })}</div>
            <div className="flex justify-start">
              <div className="max-w-[92%] rounded-2xl rounded-br-md bg-white border border-line shadow-sm px-3.5 py-3 text-sm leading-7 text-ink whitespace-pre-wrap break-words">
                {message}
              </div>
            </div>
            <div className="mt-2 text-[10px] text-mute text-left" dir="ltr">SMS · فینونت</div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary w-full"
          data-testid="share-sms-send"
          disabled={sms.isPending || mobile.trim().length < 10}
          onClick={() => sms.mutate()}
        >
          {sms.isPending ? t('shareSmsSending') : t('shareSmsSend')}
        </button>
      </div>
    </Modal>
  )
}
