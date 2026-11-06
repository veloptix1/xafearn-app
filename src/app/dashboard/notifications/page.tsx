'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NotificationsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setNotifications(data || [])
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const markAsRead = async (id: string, link: string | null) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    if (link) router.push(link)
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    setMarking(true)
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setMarking(false)
  }

  const getIcon = (title: string) => {
    if (title.includes('Bienvenue')) return <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
    if (title.includes('validée') || title.includes('Diffusion')) return <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    if (title.includes('Retrait') || title.includes('payé')) return <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    if (title.includes('rejetée') || title.includes('rejeté')) return <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    if (title.includes('test') || title.includes('Test')) return <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    return <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMin < 1) return 'À l\'instant'
    if (diffMin < 60) return `Il y a ${diffMin} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  const filtered = filter === 'all' ? notifications : notifications.filter(n => !n.is_read)
  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Notifications</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto mt-2 space-y-4">
        
        <div className="flex justify-between items-center">
          <div className="flex bg-slate-200 p-1 rounded-xl">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              Toutes ({notifications.length})
            </button>
            <button onClick={() => setFilter('unread')} className={`px-4 py-2 text-xs font-bold rounded-lg transition ${filter === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              Non lues ({unreadCount})
            </button>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} disabled={marking} className="text-xs font-bold text-sky-600 disabled:opacity-50">
              {marking ? '...' : 'Tout lire'}
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">
              {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </h3>
            <p className="text-slate-500 text-sm">
              {filter === 'unread' ? 'Tu es à jour !' : 'Tes notifications apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <button
                key={n.id}
                onClick={() => markAsRead(n.id, n.link)}
                className={`w-full text-left p-4 rounded-2xl border transition flex items-start gap-3 ${
                  n.is_read 
                    ? 'bg-white border-slate-200 active:bg-slate-50' 
                    : 'bg-sky-50 border-sky-200 active:bg-sky-100 shadow-sm'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  n.is_read ? 'bg-slate-100' : 'bg-white shadow-sm'
                }`}>
                  {getIcon(n.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-0.5">
                    <h3 className={`text-xs ${n.is_read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                      {n.title}
                    </h3>
                    <span className="text-[9px] text-slate-400 whitespace-nowrap ml-2 shrink-0">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${n.is_read ? 'text-slate-500' : 'text-slate-600'}`}>
                    {n.message}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="w-1.5 h-1.5 bg-sky-500 rounded-full shrink-0 mt-2"></div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
