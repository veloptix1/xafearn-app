'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AnalyticsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ views: 0, clicks: 0, spent: 0 })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: campaigns } = await supabase.from('campaigns').select('*').eq('user_id', user.id)
      
      const views = campaigns?.reduce((acc, c) => acc + (c.views_purchased || 0), 0) || 0
      const spent = campaigns?.reduce((acc, c) => acc + (c.budget || 0), 0) || 0
      
      setStats({ views, clicks: 0, spent })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Tableau de bord Annonceur</h1>
      </header>

      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
            <p className="text-xs font-bold text-slate-500 uppercase">Vues</p>
            <p className="text-2xl font-black text-slate-900">{stats.views}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
            <p className="text-xs font-bold text-slate-500 uppercase">Clics</p>
            <p className="text-2xl font-black text-slate-900">{stats.clicks}</p>
          </div>
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm text-center">
            <p className="text-xs font-bold text-slate-500 uppercase">Dépensé</p>
            <p className="text-2xl font-black text-slate-900">{stats.spent} F</p>
          </div>
        </div>
      </div>
    </main>
  )
}
