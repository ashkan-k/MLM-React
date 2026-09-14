import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Paperclip, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { DateTimeText, PageHeader } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'
import { label, localeTag } from '../lib/format'
import { connectRealtime, type RealtimeClient } from '../lib/ws'
import { useAuth } from '../stores/auth'

type ChatAttachment = { url?: string; name?: string; mime?: string; size?: number }
type ChatMessage = {
  id: number
  body: string
  created_at: string
  sender_user_id: number
  message_type?: string
  attachment?: ChatAttachment | null
  sender?: { name: string }
}

const CHAT_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.mp3,.mp4,.webm,.aac,.ogg'

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="ms-auto shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold leading-5 text-center">
      {count > 99 ? '99+' : count.toLocaleString(localeTag())}
    </span>
  )
}

export function ChatPage() {
  const { t } = useApp()
  const user = useAuth((s) => s.user)
  const qc = useQueryClient()
  const [active, setActive] = useState<number | null>(null)
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [search, setSearch] = useState('')
  const [denied, setDenied] = useState(false)
  const [live, setLive] = useState<ChatMessage[]>([])
  const [typing, setTyping] = useState('')
  const [liveSocket, setLiveSocket] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const realtime = useRef<RealtimeClient | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const activeRef = useRef<number | null>(null)
  activeRef.current = active
  const debug = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true'

  const { data: directory } = useQuery({ queryKey: ['chat-dir'], queryFn: async () => (await api.get('/chat/directory')).data })
  const { data: conv } = useQuery({ queryKey: ['conv'], queryFn: async () => (await api.get('/conversations')).data })
  const { data: messages, isFetched: messagesReady } = useQuery({
    queryKey: ['msgs', active],
    enabled: !!active,
    queryFn: async () => (await api.get(`/conversations/${active}/messages`)).data,
    refetchInterval: liveSocket || !active ? false : 4000,
  })

  const start = useMutation({
    mutationFn: async (id: number) => (await api.post('/conversations', { participant_ids: [id] })).data,
    onSuccess: (c: { id: number }) => { setDenied(false); setActive(c.id); setLive([]); qc.invalidateQueries({ queryKey: ['conv'] }) },
    onError: () => setDenied(true),
  })

  useEffect(() => {
    if (!user) return
    const client = connectRealtime(user.id, (event, payload) => {
      if (event === 'socket.open') { setLiveSocket(true); return }
      if (event === 'socket.close' || event === 'socket.error') { setLiveSocket(false); return }
      const data = payload as { conversation_id?: number; message?: ChatMessage; name?: string }
      if (event === 'message.sent' && data.message) {
        if (data.conversation_id === activeRef.current) {
          setLive((prev) => prev.some((m) => m.id === data.message!.id) ? prev : [...prev, data.message!])
          void api.post(`/conversations/${data.conversation_id}/read`).then(() => {
            qc.invalidateQueries({ queryKey: ['chat-unread'] })
            qc.invalidateQueries({ queryKey: ['conv'] })
          })
        }
        qc.invalidateQueries({ queryKey: ['conv'] })
        qc.invalidateQueries({ queryKey: ['chat-unread'] })
        return
      }
      if (event === 'typing.started' && data.conversation_id === activeRef.current) setTyping(data.name ?? '...')
      if (event === 'typing.stopped') setTyping('')
    })
    realtime.current = client
    return () => client.close()
  }, [user?.id, qc])

  useEffect(() => { setLive([]); setFile(null) }, [active])

  const contacts = useMemo(() => {
    const q = search.trim()
    return (directory ?? []).filter((u: { name: string; mobile?: string }) => !q || u.name.includes(q) || u.mobile?.includes(q))
  }, [directory, search])

  const recentConversations = useMemo(() => {
    const list = [...(conv?.conversations ?? [])] as Array<{
      id: number
      unread_count?: number
      updated_at?: string
      messages?: Array<{ created_at?: string }>
      participants?: Array<{ id?: number; name: string }>
    }>
    return list.sort((a, b) => {
      const ta = a.messages?.[0]?.created_at ?? a.updated_at ?? ''
      const tb = b.messages?.[0]?.created_at ?? b.updated_at ?? ''
      return tb.localeCompare(ta)
    })
  }, [conv])

  const unreadByUserId = useMemo(() => {
    const map = new Map<number, number>()
    for (const c of recentConversations) {
      const otherId = c.participants?.find((p) => p.id && p.id !== user?.id)?.id
      const count = Number(c.unread_count ?? 0)
      if (otherId && count > 0 && c.id !== active) map.set(otherId, count)
    }
    return map
  }, [recentConversations, user?.id, active])

  useEffect(() => {
    if (!active) return
    void api.post(`/conversations/${active}/read`).then(() => {
      qc.invalidateQueries({ queryKey: ['chat-unread'] })
      qc.invalidateQueries({ queryKey: ['conv'] })
    })
  }, [active, qc])

  const history = [...(messages?.data ?? [])].reverse()
  const thread = [...history, ...live.filter((m) => !history.some((h) => h.id === m.id))]
  const emptyPane = !active || (messagesReady && thread.length === 0 && !denied)

  const send = async () => {
    if (!active || (!body.trim() && !file)) return
    const text = body.trim()
    const attach = file
    setBody('')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    if (!attach && liveSocket && realtime.current?.send(active, text)) return
    try {
      const fd = new FormData()
      if (text) fd.append('body', text)
      if (attach) fd.append('file', attach)
      const { data } = await api.post(`/conversations/${active}/messages`, fd)
      const message = data as ChatMessage
      if (message?.id) {
        setLive((prev) => prev.some((m) => m.id === message.id) ? prev : [...prev, message])
      }
      qc.invalidateQueries({ queryKey: ['msgs', active] })
      qc.invalidateQueries({ queryKey: ['conv'] })
      qc.invalidateQueries({ queryKey: ['chat-unread'] })
    } catch {
      toast.error(t('chatSendFail'))
      setBody(text)
      setFile(attach)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('chatTitle')} />
      <div className="grid lg:grid-cols-[300px_1fr] gap-3 min-h-[640px]">
      <aside className="card p-3 grid grid-rows-[auto_1fr] overflow-hidden">
        <div className="relative mb-3">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input className="input ps-9" placeholder={t('chatSearch')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="overflow-auto">
          <div className="text-xs text-surface-400 mb-2">{t('chatAllowed')}</div>
          {contacts.map((u: { id: number; name: string; relationship: string }) => {
            const selected = selectedUserId === u.id
            return (
            <button key={u.id} className={`w-full text-start py-2.5 px-2 rounded-xl flex items-center gap-3 ${selected ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-100 ring-1 ring-primary-400/70' : 'hover:bg-surface-100 dark:hover:bg-surface-800'}`} data-testid={`chat-user-${u.id}`} onClick={() => { setSelectedUserId(u.id); start.mutate(u.id) }}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white text-xs font-bold flex items-center justify-center">{u.name.charAt(0)}</div>
              <div className="min-w-0 flex-1">
                <div className={selected ? 'font-extrabold' : 'font-semibold'}>{u.name}</div>
                <div className="text-xs text-surface-400">{label(u.relationship)}</div>
              </div>
              <UnreadBadge count={unreadByUserId.get(u.id) ?? 0} />
            </button>
            )
          })}
          <div className="text-xs text-surface-400 mt-4 mb-2">{t('chatRecent')}</div>
          {recentConversations.map((c) => {
            const selected = active === c.id
            const others = c.participants?.filter((p) => p.id !== user?.id) ?? []
            const unread = selected ? 0 : Number(c.unread_count ?? 0)
            return (
            <button key={c.id} className={`w-full text-start py-2.5 px-2 rounded-xl flex items-center gap-3 ${selected ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-100 ring-1 ring-primary-400/70 font-extrabold' : 'hover:bg-surface-100 dark:hover:bg-surface-800 font-medium'}`} onClick={() => { setActive(c.id); setSelectedUserId(others.find((p) => p.id)?.id ?? null) }}>
              <span className="truncate flex-1">{others.map((p) => p.name).join('، ') || `${t('chatConv')} ${c.id}`}</span>
              <UnreadBadge count={unread} />
            </button>
            )
          })}
        </div>
      </aside>
      <section className="card min-h-[640px] grid grid-rows-[auto_1fr_auto]">
        <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700 font-semibold flex flex-wrap items-center gap-2">
          {active ? t('chatTitle') : t('choose')}
          {debug && liveSocket && (
            <span data-testid="chat-ws-badge" className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {t('chatLive')}
            </span>
          )}
          {debug && !liveSocket && (
            <span data-testid="chat-http-badge" className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {t('chatHttp')}
            </span>
          )}
          {typeof conv?.unread === 'number' && <span className="text-sm font-normal text-surface-400">{t('notifUnread')}: {conv.unread}</span>}
          {typing && <span className="text-xs text-primary-600">{typing}</span>}
        </div>
        <div className={`p-4 overflow-auto ${emptyPane ? 'flex items-center justify-center' : 'grid gap-2 content-start'}`}>
          {denied && <div data-testid="chat-denied" className="text-red-700">ارسال پیام به این شاخه مجاز نیست.</div>}
          {emptyPane && !denied && (
            <div className="max-w-md text-center px-6">
              <p className="m-0 text-base font-semibold text-surface-700 dark:text-surface-200 leading-8">{t('chatSub')}</p>
              <p className="mt-2 mb-0 text-sm text-surface-400">{active ? t('chatEmpty') : t('chatPick')}</p>
            </div>
          )}
          {thread.map((m) => {
            const mine = m.sender_user_id === user?.id
            const att = m.attachment
            const image = m.message_type === 'image' || att?.mime?.startsWith('image/')
            return (
              <div key={m.id} className={`max-w-[75%] p-3 text-sm ${mine ? 'bubble-me mr-auto' : 'bubble-them'}`}>
                <div className="text-[11px] opacity-80 mb-1">{m.sender?.name} · <DateTimeText value={m.created_at} /></div>
                {image && att?.url && <a href={att.url} target="_blank" rel="noreferrer"><img src={att.url} alt={att.name ?? ''} className="max-h-56 rounded-lg mb-2" /></a>}
                {!image && att?.url && (
                  <a className="block mb-1 underline" href={att.url} target="_blank" rel="noreferrer">
                    {t('chatFile')}: {att.name ?? t('chatFile')}
                  </a>
                )}
                {m.body && <div className="whitespace-pre-wrap">{m.body}</div>}
              </div>
            )
          })}
        </div>
        <form className="p-3 border-t border-surface-200 dark:border-surface-700 grid gap-2" onSubmit={(e) => { e.preventDefault(); void send() }}>
          {file && (
            <div className="flex items-center gap-2 text-xs text-surface-500">
              <span className="truncate">{file.name}</span>
              <button type="button" className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={CHAT_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null
                if (next && next.size > 10 * 1024 * 1024) {
                  toast.error(t('chatAttachFail'))
                  e.target.value = ''
                  return
                }
                setFile(next)
              }}
            />
            <button type="button" className="btn btn-ghost px-3" disabled={!active} title={t('chatAttach')} onClick={() => fileRef.current?.click()}>
              <Paperclip className="w-4 h-4" />
            </button>
            <input className="input" data-testid="chat-input" placeholder={t('chatCompose')} value={body} onChange={(e) => { setBody(e.target.value); if (active && liveSocket) realtime.current?.typing(active, true) }} disabled={!active} />
            <button className="btn btn-primary" type="submit" disabled={!active || (!body.trim() && !file)}>ارسال</button>
          </div>
        </form>
      </section>
      </div>
    </div>
  )
}
