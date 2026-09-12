import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { connectRealtime } from '../lib/ws'
import { useAuth } from '../stores/auth'

export function ChatPage() {
  const user = useAuth((s) => s.user)
  const qc = useQueryClient()
  const [active, setActive] = useState<number | null>(null)
  const [body, setBody] = useState('')
  const { data: directory } = useQuery({ queryKey: ['chat-dir'], queryFn: async () => (await api.get('/chat/directory')).data })
  const { data: conv } = useQuery({ queryKey: ['conv'], queryFn: async () => (await api.get('/conversations')).data })
  const { data: messages } = useQuery({
    queryKey: ['msgs', active],
    enabled: !!active,
    queryFn: async () => (await api.get(`/conversations/${active}/messages`)).data,
  })
  const start = useMutation({
    mutationFn: async (id: number) => (await api.post('/conversations', { participant_ids: [id] })).data,
    onSuccess: (c: { id: number }) => { setActive(c.id); qc.invalidateQueries({ queryKey: ['conv'] }) },
    onError: () => setDenied(true),
  })
  const send = useMutation({
    mutationFn: async () => api.post(`/conversations/${active}/messages`, { body }),
    onSuccess: () => { setBody(''); qc.invalidateQueries({ queryKey: ['msgs', active] }) },
  })
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    if (!user) return
    return connectRealtime(user.id, () => {
      qc.invalidateQueries({ queryKey: ['msgs'] })
      qc.invalidateQueries({ queryKey: ['conv'] })
    })
  }, [user, qc])

  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-3">
      <aside className="card p-3">
        <h3 className="font-bold mb-2">مخاطبان مجاز</h3>
        {(directory ?? []).map((u: { id: number; name: string; relationship: string }) => (
          <button key={u.id} className="w-full text-right py-2" data-testid={`chat-user-${u.id}`} onClick={() => start.mutate(u.id)}>
            {u.name} <span className="badge">{u.relationship}</span>
          </button>
        ))}
        {(conv?.conversations ?? []).map((c: { id: number; title?: string }) => (
          <button key={c.id} className="w-full text-right py-2" onClick={() => setActive(c.id)}>گفتگو #{c.id}</button>
        ))}
      </aside>
      <section className="card p-4 min-h-[420px] grid grid-rows-[1fr_auto]">
        {denied && <div data-testid="chat-denied" className="text-red-700">ارسال پیام به این شاخه مجاز نیست.</div>}
        <div className="overflow-auto">
          {(messages?.data ?? []).map((m: { id: number; body: string; sender?: { name: string } }) => (
            <div key={m.id} className="py-2 border-b"><strong>{m.sender?.name}:</strong> {m.body}</div>
          ))}
        </div>
        <form className="flex gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); send.mutate() }}>
          <input className="input" data-testid="chat-input" value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="btn btn-primary" type="submit">ارسال</button>
        </form>
      </section>
    </div>
  )
}
