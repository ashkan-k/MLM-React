type Handler = (event: string, payload: unknown) => void

export type RealtimeClient = {
  send: (conversationId: number, body: string) => boolean
  typing: (conversationId: number, started: boolean) => void
  close: () => void
  ready: () => boolean
}

type Shared = {
  userId: number
  socket: WebSocket | null
  handlers: Set<Handler>
  queue: string[]
  retries: number
  timer?: number
}

let shared: Shared | null = null

function endpoints() {
  if (import.meta.env.VITE_WS_URL) return [String(import.meta.env.VITE_WS_URL)]
  const host = window.location.hostname
  const port = import.meta.env.VITE_WS_PORT || '6001'
  const sameOrigin = `ws://${window.location.host}/ws`
  const direct = [
    `ws://127.0.0.1:${port}`,
    host === '127.0.0.1' ? null : `ws://${host}:${port}`,
    sameOrigin,
  ]
  return [...new Set(direct.filter((url): url is string => Boolean(url)))]
}

function emitAll(event: string, payload: unknown) {
  shared?.handlers.forEach((handler) => handler(event, payload))
}

function openSocket() {
  if (!shared) return
  const urls = endpoints()
  const url = `${urls[shared.retries % urls.length]}?user_id=${shared.userId}`
  try {
    const socket = new WebSocket(url)
    shared.socket = socket
    socket.onopen = () => {
      if (!shared) return
      shared.retries = 0
      for (const item of shared.queue) socket.send(item)
      shared.queue = []
      emitAll('socket.open', {})
    }
    socket.onerror = () => emitAll('socket.error', {})
    socket.onclose = () => {
      emitAll('socket.close', {})
      if (!shared || shared.handlers.size === 0) return
      shared.retries += 1
      window.setTimeout(openSocket, Math.min(5000, 400 * shared.retries))
    }
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        emitAll(data.event ?? 'message', data.payload ?? data)
      } catch {
        emitAll('raw', event.data)
      }
    }
  } catch {
    emitAll('socket.error', {})
  }
}

export function connectRealtime(userId: number, onEvent: Handler): RealtimeClient {
  const token = () => localStorage.getItem('finopal.token') ?? ''
  if (!shared || shared.userId !== userId) {
    shared?.socket?.close()
    shared = { userId, socket: null, handlers: new Set(), queue: [], retries: 0 }
    openSocket()
  }
  shared.handlers.add(onEvent)
  if (shared.socket?.readyState === WebSocket.OPEN) onEvent('socket.open', {})

  const emit = (payload: Record<string, unknown>) => {
    if (!shared) return false
    const message = JSON.stringify({ ...payload, token: token(), user_id: userId })
    if (shared.socket?.readyState === WebSocket.OPEN) {
      shared.socket.send(message)
      return true
    }
    shared.queue.push(message)
    return true
  }

  return {
    send: (conversationId, body) => emit({ action: 'send', conversation_id: conversationId, body }),
    typing: (conversationId, started) => { emit({ action: 'typing', conversation_id: conversationId, started }) },
    close: () => {
      if (!shared) return
      shared.handlers.delete(onEvent)
      window.clearTimeout(shared.timer)
      shared.timer = window.setTimeout(() => {
        if (shared && shared.handlers.size === 0) {
          shared.socket?.close()
          shared = null
        }
      }, 400)
    },
    ready: () => shared?.socket?.readyState === WebSocket.OPEN,
  }
}
