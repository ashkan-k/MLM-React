type Handler = (event: string, payload: unknown) => void

export type RealtimeClient = {
  send: (conversationId: number, body: string) => boolean
  typing: (conversationId: number, started: boolean) => void
  close: () => void
}

export function connectRealtime(userId: number, onEvent: Handler): RealtimeClient {
  const url = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://127.0.0.1:6001'
  const token = localStorage.getItem('finopal.token') ?? ''
  const queue: string[] = []
  let socket: WebSocket | null = null
  let failed = false
  try {
    socket = new WebSocket(`${url}?user_id=${userId}`)
    socket.onopen = () => {
      for (const item of queue) socket?.send(item)
      queue.length = 0
    }
    socket.onerror = () => { failed = true }
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onEvent(data.event ?? 'message', data.payload ?? data)
      } catch {
        onEvent('raw', event.data)
      }
    }
  } catch {
    socket = null
    failed = true
  }

  const emit = (payload: Record<string, unknown>) => {
    if (failed || !socket) return false
    const message = JSON.stringify({ ...payload, token, user_id: userId })
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message)
      return true
    }
    if (socket.readyState === WebSocket.CONNECTING) {
      queue.push(message)
      return true
    }
    return false
  }

  return {
    send: (conversationId, body) => emit({ action: 'send', conversation_id: conversationId, body }),
    typing: (conversationId, started) => { emit({ action: 'typing', conversation_id: conversationId, started }) },
    close: () => socket?.close(),
  }
}
