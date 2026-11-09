'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_AUDIO_SECONDS = 180
const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
const CONV_SELECT =
  'id, last_message, last_message_at, is_group, group_name, group_avatar_url, user1_id, user2_id, user1:user1_id(id, full_name), user2:user2_id(id, full_name)'

type Person = { id?: string; full_name: string | null }
type Profile = { id: string; full_name?: string | null }
type Conversation = {
  id: string
  last_message: string | null
  last_message_at: string | null
  is_group: boolean
  group_name: string | null
  group_avatar_url: string | null
  user1_id: string | null
  user2_id: string | null
  user1: Person | null
  user2: Person | null
}
type Message = {
  id: string
  sender_id: string
  content: string | null
  created_at: string
  message_type?: 'text' | 'image' | 'audio'
  media_url?: string | null
  reply_to_id?: string | null
  reactions?: Record<string, string[]> | null
  sender?: { full_name: string | null } | null
  isTemp?: boolean
}
type UserRow = { id: string; full_name: string | null }

const previewOf = (m: Pick<Message, 'message_type' | 'content'>) =>
  m.message_type === 'image' ? '📷 Image' : m.message_type === 'audio' ? '🎤 Vocal' : m.content || ''

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function MessagesPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [today] = useState(() => new Date())

  // Liste
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [allUsers, setAllUsers] = useState<UserRow[]>([])
  const [userSearch, setUserSearch] = useState('')

  // Chat
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [longPressMessage, setLongPressMessage] = useState<Message | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [uploading, setUploading] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordCancelled = useRef(false)
  const startingConv = useRef(false)

  const activeConvId = activeConv?.id ?? null
  const isGroup = !!activeConv?.is_group

  const otherOf = useCallback(
    (c: Conversation) => (c.user1_id === profile?.id ? c.user2 : c.user1),
    [profile?.id]
  )
  const titleOf = useCallback(
    (c: Conversation) => (c.is_group ? c.group_name : otherOf(c)?.full_name) || 'Conversation',
    [otherOf]
  )

  // Erreur : disparaît seule
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 4000)
    return () => clearTimeout(t)
  }, [error])

  // Chargement initial
  const loadConversations = useCallback(
    async (userId: string) => {
      const { data, error: err } = await supabase
        .from('conversations')
        .select(CONV_SELECT)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false })
      if (err) {
        setError('Impossible de charger les conversations.')
        return
      }
      setConversations((data ?? []) as unknown as Conversation[])
    },
    [supabase]
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', session.user.id)
        .single()
      if (cancelled) return
      setProfile((prof as Profile | null) ?? { id: session.user.id })
      await loadConversations(session.user.id)
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, router, loadConversations])

  // Messages + temps réel de la conversation ouverte
  useEffect(() => {
    if (!activeConvId) return
    let cancelled = false
    ;(async () => {
      const { data, error: err } = await supabase
        .from('messages')
        .select('*, sender:sender_id(full_name)')
        .eq('conversation_id', activeConvId)
        .order('created_at', { ascending: false })
        .limit(200)
      if (cancelled) return
      if (err) setError('Impossible de charger les messages.')
      setMessages(((data ?? []) as unknown as Message[]).reverse())
    })()

    const channel = supabase
      .channel(`chat-${activeConvId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvId}` },
        (payload) => {
          const m = payload.new as Message
          setMessages((prev) =>
            prev.some((x) => x.id === m.id)
              ? prev
              : [...prev.filter((x) => !(x.isTemp && x.sender_id === m.sender_id && x.content === m.content)), m]
          )
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [activeConvId, supabase])

  // Défilement automatique (seulement si on est déjà en bas)
  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, activeConvId])

  const onScrollMessages = () => {
    const el = scrollRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
  }

  // Nettoyage micro / minuteurs
  const releaseMic = useCallback(() => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    recordTimerRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      recordCancelled.current = true
      const r = mediaRecorderRef.current
      if (r && r.state !== 'inactive') r.stop()
      releaseMic()
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [releaseMic])

  // --- Ouverture / fermeture (le bouton retour Android ferme le chat) ---
  const openChat = (conv: Conversation) => {
    stickToBottom.current = true
    setMessages([])
    setReplyTo(null)
    setActiveConv(conv)
    window.history.pushState({ xafChat: true }, '', '#chat')
  }

  const closeChatState = useCallback(() => {
    recordCancelled.current = true
    const r = mediaRecorderRef.current
    if (r && r.state !== 'inactive') r.stop()
    releaseMic()
    setIsRecording(false)
    setRecordTime(0)
    setActiveConv(null)
    setMessages([])
    setReplyTo(null)
    setLongPressMessage(null)
    setNewMessage('')
  }, [releaseMic])

  useEffect(() => {
    const onPop = () => {
      if (!window.history.state?.xafChat) closeChatState()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [closeChatState])

  const closeChat = () => {
    if (window.history.state?.xafChat) window.history.back()
    else closeChatState()
  }

  const touchConversation = async (convId: string, preview: string) => {
    if (!profile) return
    const now = new Date().toISOString()
    setConversations((prev) =>
      prev
        .map((c) => (c.id === convId ? { ...c, last_message: preview, last_message_at: now } : c))
        .sort((a, b) => (b.last_message_at ?? '').localeCompare(a.last_message_at ?? ''))
    )
    await supabase
      .from('conversations')
      .update({ last_message: preview, last_message_at: now, last_message_sender_id: profile.id })
      .eq('id', convId)
  }

  // --- Envoi ---
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = newMessage.trim()
    if (!content || !profile || !activeConv || sending) return
    const replyId = replyTo?.id ?? null
    const tempId = `temp-${Date.now()}`

    setNewMessage('')
    setReplyTo(null)
    stickToBottom.current = true
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender_id: profile.id,
        content,
        created_at: new Date().toISOString(),
        message_type: 'text',
        reply_to_id: replyId,
        isTemp: true,
      },
    ])
    setSending(true)

    const { data: inserted, error: err } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConv.id,
        sender_id: profile.id,
        content,
        message_type: 'text',
        reply_to_id: replyId,
      })
      .select()
      .single()

    if (err || !inserted) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setNewMessage(content)
      setError('Message non envoyé. Vérifie ta connexion et réessaie.')
    } else {
      const real = inserted as Message
      setMessages((prev) =>
        prev.some((m) => m.id === real.id) ? prev.filter((m) => m.id !== tempId) : prev.map((m) => (m.id === tempId ? real : m))
      )
      void touchConversation(activeConv.id, content)
    }
    setSending(false)
  }

  const uploadMedia = async (blob: Blob, prefix: 'chat' | 'vocal', ext: string, contentType: string) => {
    if (!profile) return null
    const fileName = `${prefix}-${profile.id}-${Date.now()}.${ext}`
    const { error: err } = await supabase.storage.from('campaign-images').upload(fileName, blob, { contentType })
    if (err) return null
    return supabase.storage.from('campaign-images').getPublicUrl(fileName).data.publicUrl
  }

  const sendMedia = async (type: 'image' | 'audio', url: string, label: string) => {
    if (!profile || !activeConv) return
    const { data: inserted, error: err } = await supabase
      .from('messages')
      .insert({ conversation_id: activeConv.id, sender_id: profile.id, content: label, message_type: type, media_url: url })
      .select()
      .single()
    if (err || !inserted) {
      setError("Le message n'a pas pu être envoyé.")
      return
    }
    const real = inserted as Message
    stickToBottom.current = true
    setMessages((prev) => (prev.some((m) => m.id === real.id) ? prev : [...prev, real]))
    void touchConversation(activeConv.id, label)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !profile || !activeConv) return
    const ext = IMAGE_EXT[file.type]
    if (!ext) return setError('Format non supporté (JPG, PNG, WebP ou GIF).')
    if (file.size > MAX_IMAGE_BYTES) return setError('Image trop lourde (5 Mo maximum).')
    setUploading(true)
    const url = await uploadMedia(file, 'chat', ext, file.type)
    if (url) await sendMedia('image', url, '📷 Image')
    else setError("Échec de l'envoi de l'image.")
    setUploading(false)
  }

  // --- Vocal ---
  const stopRecording = useCallback(() => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    const r = mediaRecorderRef.current
    if (r && r.state !== 'inactive') r.stop()
    setIsRecording(false)
    setRecordTime(0)
  }, [])

  const startRecording = async () => {
    if (!profile || !activeConv || isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t))
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      recordCancelled.current = false
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data)
      }
      recorder.onstop = async () => {
        releaseMic()
        if (recordCancelled.current || audioChunksRef.current.length === 0) return
        const type = recorder.mimeType || 'audio/webm'
        const blob = new Blob(audioChunksRef.current, { type })
        const url = await uploadMedia(blob, 'vocal', type.includes('mp4') ? 'm4a' : 'webm', type)
        if (url) await sendMedia('audio', url, '🎤 Vocal')
        else setError("Échec de l'envoi du vocal.")
      }
      recorder.start()
      setIsRecording(true)
      setRecordTime(0)
      let elapsed = 0
      recordTimerRef.current = setInterval(() => {
        elapsed += 1
        setRecordTime(elapsed)
        if (elapsed >= MAX_AUDIO_SECONDS) stopRecording()
      }, 1000)
    } catch {
      releaseMic()
      setError('Micro non autorisé.')
    }
  }

  const cancelRecording = () => {
    recordCancelled.current = true
    stopRecording()
    releaseMic()
  }

  // --- Actions sur un message ---
  const reactToMessage = async (msg: Message, emoji: string) => {
    if (!profile) return
    const current = msg.reactions || {}
    const users = current[emoji] || []
    const newUsers = users.includes(profile.id) ? users.filter((id) => id !== profile.id) : [...users, profile.id]
    const next = { ...current, [emoji]: newUsers }
    if (newUsers.length === 0) delete next[emoji]
    setLongPressMessage(null)
    const { error: err } = await supabase.from('messages').update({ reactions: next }).eq('id', msg.id)
    if (err) return setError("La réaction n'a pas pu être enregistrée.")
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, reactions: next } : m)))
  }

  const deleteMessage = async (msg: Message) => {
    if (msg.sender_id !== profile?.id) return
    if (!confirm('Supprimer ce message ?')) return
    setLongPressMessage(null)
    const { error: err } = await supabase.from('messages').delete().eq('id', msg.id)
    if (err) return setError("Le message n'a pas pu être supprimé.")
    setMessages((prev) => prev.filter((m) => m.id !== msg.id))
  }

  const copyMessage = async (msg: Message) => {
    setLongPressMessage(null)
    try {
      await navigator.clipboard.writeText(msg.content || '')
    } catch {
      setError('Copie impossible.')
    }
  }

  const startLongPress = (msg: Message) => {
    if (msg.isTemp) return
    longPressTimer.current = setTimeout(() => setLongPressMessage(msg), 450)
  }
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // --- Nouveau message ---
  const searchUsers = useCallback(
    async (q: string) => {
      if (!profile) return
      let query = supabase.from('profiles').select('id, full_name').neq('id', profile.id).order('full_name').limit(50)
      const clean = q.trim().replace(/[%_\\,()]/g, '')
      if (clean) query = query.ilike('full_name', `%${clean}%`)
      const { data } = await query
      setAllUsers((data ?? []) as UserRow[])
    },
    [supabase, profile]
  )

  useEffect(() => {
    if (!showNewMessage) return
    const t = setTimeout(() => void searchUsers(userSearch), 250)
    return () => clearTimeout(t)
  }, [showNewMessage, userSearch, searchUsers])

  const startConversation = async (userId: string) => {
    if (!profile || startingConv.current) return
    startingConv.current = true
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select(CONV_SELECT)
        .or(`and(user1_id.eq.${profile.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${profile.id})`)
        .limit(1)
        .maybeSingle()
      let conv = existing as unknown as Conversation | null
      if (!conv) {
        const { data: created, error: err } = await supabase
          .from('conversations')
          .insert({
            user1_id: profile.id,
            user2_id: userId,
            last_message: 'Nouvelle conversation',
            last_message_at: new Date().toISOString(),
          })
          .select(CONV_SELECT)
          .single()
        if (err || !created) throw err
        conv = created as unknown as Conversation
      }
      const target = conv
      setConversations((prev) => (prev.some((c) => c.id === target.id) ? prev : [target, ...prev]))
      setShowNewMessage(false)
      setUserSearch('')
      openChat(target)
    } catch {
      setError('Impossible de démarrer la conversation.')
    } finally {
      startingConv.current = false
    }
  }

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => titleOf(c).toLowerCase().includes(q))
  }, [conversations, search, titleOf])

  const listTime = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    if (d.getTime() >= startToday) return formatTime(iso)
    if (d.getTime() >= startToday - 86400000) return 'Hier'
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  }

  const bottomInset = { paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }

  const errorBanner = error && (
    <div
      role="alert"
      className="fixed left-3 right-3 z-[300] bg-red-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg"
      style={{ top: 'max(env(safe-area-inset-top), 0.75rem)' }}
      onClick={() => setError(null)}
    >
      {error}
    </div>
  )

  if (loading)
    return (
      <main className="fixed inset-0 z-40 flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
      </main>
    )

  // ───────────── VUE CHAT ─────────────
  if (activeConv) {
    const title = titleOf(activeConv)
    return (
      <main className="fixed inset-0 z-40 flex flex-col bg-slate-50">
        {errorBanner}
        <header className="bg-white border-b border-slate-200 px-3 pb-3 flex items-center gap-3 shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}>
          <button onClick={closeChat} aria-label="Retour" className="w-10 h-10 shrink-0 text-slate-600 bg-slate-100 rounded-full flex items-center justify-center active:bg-slate-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          {isGroup && activeConv.group_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeConv.group_avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-white ${isGroup ? 'bg-emerald-500' : 'bg-sky-500'}`}>{title.charAt(0)}</div>
          )}
          <p className="font-bold text-slate-900 text-base truncate flex-1">{title}</p>
        </header>

        <div ref={scrollRef} onScroll={onScrollMessages} className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2">
          {messages.length === 0 && <p className="text-center text-sm text-slate-400 mt-10">Aucun message. Dis bonjour 👋</p>}
          {messages.map((m) => {
            const isMe = m.sender_id === profile?.id
            const replyMsg = m.reply_to_id ? messages.find((x) => x.id === m.reply_to_id) : null
            const reactions = Object.entries(m.reactions || {}).filter(([, u]) => u.length > 0)
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  onTouchStart={() => startLongPress(m)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  onTouchCancel={cancelLongPress}
                  onContextMenu={(e) => { e.preventDefault(); if (!m.isTemp) setLongPressMessage(m) }}
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[15px] break-words [-webkit-touch-callout:none] select-none ${isMe ? 'bg-sky-500 text-white rounded-br-md' : 'bg-white border border-slate-200 text-slate-900 rounded-bl-md'} ${m.isTemp ? 'opacity-70' : ''}`}
                >
                  {isGroup && !isMe && <p className="text-[11px] font-bold text-slate-500 mb-0.5">{m.sender?.full_name}</p>}
                  {replyMsg && (
                    <div className="mb-1.5 px-2 py-1 rounded-lg border-l-2 border-white/60 text-xs bg-black/10">
                      <p className="font-semibold truncate">{previewOf(replyMsg)}</p>
                    </div>
                  )}
                  {m.message_type === 'image' && m.media_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.media_url} alt="Image envoyée" loading="lazy" className="rounded-lg max-h-64 max-w-full" />
                  ) : m.message_type === 'audio' && m.media_url ? (
                    <audio controls preload="none" src={m.media_url} className="max-w-full mt-1" style={{ height: 40 }} />
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 px-1">{m.isTemp ? 'Envoi…' : formatTime(m.created_at)}</span>
                {reactions.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {reactions.map(([emoji, users]) => (
                      <button key={emoji} onClick={() => reactToMessage(m, emoji)} className={`px-2 py-1 rounded-full text-xs ${users.includes(profile?.id ?? '') ? 'bg-sky-100' : 'bg-slate-100'}`}>
                        {emoji} {users.length}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {replyTo && (
          <div className="bg-slate-100 border-t px-4 py-2 flex items-center gap-2 shrink-0">
            <div className="flex-1 min-w-0 border-l-2 border-sky-500 pl-2"><p className="text-xs text-slate-600 truncate">{previewOf(replyTo)}</p></div>
            <button onClick={() => setReplyTo(null)} aria-label="Annuler la réponse" className="text-slate-400 text-2xl w-10 h-10">×</button>
          </div>
        )}

        {isRecording && (
          <div className="fixed inset-0 z-[180] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6">
            <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center animate-pulse mb-6">
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z" /></svg>
            </div>
            <p className="text-3xl font-black mb-2">{Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')}</p>
            <div className="flex gap-4 mt-6">
              <button onClick={cancelRecording} className="px-8 py-3.5 bg-slate-700 rounded-xl font-bold">Annuler</button>
              <button onClick={stopRecording} className="px-8 py-3.5 bg-sky-500 rounded-xl font-bold">Envoyer</button>
            </div>
          </div>
        )}

        <form onSubmit={sendMessage} className="bg-white border-t px-3 pt-3 flex items-center gap-2 shrink-0" style={bottomInset}>
          <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageUpload} className="hidden" />
          <button type="button" aria-label="Envoyer une image" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center shrink-0 active:bg-slate-200">
            {uploading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écris un message…"
            enterKeyHint="send"
            autoComplete="off"
            maxLength={2000}
            className="flex-1 min-w-0 h-11 px-4 bg-slate-50 border border-slate-200 rounded-full text-base outline-none focus:border-sky-400"
          />
          {newMessage.trim() ? (
            <button type="submit" aria-label="Envoyer" disabled={sending} className="w-11 h-11 shrink-0 bg-sky-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 active:bg-sky-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          ) : (
            <button type="button" aria-label="Message vocal" onClick={startRecording} className="w-11 h-11 shrink-0 bg-sky-500 text-white rounded-full flex items-center justify-center active:bg-sky-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z" /></svg>
            </button>
          )}
        </form>

        {longPressMessage && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/60 p-4" onClick={() => setLongPressMessage(null)}>
            <div className="bg-white rounded-3xl w-full max-w-sm p-4" style={bottomInset} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-around items-center gap-1 bg-slate-50 rounded-full p-2 mb-4">
                {EMOJIS.map((emoji) => <button key={emoji} onClick={() => reactToMessage(longPressMessage, emoji)} className="text-2xl p-2 rounded-full active:scale-125">{emoji}</button>)}
              </div>
              <button onClick={() => { setReplyTo(longPressMessage); setLongPressMessage(null) }} className="w-full py-3.5 bg-sky-50 text-sky-600 font-bold rounded-xl text-sm mb-2">↩️ Répondre</button>
              {longPressMessage.message_type !== 'image' && longPressMessage.message_type !== 'audio' && (
                <button onClick={() => copyMessage(longPressMessage)} className="w-full py-3.5 bg-slate-50 text-slate-700 font-bold rounded-xl text-sm mb-2">📋 Copier</button>
              )}
              {longPressMessage.sender_id === profile?.id && <button onClick={() => deleteMessage(longPressMessage)} className="w-full py-3.5 bg-red-50 text-red-600 font-bold rounded-xl text-sm mb-2">🗑️ Supprimer</button>}
              <button onClick={() => setLongPressMessage(null)} className="w-full py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Annuler</button>
            </div>
          </div>
        )}
      </main>
    )
  }

  // ───────────── VUE LISTE ─────────────
  return (
    <main className="fixed inset-0 z-40 flex flex-col bg-slate-50">
      {errorBanner}
      <header className="bg-white border-b px-3 pb-3 shrink-0" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" aria-label="Retour" className="w-10 h-10 shrink-0 text-slate-600 bg-slate-100 rounded-full flex items-center justify-center active:bg-slate-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="font-bold text-slate-900 text-lg flex-1">Messages</h1>
          <button onClick={() => { setShowNewMessage(true); setUserSearch('') }} aria-label="Nouveau message" className="w-10 h-10 bg-sky-500 text-white rounded-full flex items-center justify-center active:bg-sky-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une conversation" className="w-full h-11 mt-3 px-4 bg-slate-50 border border-slate-200 rounded-full text-base outline-none focus:border-sky-400" />
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
        {filteredConversations.length === 0 && (
          <div className="text-center mt-16 px-6">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-slate-700 font-semibold">{search ? 'Aucun résultat' : 'Aucune conversation'}</p>
            {!search && <button onClick={() => setShowNewMessage(true)} className="mt-4 px-5 py-3 bg-sky-500 text-white font-bold rounded-xl text-sm">Écrire un message</button>}
          </div>
        )}
        {filteredConversations.map((c) => {
          const name = titleOf(c)
          return (
            <button key={c.id} onClick={() => openChat(c)} className="w-full text-left bg-white border rounded-2xl p-3.5 shadow-sm active:bg-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-bold text-white ${c.is_group ? 'bg-emerald-500' : 'bg-sky-500'}`}>{name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold text-slate-900 text-[15px] truncate">{name}</p>
                    <span className="text-[11px] text-slate-400 shrink-0">{listTime(c.last_message_at)}</span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{c.last_message}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {showNewMessage && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-end justify-center" onClick={() => setShowNewMessage(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-5 max-h-[80dvh] flex flex-col" style={bottomInset} onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-slate-900 text-lg mb-3">Nouveau message</h2>
            <input type="search" autoFocus placeholder="Chercher un nom…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="w-full h-11 px-4 mb-3 bg-slate-50 border rounded-xl text-base outline-none focus:border-sky-400" />
            <div className="flex-1 overflow-y-auto overscroll-contain space-y-2">
              {allUsers.length === 0 && <p className="text-center text-sm text-slate-400 py-6">Aucun utilisateur trouvé</p>}
              {allUsers.map((u) => (
                <button key={u.id} onClick={() => startConversation(u.id)} className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl active:bg-slate-100 text-left">
                  <div className="w-10 h-10 shrink-0 bg-sky-500 text-white rounded-full flex items-center justify-center font-bold">{u.full_name?.charAt(0) || '?'}</div>
                  <p className="font-bold text-slate-900 text-sm truncate">{u.full_name || 'Utilisateur'}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setShowNewMessage(false)} className="w-full py-3.5 mt-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
          </div>
        </div>
      )}
    </main>
  )
}
