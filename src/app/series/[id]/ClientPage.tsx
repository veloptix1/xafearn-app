'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SeriesDetailClient() {
  const supabase = createClient()
  const router = useRouter()
  const [seriesId, setSeriesId] = useState<string | null>(null)
  const [series, setSeries] = useState<any>(null)
  const [episodes, setEpisodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 🔥 Lire l'ID depuis le HASH
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      setSeriesId(hash)
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!seriesId) return
    
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')

      const { data: s } = await supabase.from('series').select('*, profiles(full_name)').eq('id', seriesId).single()
      if (!s) { setLoading(false); return }
      setSeries(s)

      const { data: e } = await supabase.from('episodes').select('*').eq('series_id', seriesId).order('episode_number', { ascending: true })
      setEpisodes(e || [])
      setLoading(false)
    }
    load()
  }, [supabase, router, seriesId])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  if (!seriesId || !series) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <p className="text-slate-500 mb-4">Série introuvable.</p>
      <Link href="/series" className="px-6 py-3 bg-sky-500 text-white font-bold rounded-xl">Retour</Link>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/series" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1 truncate">{series.title}</h1>
      </header>

      <div className="p-4 max-w-md mx-auto">
        {series.cover_url && <img src={series.cover_url} alt="" className="w-full h-48 object-cover rounded-2xl mb-4" />}
        <h2 className="text-xl font-black text-slate-900 mb-1">{series.title}</h2>
        <p className="text-xs text-slate-500 mb-4">Par {series.profiles?.full_name || 'Auteur'}</p>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{series.description}</p>

        <h3 className="font-bold text-slate-900 mb-3">Épisodes ({episodes.length})</h3>
        <div className="space-y-2">
          {episodes.map(ep => (
            <div key={ep.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900 text-sm">Ép. {ep.episode_number} : {ep.title}</p>
                  <p className="text-[10px] text-slate-500">{ep.is_free ? 'Gratuit' : `${ep.price_in_coins} jetons`}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${ep.is_free ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {ep.is_free ? 'Gratuit' : 'Payant'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
