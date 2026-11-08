'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SeriesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [series, setSeries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSeries, setActiveSeries] = useState<any>(null)
  const [episodes, setEpisodes] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data } = await supabase.from('series').select('*').eq('is_published', true).order('created_at', { ascending: false })
      setSeries(data || [])
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const openSeries = async (s: any) => {
    setActiveSeries(s)
    const { data } = await supabase.from('episodes').select('*').eq('series_id', s.id).order('episode_number', { ascending: true })
    setEpisodes(data || [])
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  // VUE DÉTAIL
  if (activeSeries) {
    return (
      <main className="min-h-screen bg-slate-50 pb-24">
        <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
          <button onClick={() => setActiveSeries(null)} className="text-slate-500 bg-slate-100 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
          <h1 className="font-bold text-slate-900 flex-1 truncate">{activeSeries.title}</h1>
        </header>
        <div className="p-4 max-w-md mx-auto">
          {activeSeries.cover_url && <img src={activeSeries.cover_url} alt="" className="w-full h-48 object-cover rounded-2xl mb-4" />}
          <h2 className="text-xl font-black text-slate-900 mb-1">{activeSeries.title}</h2>
          <p className="text-sm text-slate-600 mb-6">{activeSeries.description}</p>
          <h3 className="font-bold text-slate-900 mb-3">Épisodes ({episodes.length})</h3>
          <div className="space-y-2">
            {episodes.map(ep => (
              <div key={ep.id} className="bg-white border border-slate-200 rounded-2xl p-4">
                <p className="font-bold text-slate-900 text-sm">Ép. {ep.episode_number} : {ep.title}</p>
                <p className="text-[10px] text-slate-500">{ep.is_free ? 'Gratuit' : `${ep.price_in_coins} jetons`}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    )
  }

  // VUE GRILLE
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></Link>
        <h1 className="font-bold text-slate-900 flex-1">Séries</h1>
      </header>
      <div className="p-4 max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {series.map(s => (
            <div key={s.id} onClick={() => openSeries(s)} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm active:scale-95 cursor-pointer">
              {s.cover_url ? <img src={s.cover_url} alt="" className="w-full h-32 object-cover" /> : <div className="w-full h-32 bg-slate-100" />}
              <div className="p-3">
                <h3 className="font-bold text-slate-900 text-xs line-clamp-2">{s.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
