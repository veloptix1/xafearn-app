'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['Tout', 'Romance', 'Action', 'Thriller', 'Fantastique', 'Science-Fiction', 'Drame', 'Comédie', 'Horreur', 'Aventure']

export default function SeriesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [series, setSeries] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Tout')
  const [profile, setProfile] = useState<any>(null)
  
  // Détail
  const [activeSeries, setActiveSeries] = useState<any>(null)
  const [episodes, setEpisodes] = useState<any[]>([])
  const [unlockedIds, setUnlockedIds] = useState<string[]>([])
  const [activeEpisode, setActiveEpisode] = useState<any>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)
      const { data } = await supabase.from('series').select('*, profiles(full_name)').eq('is_published', true).order('created_at', { ascending: false })
      setSeries(data || []); setFiltered(data || [])
      setLoading(false)
    }
    load()
  }, [supabase, router])

  useEffect(() => {
    let res = series
    if (category !== 'Tout') res = res.filter(s => s.category === category)
    if (search.trim()) res = res.filter(s => s.title?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()))
    setFiltered(res)
  }, [search, category, series])

  const openSeries = async (s: any) => {
    setActiveSeries(s)
    const { data: e } = await supabase.from('episodes').select('*').eq('series_id', s.id).order('episode_number', { ascending: true })
    setEpisodes(e || [])
    if (profile) {
      const { data: unlocks } = await supabase.from('episode_unlocks').select('episode_id').eq('user_id', profile.id)
      setUnlockedIds(unlocks?.map(u => u.episode_id) || [])
      const { data: fav } = await supabase.from('series_favorites').select('id').eq('user_id', profile.id).eq('series_id', s.id).maybeSingle()
      setIsFavorite(!!fav)
    }
  }

  const toggleFavorite = async () => {
    if (!profile) return router.push('/login')
    if (isFavorite) await supabase.from('series_favorites').delete().eq('user_id', profile.id).eq('series_id', activeSeries.id)
    else await supabase.from('series_favorites').insert({ user_id: profile.id, series_id: activeSeries.id })
    setIsFavorite(!isFavorite)
  }

  const unlockEpisode = async (ep: any) => {
    if (!profile) return router.push('/login')
    if ((profile.coins_balance || 0) < ep.price_in_coins) return alert('Solde insuffisant')
    setIsUnlocking(true)
    const { error } = await supabase.rpc('unlock_episode', { p_episode_id: ep.id, p_user_id: profile.id })
    if (!error) {
      setUnlockedIds(prev => [...prev, ep.id])
      setProfile({ ...profile, coins_balance: profile.coins_balance - ep.price_in_coins })
      setActiveEpisode(ep)
      await supabase.rpc('increment_episode_views', { p_episode_id: ep.id, p_series_id: activeSeries.id })
    }
    setIsUnlocking(false)
  }

  const playEpisode = async (ep: any) => {
    setActiveEpisode(ep)
    await supabase.rpc('increment_episode_views', { p_episode_id: ep.id, p_series_id: activeSeries.id })
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  // LECTEUR
  if (activeEpisode) {
    return (
      <main className="min-h-screen bg-black flex flex-col">
        <header className="px-4 py-3 flex items-center gap-3 bg-black/50">
          <button onClick={() => setActiveEpisode(null)} className="text-white bg-white/20 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
          <div><p className="text-[10px] text-sky-400 font-bold">ÉP. {activeEpisode.episode_number}</p><p className="text-sm text-white font-bold">{activeEpisode.title}</p></div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          {activeSeries.content_type === 'video' && activeEpisode.content_media_url ? (
            <video ref={videoRef} src={activeEpisode.content_media_url} controls autoPlay playsInline className="w-full h-full object-contain" />
          ) : activeSeries.content_type === 'image' && activeEpisode.content_media_url ? (
            <img src={activeEpisode.content_media_url} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full overflow-y-auto p-6 bg-slate-900"><p className="text-slate-200 whitespace-pre-wrap">{activeEpisode.content_text}</p></div>
          )}
        </div>
      </main>
    )
  }

  // DÉTAIL
  if (activeSeries) {
    return (
      <main className="min-h-screen bg-slate-50 pb-24">
        <header className="bg-white border-b px-4 py-4 flex items-center gap-3">
          <button onClick={() => setActiveSeries(null)} className="text-slate-500 bg-slate-100 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
          <h1 className="font-bold text-slate-900 flex-1 truncate">{activeSeries.title}</h1>
        </header>
        <div className="p-4 max-w-md mx-auto">
          {activeSeries.cover_url && <img src={activeSeries.cover_url} alt="" className="w-full h-48 object-cover rounded-2xl mb-4" />}
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-black text-slate-900">{activeSeries.title}</h2>
            <button onClick={toggleFavorite} className={`w-10 h-10 rounded-full flex items-center justify-center ${isFavorite ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400'}`}>
              <svg className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </button>
          </div>
          <p className="text-sm text-slate-600 mb-6">{activeSeries.description}</p>
          <h3 className="font-bold text-slate-900 mb-3">Épisodes ({episodes.length})</h3>
          <div className="space-y-2">
            {episodes.map(ep => {
              const isUnlocked = ep.is_free || unlockedIds.includes(ep.id)
              return (
                <button key={ep.id} onClick={() => isUnlocked ? playEpisode(ep) : unlockEpisode(ep)} disabled={isUnlocking} className="w-full text-left bg-white border rounded-2xl p-4 shadow-sm active:bg-slate-50">
                  <div className="flex justify-between items-center">
                    <div><p className="font-bold text-slate-900 text-sm">Ép. {ep.episode_number} : {ep.title}</p>
                    <p className="text-[10px] text-slate-500">{ep.is_free ? 'Gratuit' : isUnlocked ? 'Débloqué' : `${ep.price_in_coins} jetons`}</p></div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${isUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{isUnlocked ? 'Lire' : 'Débloquer'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </main>
    )
  }

  // GRILLE
  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></Link>
        <h1 className="font-bold text-slate-900 flex-1">Séries</h1>
      </header>
      <div className="p-4 max-w-md mx-auto">
        <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-3 mb-4 bg-white border rounded-xl text-sm" />
        <div className="flex overflow-x-auto gap-2 pb-4 mb-4 no-scrollbar">
          {CATEGORIES.map(c => <button key={c} onClick={() => setCategory(c)} className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold ${category === c ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'}`}>{c}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(s => (
            <div key={s.id} onClick={() => openSeries(s)} className="bg-white border rounded-2xl overflow-hidden shadow-sm active:scale-95">
              {s.cover_url ? <img src={s.cover_url} alt="" className="w-full h-32 object-cover" /> : <div className="w-full h-32 bg-slate-100" />}
              <div className="p-3"><h3 className="font-bold text-slate-900 text-xs line-clamp-2">{s.title}</h3></div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
