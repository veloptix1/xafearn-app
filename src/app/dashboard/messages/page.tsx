'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function MessagesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const { data } = await supabase
        .from('conversations')
        .select(`
          id, last_message, last_message_at, is_group, group_name, group_avatar_url, user1_id, user2_id,
          user1:user1_id(id, full_name), user2:user2_id(id, full_name)
        `)
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .order('last_message_at', { ascending: false })

      setConversations(data || [])
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const filtered = conversations.filter(c => {
    if (!search.trim() || !profile) return true
    const name = c.is_group ? c.group_name : (c.user1_id === profile.id ? c.user2?.full_name : c.user1?.full_name)
    return name?.toLowerCase().includes(search.toLowerCase())
  })

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Messages</h1>
      </header>

      <div className="p-4 max-w-md mx-auto">
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 mb-4 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500"
        />

        <div className="space-y-2">
          {filtered.map(c => {
            const isGroup = c.is_group
            const other = c.user1_id === profile?.id ? c.user2 : c.user1
            const name = isGroup ? c.group_name : other?.full_name
            const avatar = isGroup ? c.group_avatar_url : null

            return (
              <Link key={c.id} href={`/dashboard/messages/${c.id}`} className="block bg-white border border-slate-200 rounded-2xl p-4 shadow-sm active:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                  {avatar ? (
                    <img src={avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg ${isGroup ? 'bg-emerald-500' : 'bg-sky-500'}`}>
                      {name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{name || 'Utilisateur'}</p>
                    <p className="text-xs text-slate-500 truncate">{c.last_message || 'Nouvelle conversation'}</p>
                  </div>
                </div>
              </Link>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">Aucune conversation.</div>
          )}
        </div>
      </div>
    </main>
  )
}
