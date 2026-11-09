import QRCode from 'qrcode'

/** متن کامل برای پیامک / واتساپ / کلیپ‌بورد — لینک فقط یک‌بار */
export const SHARE_TEXT_TEMPLATE = (link: string) =>
  `دعوت به سازمان فروش فینونت\nلینک شما:\n${link}`

/** کپشن برای پیام‌رسان‌هایی که خودشان پارامتر url جدا می‌گذارند (تلگرام/بله/ایتا) */
export const SHARE_CAPTION = 'دعوت به سازمان فروش فینونت'

export async function qrDataUrl(link: string, size = 280): Promise<string> {
  return QRCode.toDataURL(link, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#15211b', light: '#ffffff' },
  })
}

/** کارت تصویری شامل QR + متن لینک — برای اشتراک‌گذاری یک‌جا در پیام‌رسان‌ها */
export async function qrShareCardBlob(link: string, heading = 'فینونت'): Promise<Blob> {
  const size = 320
  const pad = 28
  const textBlock = 96
  const qr = await qrDataUrl(link, size)
  const canvas = document.createElement('canvas')
  canvas.width = size + pad * 2
  canvas.height = size + pad * 2 + textBlock
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')

  ctx.fillStyle = '#f2f5f1'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#0e8467'
  ctx.font = 'bold 22px Vazirmatn, Tahoma, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(heading, canvas.width / 2, pad - 4)

  const img = await loadImage(qr)
  ctx.drawImage(img, pad, pad + 8, size, size)

  ctx.fillStyle = '#15211b'
  ctx.font = '13px IBM Plex Mono, Tahoma, monospace'
  const lines = wrapText(ctx, link, canvas.width - pad * 2)
  let y = pad + 8 + size + 28
  for (const line of lines.slice(0, 3)) {
    ctx.fillText(line, canvas.width / 2, y)
    y += 18
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('qr blob failed')
  return blob
}

export async function qrFile(link: string, filename = 'finonet-qr.png'): Promise<File> {
  const blob = await qrShareCardBlob(link)
  return new File([blob], filename, { type: 'image/png' })
}

export function messengerShareUrl(
  network: 'telegram' | 'bale' | 'eitaa' | 'whatsapp',
  link: string,
): string {
  // تلگرام/بله/ایتا لینک را از پارامتر url می‌گذارند — کپشن بدون تکرار لینک
  if (network === 'telegram') {
    return `https://t.me/share/url?${new URLSearchParams({ url: link, text: SHARE_CAPTION })}`
  }
  if (network === 'bale') {
    return `https://ble.ir/share?${new URLSearchParams({ url: link, text: SHARE_CAPTION })}`
  }
  if (network === 'eitaa') {
    return `https://eitaa.com/share/url?${new URLSearchParams({ url: link, text: SHARE_CAPTION })}`
  }
  // واتساپ فقط text دارد — لینک یک‌بار داخل متن
  return `https://api.whatsapp.com/send?${new URLSearchParams({ text: SHARE_TEXT_TEMPLATE(link) })}`
}

export async function tryNativeShare(link: string): Promise<'shared' | 'unsupported' | 'aborted'> {
  const text = SHARE_TEXT_TEMPLATE(link)
  try {
    const file = await qrFile(link)
    const withFile: ShareData = { title: 'فینونت', text, files: [file] }
    if (typeof navigator !== 'undefined' && navigator.canShare?.(withFile)) {
      await navigator.share(withFile)
      return 'shared'
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      // فقط text (شامل لینک یک‌بار) — url جدا نده تا تکراری نشود
      await navigator.share({ title: 'فینونت', text })
      return 'shared'
    }
    return 'unsupported'
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return 'aborted'
    return 'unsupported'
  }
}

export async function copyQrImage(link: string): Promise<boolean> {
  try {
    const blob = await qrShareCardBlob(link)
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') return false
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    return true
  } catch {
    return false
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const chars = [...text]
  const lines: string[] = []
  let current = ''
  for (const ch of chars) {
    const next = current + ch
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current)
      current = ch
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}
