'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()
  
  // État de la liste
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')

  // État du chat actif
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [otherUser, setOtherUser] = useState<any>(null)
  const [isGroup, setIsGroup] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const { data } = await supabase
        .from('conversations')
        .select(`id, last_message, last_message_at, is_group, group_name, group_avatar_url, user1_id, user2_id, user1:user1_id(id, full_name), user2:user2_id(id, full_name)`)
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .order('last_message_at', { ascending: false })

      setConversations(data || [])
      setLoading(false)
    }
    load()
  }, [supabase, router])

  // Charger le chat quand on clique
  const openChat = async (conv: any) => {
    setActiveConvId(conv.id)
    setIsGroup(conv.is_group)
    
    if (conv.is_group) {
      setOtherUser({ full_name: conv.group_name, group_avatar_url: conv.group_avatar_url })
    } else {
      const other = conv.user1_id === profile?.id ? conv.user2 : conv.user1
      setOtherUser(other)
    }

    const { data } = await supabase.from('messages').select('*, sender:sender_id(full_name)').eq('conversation_id', conv.id).order('created_at', { ascending: true })
    setMessages(data || [])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    // Realtime
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase.channel(`chat-${conv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` }, (payload: any) => {
        setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()
  }

  const closeChat = () => {
    setActiveConvId(null)
    setMessages([])
    if (channelRef.current) supabase.removeChannel(channelRef.current)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !profile || !activeConvId) return

    const content = newMessage.trim()
    setNewMessage('')
    
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, sender_id: profile.id, content, created_at: new Date().toISOString() }])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    setSending(true)

    try {
      const { data: inserted } = await supabase.from('messages').insert({
        conversation_id: activeConvId, sender_id: profile.id, content, message_type: 'text'
      }).select().single()

      if (inserted) setMessages(prev => prev.map(m => m.id === tempId ? inserted : m))
      await supabase.from('conversations').update({ last_message: content, last_message_at: new Date().toISOString(), last_message_sender_id: profile.id }).eq('id', activeConvId)
    } catch { alert('Erreur') }
    setSending(false)
  }

  // Ouvrir la modale "Nouveau message"
  const openNewMessage = async () => {
    setShowNewMessage(true)
    if (allUsers.length === 0) {
      const { data } = await supabase.from('profiles').select('id, full_name').neq('id', profile?.id || '').order('full_name')
      setAllUsers(data || [])
    }
  }

  // Démarrer une conversation
  const startConversation = async (userId: string) => {
    if (!profile) return
    const { data: existing } = await supabase.from('conversations').select('id').or(`and(user1_id.eq.${profile.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${profile.id})`).maybeSingle()
    
    if (existing) {
      setShowNewMessage(false)
      openChat({ id: existing.id, user1_id: profile.id, user2_id: userId, user1: profile, user2: null }) // On simplifie, le chat rechargera
      return
    }

    const { data: newConv } = await supabase.from('conversations').insert({ user1_id: profile.id, user2_id: userId, last_message: 'Nouvelle conversation', last_message_at: new Date().toISOString() }).select('id').single()
    
    if (newConv) {
      setShowNewMessage(false)
      window.location.reload() // Recharger pour voir la nouvelle conv
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  // ================= VUE CHAT =================
  if (activeConvId) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={closeChat} className="text-slate-500 bg-slate-100 p-2 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          {isGroup && otherUser?.group_avatar_url ? (
            <img src={otherUser.group_avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${isGroup ? 'bg-emerald-500' : 'bg-sky-500'}`}>
              {otherUser?.full_name?.charAt(0) || '?'}
            </div>
          )}
          <p className="font-bold text-slate-900 text-sm truncate flex-1">{otherUser?.full_name || 'Conversation'}</p>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map(m => {
            const isMe = m.sender_id === profile?.id
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white border border-slate-200 rounded-bl-none'}`}>
                  {isGroup && !isMe && <p className="text-[10px] font-bold text-slate-500">{m.sender?.full_name}</p>}
                  <p>{m.content}</p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="bg-white border-t border-slate-200 p-3 flex gap-2">
          <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Écris..." className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-full text-sm outline-none" />
          <button type="submit" disabled={sending || !newMessage.trim()} className="w-11 h-11 bg-sky-500 text-white rounded-full flex items-center justify-center disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </main>
    )
  }

  // ================= VUE LISTE =================
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></Link>
        <h1 className="font-bold text-slate-900 flex-1">Messages</h1>
        <button onClick={openNewMessage} className="w-9 h-9 bg-sky-500 text-white rounded-full flex items-center justify-center active:scale-95 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
        </button>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-2">
        {conversations.map(c => {
          const isG = c.is_group
          const other = c.user1_id === profile?.id ? c.user2 : c.user1
          const name = isG ? c.group_name : other?.full_name
          return (
            <div key={c.id} onClick={() => openChat(c)} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm active:bg-slate-100 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${isG ? 'bg-emerald-500' : 'bg-sky-500'}`}>{name?.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{name}</p>
                  <p className="text-xs text-slate-500 truncate">{c.last_message}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modale Nouveau Message */}
      {showNewMessage && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 flex items-end justify-center p-4" onClick={() => setShowNewMessage(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-5 mb-4 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-slate-900 mb-3">Nouveau message</h2>
            <input type="text" placeholder="Chercher..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="w-full p-3 mb-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            <div className="flex-1 overflow-y-auto space-y-2">
              {allUsers.filter(u => u.full_name?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                <button key={u.id} onClick={() => startConversation(u.id)} className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl active:bg-slate-100">
                  <div className="w-10 h-10 bg-sky-500 text-white rounded-full flex items-center justify-center font-bold">{u.full_name?.charAt(0)}</div>
                  <p className="font-bold text-slate-900 text-sm">{u.full_name}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setShowNewMessage(false)} className="w-full py-3 mt-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
          </div>
        </div>
      )}
    </main>
  )
}
