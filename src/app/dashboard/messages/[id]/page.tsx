'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PAGE_SIZE = 50

export default function ChatPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [isGroup, setIsGroup] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isScrolledUp, setIsScrolledUp] = useState(false)

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:sender_id(full_name)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(PAGE_SIZE)
    setMessages(data || [])
  }, [supabase, conversationId])

  useEffect(() => {
    let isMounted = true
    
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const { data: conv } = await supabase.from('conversations').select('*, user1:user1_id(*), user2:user2_id(*)').eq('id', conversationId).single()
      if (conv) {
        if (conv.is_group) {
          setIsGroup(true)
          setOtherUser({ full_name: conv.group_name, group_avatar_url: conv.group_avatar_url })
        } else {
          const other = conv.user1_id === session.user.id ? conv.user2 : conv.user1
          setOtherUser(other)
        }
      }

      await loadMessages()
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

      // Realtime : écouter les nouveaux messages
      const channel = supabase.channel(`chat-${conversationId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
          if (!isMounted) return
          setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    
    init()
    return () => { isMounted = false }
  }, [conversationId, supabase, router, loadMessages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !profile) return

    const content = newMessage.trim()
    setNewMessage('')
    
    // Optimistic UI : affichage instantané
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId, conversation_id: conversationId, sender_id: profile.id,
      content, created_at: new Date().toISOString(), isTemp: true
    }])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    setSending(true)
    try {
      const { data: inserted, error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        content,
        message_type: 'text'
      }).select().single()

      if (error) throw error

      setMessages(prev => prev.map(m => m.id === tempId ? { ...inserted, sender: profile } : m))
      await supabase.from('conversations').update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        last_message_sender_id: profile.id
      }).eq('id', conversationId)
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      alert('Erreur envoi')
    }
    setSending(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50 flex items-center gap-3 shrink-0">
        <button onClick={() => router.push('/dashboard/messages')} className="text-slate-500 bg-slate-100 p-2 rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        {isGroup && otherUser?.group_avatar_url ? (
          <img src={otherUser.group_avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${isGroup ? 'bg-emerald-500' : 'bg-sky-500'}`}>
            {otherUser?.full_name?.charAt(0) || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{otherUser?.full_name}</p>
        </div>
      </header>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 pb-4">
        {messages.map(m => {
          const isMe = m.sender_id === profile?.id
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                isMe ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
              } ${m.isTemp ? 'opacity-70' : ''}`}>
                {isGroup && !isMe && (
                  <p className="text-[10px] font-bold text-slate-500 mb-0.5">{m.sender?.full_name || 'Membre'}</p>
                )}
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={`text-[9px] mt-1 ${isMe ? 'text-sky-100' : 'text-slate-400'}`}>
                  {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 p-3 pb-safe">
        <form onSubmit={sendMessage} className="flex gap-2 items-center">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Écris un message..."
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-full text-sm outline-none focus:border-sky-500"
          />
          <button type="submit" disabled={sending || !newMessage.trim()} className="w-11 h-11 bg-sky-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </div>
    </main>
  )
}
