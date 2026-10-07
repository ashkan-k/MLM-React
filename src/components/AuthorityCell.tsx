import { Copy, ExternalLink, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../contexts/AppContext'

/** Truncate middle of long payment IDs for compact table cells. */
export function truncateMiddle(value: string, head = 8, tail = 6) {
  const s = String(value ?? '')
  if (s.length <= head + tail + 3) return s
  return `${s.slice(0, head)}…${s.slice(-tail)}`
}

export function finopalTransactionUrl(authority: string) {
  const base = (import.meta.env.VITE_FINOPAL_PANEL_TX_URL as string | undefined)
    || 'https://finopal.ir/panel/transactions'
  const join = base.includes('?') ? '&' : '?'
  return `${base}${join}authority=${encodeURIComponent(authority)}`
}

/** Display-only: truncated authority (+ optional secondary ref line). */
export function AuthorityCell({
  authority,
  secondary,
}: {
  authority?: string | null
  secondary?: string | null
}) {
  if (!authority) return <span className="text-surface-400">—</span>

  return (
    <div className="min-w-0" data-testid="authority-cell">
      <span
        className="text-xs font-mono dir-ltr text-left block truncate"
        title={authority}
      >
        {truncateMiddle(authority)}
      </span>
      {secondary && (
        <div className="text-[11px] text-surface-400 mt-0.5 font-mono dir-ltr text-left truncate" title={secondary}>
          {secondary}
        </div>
      )}
    </div>
  )
}

/** Icon actions for authority: copy / Finopal / optional internal tx link. */
export function AuthorityActions({
  authority,
  txHref,
}: {
  authority?: string | null
  txHref?: string | null
}) {
  const { t } = useApp()
  if (!authority) return <span className="text-surface-400">—</span>

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(authority)
      toast.success(t('copied'))
    } catch {
      toast.error(t('copy'))
    }
  }

  const btn = 'p-1.5 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 shrink-0 inline-flex'

  return (
    <div className="flex items-center gap-0.5" data-testid="authority-actions">
      <button
        type="button"
        className={btn}
        title={t('copy')}
        aria-label={t('copy')}
        onClick={copy}
        data-testid="authority-copy"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
      <a
        href={finopalTransactionUrl(authority)}
        target="_blank"
        rel="noreferrer"
        className={btn}
        title={t('txViewOnFinopal')}
        aria-label={t('txViewOnFinopal')}
        data-testid="authority-finopal"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      {txHref && (
        <a
          href={txHref}
          target="_blank"
          rel="noreferrer"
          className={btn}
          title={t('commOpenTransaction')}
          aria-label={t('commOpenTransaction')}
          data-testid="authority-internal-tx"
        >
          <Receipt className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  )
}
