type Handler = (payload: unknown) => void

export function connectRealtime(userId: number, onEvent: Handler) {
  const url = (import.meta.env.VITE_WS_URL as string | undefined) ?? `ws://127.0.0.1:6001`
  let socket: WebSocket | null = null
  try {
    socket = new WebSocket(`${url}?user_id=${userId}`)
    socket.onmessage = (event) => {
      try {
        onEvent(JSON.parse(event.data))
      } catch {
        onEvent(event.data)
      }
    }
  } catch {
    // UI still works via REST.
  }
  return () => socket?.close()
}
