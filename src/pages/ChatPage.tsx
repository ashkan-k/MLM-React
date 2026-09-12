import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Empty } from '../components/ui'
import { api } from '../lib/api'
import { DateTimeText } from '../components/ui'
import { label } from '../lib/format'
import { connectRealtime } from '../lib/ws'
import { useAuth } from '../stores/auth'

export function ChatPage() {
  const user = useAuth((s) => s.user)
  const qc = useQueryClient()
  const [active, setActive] = useState<number | null>(null)
  const [body, setBody] = useState('')
  const [search, setSearch] = useState('')
  const [denied, setDenied] = useState(false)

  const { data: directory } = useQuery({ queryKey: ['chat-dir'], queryFn: async () => (await api.get('/chat/directory')).data })
  const { data: conv } = useQuery({ queryKey: ['conv'], queryFn: async () => (await api.get('/conversations')).data })
  const { data: messages } = useQuery({
    queryKey: ['msgs', active],
    enabled: !!active,
    queryFn: async () => (await api.get(`/conversations/${active}/messages`)).data,
  })

  const start = useMutation({
    mutationFn: async (id: number) => (await api.post('/conversations', { participant_ids: [id] })).data,
    onSuccess: (c: { id: number }) => { setDenied(false); setActive(c.id); qc.invalidateQueries({ queryKey: ['conv'] }) },
    onError: () => setDenied(true),
  })
  const send = useMutation({
    mutationFn: async () => api.post(`/conversations/${active}/messages`, { body }),
    onSuccess: () => {
      setBody('')
      qc.invalidateQueries({ queryKey: ['msgs', active] })
      if (active) api.post(`/conversations/${active}/read`)
    },
  })

  useEffect(() => {
    if (!user) return
    return connectRealtime(user.id, () => {
      qc.invalidateQueries({ queryKey: ['msgs'] })
      qc.invalidateQueries({ queryKey: ['conv'] })
    })
  }, [user, qc])

  const contacts = useMemo(() => {
    const q = search.trim()
    return (directory ?? []).filter((u: { name: string; mobile?: string }) => !q || u.name.includes(q) || u.mobile?.includes(q))
  }, [directory, search])

  const thread = [...(messages?.data ?? [])].reverse()

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-3 min-h-[640px]">
      <aside className="card p-3 grid grid-rows-[auto_1fr] overflow-hidden">
        <input className="input mb-3" placeholder="جستجوی مخاطب مجاز" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="overflow-auto">
          <div className="text-xs text-[var(--muted)] mb-2">مخاطبان مجاز</div>
          {contacts.map((u: { id: number; name: string; relationship: string }) => (
            <button key={u.id} className="w-full text-right py-2.5 px-2 rounded-xl hover:bg-[#f2f4f7]" data-testid={`chat-user-${u.id}`} onClick={() => start.mutate(u.id)}>
              <div className="font-semibold">{u.name}</div>
              <div className="text-xs text-[var(--muted)]">{label(u.relationship)}</div>
            </button>
          ))}
          <div className="text-xs text-[var(--muted)] mt-4 mb-2">گفتگوهای اخیر</div>
          {(conv?.conversations ?? []).map((c: { id: number; participants?: Array<{ name: string }> }) => (
            <button key={c.id} className={`w-full text-right py-2.5 px-2 rounded-xl ${active === c.id ? 'bg-[#e7f6f3]' : 'hover:bg-[#f2f4f7]'}`} onClick={() => setActive(c.id)}>
              {c.participants?.filter((p) => p.name !== user?.name).map((p) => p.name).join('، ') || `گفتگو ${c.id}`}
            </button>
          ))}
        </div>
      </aside>
      <section className="card min-h-[640px] grid grid-rows-[auto_1fr_auto]">
        <div className="px-4 py-3 border-b border-[var(--line)] font-bold">
          {active ? 'گفتگوی سازمانی' : 'یک مخاطب را انتخاب کنید'}
          {typeof conv?.unread === 'number' && <span className="text-sm font-normal text-[var(--muted)] mr-2">خوانده‌نشده: {conv.unread}</span>}
        </div>
        <div className="p-4 overflow-auto grid gap-2 content-start">
          {denied && <div data-testid="chat-denied" className="text-red-700">ارسال پیام به این شاخه مجاز نیست.</div>}
          {!active && <Empty text="چت فقط با مافوق و زیرمجموعه درختی امکان‌پذیر است." />}
          {thread.map((m: { id: number; body: string; created_at: string; sender_user_id: number; sender?: { name: string } }) => {
            const mine = m.sender_user_id === user?.id
            return (
              <div key={m.id} className={`max-w-[75%] p-3 text-sm ${mine ? 'bubble-me mr-auto' : 'bubble-them'}`}>
                <div className="text-[11px] opacity-80 mb-1">{m.sender?.name} · <DateTimeText value={m.created_at} /></div>
                {m.body}
              </div>
            )
          })}
        </div>
        <form className="p-3 border-t border-[var(--line)] flex gap-2" onSubmit={(e) => { e.preventDefault(); if (active && body.trim()) send.mutate() }}>
          <input className="input" data-testid="chat-input" placeholder="پیام خود را بنویسید..." value={body} onChange={(e) => setBody(e.target.value)} disabled={!active} />
          <button className="btn btn-primary" type="submit" disabled={!active || !body.trim()}>ارسال</button>
        </form>
      </section>
    </div>
  )
}
