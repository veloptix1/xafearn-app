'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏']

export default function ChatPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const typingTimeout = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<any>(null)

  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [isGroup, setIsGroup] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isScrolledUp, setIsScrolledUp] = useState(false)
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [replyTo, setReplyTo] = useState<any>(null)
  const [longPressMessage, setLongPressMessage] = useState<any>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:sender_id(full_name)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100)
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

      // Realtime
      channelRef.current = supabase.channel(`chat-${conversationId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
          if (!isMounted) return
          setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
          if (!isScrolledUp) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        })
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          if (!isMounted || !otherUser) return
          if (payload.payload?.user_id === otherUser.id) {
            setIsOtherTyping(payload.payload.is_typing)
            if (typingTimeout.current) clearTimeout(typingTimeout.current)
            if (payload.payload.is_typing) typingTimeout.current = setTimeout(() => setIsOtherTyping(false), 3000)
          }
        })
        .subscribe()
    }
    
    init()
    return () => {
      isMounted = false
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    }
  }, [conversationId, supabase, router, loadMessages, isScrolledUp, otherUser])

  const handleTyping = (value: string) => {
    setNewMessage(value)
    if (!profile || !channelRef.current) return
    channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: profile.id, is_typing: true } })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { user_id: profile.id, is_typing: false } })
    }, 2000)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !profile) return

    const content = newMessage.trim()
    const replyId = replyTo?.id
    setNewMessage(''); setReplyTo(null)
    
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId, conversation_id: conversationId, sender_id: profile.id,
      content, created_at: new Date().toISOString(), isTemp: true, reply_to_id: replyId
    }])
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    setSending(true)
    try {
      const { data: inserted, error } = await supabase.from('messages').insert({
        conversation_id: conversationId, sender_id: profile.id, content,
        message_type: 'text', reply_to_id: replyId || null
      }).select().single()

      if (error) throw error
      setMessages(prev => prev.map(m => m.id === tempId ? { ...inserted, sender: profile } : m))
      await supabase.from('conversations').update({
        last_message: content, last_message_at: new Date().toISOString(), last_message_sender_id: profile.id
      }).eq('id', conversationId)
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      alert('Erreur envoi')
    }
    setSending(false)
  }

  // 📷 Upload Image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (file.size > 10 * 1024 * 1024) return alert('Image max 10 Mo')

    setUploading(true)
    setShowAttachMenu(false)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `chat-${profile.id}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('campaign-images').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('campaign-images').getPublicUrl(fileName)

      const { data: inserted } = await supabase.from('messages').insert({
        conversation_id: conversationId, sender_id: profile.id,
        content: '📷 Image', message_type: 'image', media_url: publicUrl
      }).select().single()

      if (inserted) setMessages(prev => [...prev, inserted])
      await supabase.from('conversations').update({ last_message: '📷 Image', last_message_at: new Date().toISOString(), last_message_sender_id: profile.id }).eq('id', conversationId)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err: any) { alert('Erreur upload: ' + err.message) }
    setUploading(false)
  }

  // 🎤 Enregistrement vocal
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (ev) => { if (ev.data.size > 0) audioChunksRef.current.push(ev.data) }
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([audioBlob], `vocal-${Date.now()}.webm`, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        await uploadAudio(file)
      }
      mediaRecorder.start()
      setIsRecording(true); setRecordTime(0)
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch (err) { alert('Micro non autorisé') }
  }

  const stopRecording = () => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop()
    setIsRecording(false); setRecordTime(0)
  }

  const cancelRecording = () => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false); setRecordTime(0)
  }

  const uploadAudio = async (file: File) => {
    if (!profile) return
    setUploading(true)
    try {
      const fileName = `vocal-${profile.id}-${Date.now()}.webm`
      const { error } = await supabase.storage.from('campaign-images').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('campaign-images').getPublicUrl(fileName)

      const { data: inserted } = await supabase.from('messages').insert({
        conversation_id: conversationId, sender_id: profile.id,
        content: '🎤 Vocal', message_type: 'audio', media_url: publicUrl
      }).select().single()

      if (inserted) setMessages(prev => [...prev, inserted])
      await supabase.from('conversations').update({ last_message: '🎤 Vocal', last_message_at: new Date().toISOString(), last_message_sender_id: profile.id }).eq('id', conversationId)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err: any) { alert('Erreur: ' + err.message) }
    setUploading(false)
  }

  // ⚡ Réactions
  const reactToMessage = async (msg: any, emoji: string) => {
    if (!profile) return
    try {
      const currentReactions = msg.reactions || {}
      const users = currentReactions[emoji] || []
      let newUsers: string[]
      if (users.includes(profile.id)) newUsers = users.filter((id: string) => id !== profile.id)
      else newUsers = [...users, profile.id]
      
      const newReactions = { ...currentReactions, [emoji]: newUsers }
      if (newUsers.length === 0) delete newReactions[emoji]
      
      await supabase.from('messages').update({ reactions: newReactions }).eq('id', msg.id)
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: newReactions } : m))
      setLongPressMessage(null)
    } catch (err) { alert('Erreur') }
  }

  // 👆 Appui long
  const handleTouchStart = (msg: any) => {
    longPressTimer.current = setTimeout(() => setLongPressMessage(msg), 500)
  }
  const handleTouchEnd = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
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
          {isOtherTyping && <p className="text-[10px] text-sky-500 font-bold">En train d'écrire...</p>}
        </div>
      </header>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 pb-4">
        {messages.map(m => {
          const isMe = m.sender_id === profile?.id
          const replyMsg = m.reply_to_id ? messages.find(x => x.id === m.reply_to_id) : null
          const reactions = Object.entries(m.reactions || {}).filter(([_, u]: any) => u.length > 0)

          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div
                onTouchStart={() => handleTouchStart(m)}
                onTouchEnd={handleTouchEnd}
                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${
                  isMe ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                } ${m.isTemp ? 'opacity-70' : ''}`}
              >
                {isGroup && !isMe && (
                  <p className="text-[10px] font-bold text-slate-500 mb-0.5">{m.sender?.full_name || 'Membre'}</p>
                )}
                {replyMsg && (
                  <div className={`mb-1 px-2 py-1 rounded-lg border-l-2 text-[10px] ${isMe ? 'bg-sky-600/30 border-white/50 text-sky-100' : 'bg-slate-100 border-sky-400 text-slate-600'}`}>
                    <p className="font-bold truncate">{replyMsg.sender?.full_name || 'Réponse'}</p>
                    <p className="truncate">{replyMsg.content}</p>
                  </div>
                )}

                {m.message_type === 'image' && m.media_url ? (
                  <img src={m.media_url} alt="" className="rounded-lg max-h-64 w-auto" />
                ) : m.message_type === 'audio' && m.media_url ? (
                  <audio controls src={m.media_url} className="max-w-full mt-1" style={{ height: 40 }} />
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}

                <p className={`text-[9px] mt-1 ${isMe ? 'text-sky-100' : 'text-slate-400'}`}>
                  {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {reactions.length > 0 && (
                <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {reactions.map(([emoji, users]: any) => (
                    <button key={emoji} onClick={() => reactToMessage(m, emoji)} className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-0.5 ${users.includes(profile?.id) ? 'bg-sky-100' : 'bg-slate-100'}`}>
                      <span>{emoji}</span><span className="font-bold">{users.length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="bg-slate-100 border-t border-slate-200 px-4 py-2 flex items-center gap-2">
          <div className="flex-1 min-w-0 border-l-2 border-sky-500 pl-2">
            <p className="text-[10px] font-bold text-sky-600">{replyTo.sender?.full_name || 'Réponse'}</p>
            <p className="text-xs text-slate-600 truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-slate-400 text-xl px-2">×</button>
        </div>
      )}

      {/* Attach Menu */}
      {showAttachMenu && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowAttachMenu(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4"></div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { fileInputRef.current?.click(); }} className="flex flex-col items-center gap-2 p-3 rounded-xl active:bg-slate-50">
                <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <span className="text-[10px] font-medium text-slate-600">Galerie</span>
              </button>
              <button onClick={() => { cameraInputRef.current?.click(); }} className="flex flex-col items-center gap-2 p-3 rounded-xl active:bg-slate-50">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <span className="text-[10px] font-medium text-slate-600">Caméra</span>
              </button>
              <button onClick={() => { setShowAttachMenu(false); startRecording(); }} className="flex flex-col items-center gap-2 p-3 rounded-xl active:bg-slate-50">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z" /></svg>
                </div>
                <span className="text-[10px] font-medium text-slate-600">Vocal</span>
              </button>
            </div>
            <button onClick={() => setShowAttachMenu(false)} className="w-full py-3 mt-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Annuler</button>
          </div>
        </div>
      )}

      {/* Enregistrement vocal */}
      {isRecording && (
        <div className="fixed inset-0 z-[180] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6">
          <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center animate-pulse mb-6">
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z" /></svg>
          </div>
          <p className="text-3xl font-black mb-2">{Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')}</p>
          <p className="text-sm text-slate-300 mb-8">Enregistrement...</p>
          <div className="flex gap-4">
            <button onClick={cancelRecording} className="px-8 py-3 bg-slate-700 rounded-xl font-bold">Annuler</button>
            <button onClick={stopRecording} className="px-8 py-3 bg-sky-500 rounded-xl font-bold">Envoyer</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-slate-200 p-3 pb-safe">
        <form onSubmit={sendMessage} className="flex gap-2 items-center">
          <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
          <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
          
          <button type="button" onClick={() => setShowAttachMenu(true)} className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center shrink-0">
            {uploading ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={e => handleTyping(e.target.value)}
            placeholder="Écris un message..."
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-full text-sm outline-none focus:border-sky-500"
          />
          
          {newMessage.trim() ? (
            <button type="submit" disabled={sending} className="w-11 h-11 bg-sky-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          ) : (
            <button type="button" onClick={startRecording} disabled={uploading} className="w-11 h-11 bg-sky-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 shrink-0">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-2z" /></svg>
            </button>
          )}
        </form>
      </div>

      {/* Long press menu */}
      {longPressMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4" onClick={() => setLongPressMessage(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-around items-center gap-1 bg-slate-50 rounded-full p-2 mb-4">
              {EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => reactToMessage(longPressMessage, emoji)} className="text-2xl p-2 rounded-full active:scale-125 transition">
                  {emoji}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setReplyTo(longPressMessage); setLongPressMessage(null) }} className="py-3 bg-sky-50 text-sky-600 font-bold rounded-xl text-sm">
                ↩️ Répondre
              </button>
              {longPressMessage.sender_id === profile?.id && (
                <button onClick={async () => {
                  if (!confirm('Supprimer ce message ?')) return
                  await supabase.from('messages').delete().eq('id', longPressMessage.id)
                  setMessages(prev => prev.filter(m => m.id !== longPressMessage.id))
                  setLongPressMessage(null)
                }} className="py-3 bg-red-50 text-red-600 font-bold rounded-xl text-sm">
                  🗑️ Supprimer
                </button>
              )}
            </div>
            <button onClick={() => setLongPressMessage(null)} className="w-full py-3 mt-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Annuler</button>
          </div>
        </div>
      )}

    </main>
  )
}
