'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['Tout', 'Romance', 'Action', 'Thriller', 'Fantastique', 'Science-Fiction', 'Drame', 'Comédie', 'Horreur', 'Aventure']

type Profile = { id: string; coins_balance: number | null }
type Series = {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  category: string | null
  content_type: string | null
  profiles?: { full_name: string | null } | null
}
type Episode = {
  id: string
  episode_number: number
  title: string
  is_free: boolean
  price_in_coins: number
  content_media_url?: string | null
  content_text?: string | null
}

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
)

export default function SeriesPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [series, setSeries] = useState<Series[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Tout')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notice, setNotice] = useState<{ text: string; tone: 'error' | 'success' } | null>(null)

  const [activeSeries, setActiveSeries] = useState<Series | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const [unlockedIds, setUnlockedIds] = useState<string[]>([])
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [unlockTarget, setUnlockTarget] = useState<Episode | null>(null)
  const [busy, setBusy] = useState(false)

  const flash = useCallback((text: string, tone: 'error' | 'success' = 'error') => setNotice({ text, tone }), [])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3500)
    return () => clearTimeout(t)
  }, [notice])

  // Chargement initial
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
      const [profRes, seriesRes] = await Promise.all([
        supabase.from('profiles').select('id, coins_balance').eq('id', session.user.id).single(),
        supabase
          .from('series')
          .select('id, title, description, cover_url, category, content_type, profiles(full_name)')
          .eq('is_published', true)
          .order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      setProfile((profRes.data as Profile | null) ?? { id: session.user.id, coins_balance: 0 })
      if (seriesRes.error) flash('Impossible de charger les séries.')
      setSeries((seriesRes.data ?? []) as unknown as Series[])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, router, flash])

  // Le bouton retour du téléphone remonte d'un niveau : lecteur → épisodes → grille
  useEffect(() => {
    const onPop = () => {
      const st = window.history.state?.xafSeries
      if (st !== 'player') setActiveEpisode(null)
      if (!st) {
        setActiveSeries(null)
        setEpisodes([])
      }
      setUnlockTarget(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const goBack = () => window.history.back()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return series.filter(
      (s) =>
        (category === 'Tout' || s.category === category) &&
        (!q || s.title?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))
    )
  }, [series, search, category])

  const openSeries = async (s: Series) => {
    setActiveSeries(s)
    setEpisodes([])
    setIsFavorite(false)
    setEpisodesLoading(true)
    window.history.pushState({ xafSeries: 'detail' }, '', '#serie')

    const { data: eps, error } = await supabase
      .from('episodes')
      .select('id, episode_number, title, is_free, price_in_coins')
      .eq('series_id', s.id)
      .order('episode_number', { ascending: true })
    if (error) flash('Impossible de charger les épisodes.')
    const list = (eps ?? []) as Episode[]
    setEpisodes(list)

    if (profile && list.length > 0) {
      const [unlocks, fav] = await Promise.all([
        supabase.from('episode_unlocks').select('episode_id').eq('user_id', profile.id).in('episode_id', list.map((e) => e.id)),
        supabase.from('series_favorites').select('id').eq('user_id', profile.id).eq('series_id', s.id).maybeSingle(),
      ])
      setUnlockedIds((unlocks.data ?? []).map((u: { episode_id: string }) => u.episode_id))
      setIsFavorite(!!fav.data)
    }
    setEpisodesLoading(false)
  }

  const toggleFavorite = async () => {
    if (!profile || !activeSeries) return
    const next = !isFavorite
    setIsFavorite(next) // réponse immédiate, annulée si erreur
    const { error } = next
      ? await supabase.from('series_favorites').insert({ user_id: profile.id, series_id: activeSeries.id })
      : await supabase.from('series_favorites').delete().eq('user_id', profile.id).eq('series_id', activeSeries.id)
    if (error) {
      setIsFavorite(!next)
      flash('Action impossible pour le moment.')
    }
  }

  const playEpisode = async (ep: Episode) => {
    if (!activeSeries || busy) return
    setBusy(true)
    const { data, error } = await supabase
      .from('episodes')
      .select('content_media_url, content_text')
      .eq('id', ep.id)
      .single()
    setBusy(false)
    if (error || !data) {
      flash("Cet épisode n'est pas disponible.")
      return
    }
    const full: Episode = { ...ep, ...(data as Pick<Episode, 'content_media_url' | 'content_text'>) }
    setActiveEpisode(full)
    // Si on lit un épisode depuis le lecteur (suivant/précédent), on remplace l'entrée d'historique
    if (window.history.state?.xafSeries === 'player') window.history.replaceState({ xafSeries: 'player' }, '', '#lecture')
    else window.history.pushState({ xafSeries: 'player' }, '', '#lecture')
    void supabase.rpc('increment_episode_views', { p_episode_id: ep.id, p_series_id: activeSeries.id })
  }

  const isEpisodeUnlocked = (ep: Episode) => ep.is_free || unlockedIds.includes(ep.id)

  const tapEpisode = (ep: Episode) => (isEpisodeUnlocked(ep) ? playEpisode(ep) : setUnlockTarget(ep))

  const confirmUnlock = async () => {
    if (!unlockTarget || !profile || busy) return
    const ep = unlockTarget
    if ((profile.coins_balance ?? 0) < ep.price_in_coins) return
    setBusy(true)
    const { error } = await supabase.rpc('unlock_episode', { p_episode_id: ep.id, p_user_id: profile.id })
    if (error) {
      setBusy(false)
      flash("Le déblocage a échoué. Réessaie.")
      return
    }
    setUnlockedIds((prev) => [...prev, ep.id])
    const { data: fresh } = await supabase.from('profiles').select('coins_balance').eq('id', profile.id).single()
    if (fresh) setProfile({ ...profile, coins_balance: (fresh as { coins_balance: number | null }).coins_balance })
    setUnlockTarget(null)
    setBusy(false)
    await playEpisode(ep)
  }

  const topPad = { paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }
  const bottomPad = { paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)' }

  const noticeBanner = notice && (
    <div
      role="alert"
      onClick={() => setNotice(null)}
      className={`fixed left-3 right-3 z-[300] text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg ${notice.tone === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}
      style={{ top: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
    >
      {notice.text}
    </div>
  )

  // Feuille de confirmation de déblocage (visible depuis la fiche et depuis le lecteur)
  const unlockSheet = unlockTarget && (
    <div className="fixed inset-0 z-[250] bg-slate-900/60 flex items-end justify-center" onClick={() => !busy && setUnlockTarget(null)}>
      <div className="bg-white rounded-t-3xl w-full max-w-md p-5" style={bottomPad} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
        <h2 className="font-black text-slate-900 text-lg">Débloquer l&apos;épisode {unlockTarget.episode_number}</h2>
        <p className="text-sm text-slate-500 mt-1 truncate">{unlockTarget.title}</p>
        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 mt-4 text-sm">
          <span className="text-slate-500">Prix</span>
          <span className="font-black text-amber-600">{unlockTarget.price_in_coins} jetons</span>
        </div>
        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 mt-2 text-sm">
          <span className="text-slate-500">Ton solde</span>
          <span className="font-black text-slate-900">{profile?.coins_balance ?? 0} jetons</span>
        </div>
        {(profile?.coins_balance ?? 0) < unlockTarget.price_in_coins ? (
          <>
            <p className="text-sm text-red-600 font-semibold mt-3">Solde insuffisant.</p>
            <Link href="/dashboard/jetons/acheter" className="block text-center w-full mt-3 py-3.5 bg-sky-500 text-white font-bold rounded-xl">Acheter des jetons</Link>
          </>
        ) : (
          <button onClick={confirmUnlock} disabled={busy} className="w-full mt-4 py-3.5 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-60 active:bg-sky-600">
            {busy ? 'Déblocage…' : 'Débloquer et lire'}
          </button>
        )}
        <button onClick={() => setUnlockTarget(null)} disabled={busy} className="w-full mt-2 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
      </div>
    </div>
  )

  // ───────────── LECTEUR ─────────────
  if (activeEpisode && activeSeries) {
    const idx = episodes.findIndex((e) => e.id === activeEpisode.id)
    const prevEp = idx > 0 ? episodes[idx - 1] : null
    const nextEp = idx >= 0 && idx < episodes.length - 1 ? episodes[idx + 1] : null
    const type = activeSeries.content_type
    return (
      <main className="fixed inset-0 z-40 bg-black flex flex-col">
        {noticeBanner}
        {unlockSheet}
        <header className="px-3 pb-3 flex items-center gap-3 bg-black/80 shrink-0" style={topPad}>
          <button onClick={goBack} aria-label="Retour aux épisodes" className="w-10 h-10 shrink-0 text-white bg-white/15 rounded-full flex items-center justify-center active:bg-white/25"><BackIcon /></button>
          <div className="min-w-0">
            <p className="text-[10px] text-sky-400 font-bold">ÉPISODE {activeEpisode.episode_number}</p>
            <p className="text-sm text-white font-bold truncate">{activeEpisode.title}</p>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex items-center justify-center">
          {type === 'video' && activeEpisode.content_media_url ? (
            <video key={activeEpisode.id} src={activeEpisode.content_media_url} controls autoPlay playsInline controlsList="nodownload" className="w-full max-h-full object-contain" />
          ) : type === 'image' && activeEpisode.content_media_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activeEpisode.content_media_url} alt={activeEpisode.title} className="w-full max-h-full object-contain" />
          ) : (
            <div className="w-full h-full overflow-y-auto overscroll-contain px-5 py-6 bg-slate-950">
              <p className="text-slate-100 text-[17px] leading-8 whitespace-pre-wrap break-words">{activeEpisode.content_text || 'Aucun contenu.'}</p>
            </div>
          )}
        </div>

        <footer className="shrink-0 bg-black/80 px-3 pt-3 flex gap-3" style={bottomPad}>
          <button onClick={() => prevEp && tapEpisode(prevEp)} disabled={!prevEp || busy} className="flex-1 py-3 rounded-xl bg-white/15 text-white text-sm font-bold disabled:opacity-30">← Précédent</button>
          <button onClick={() => nextEp && tapEpisode(nextEp)} disabled={!nextEp || busy} className="flex-1 py-3 rounded-xl bg-sky-500 text-white text-sm font-bold disabled:opacity-30">
            {nextEp && !isEpisodeUnlocked(nextEp) ? `Suivant 🔒 ${nextEp.price_in_coins}` : 'Suivant →'}
          </button>
        </footer>
      </main>
    )
  }

  // ───────────── FICHE SÉRIE ─────────────
  if (activeSeries) {
    return (
      <main className="fixed inset-0 z-40 bg-slate-50 flex flex-col">
        {noticeBanner}
        {unlockSheet}
        <header className="bg-white border-b px-3 pb-3 flex items-center gap-3 shrink-0" style={topPad}>
          <button onClick={goBack} aria-label="Retour" className="w-10 h-10 shrink-0 text-slate-600 bg-slate-100 rounded-full flex items-center justify-center active:bg-slate-200"><BackIcon /></button>
          <h1 className="font-bold text-slate-900 flex-1 truncate">{activeSeries.title}</h1>
          <button onClick={toggleFavorite} aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${isFavorite ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400'}`}>
            <svg className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.5rem)' }}>
          <div className="max-w-md mx-auto p-4">
            {activeSeries.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeSeries.cover_url} alt="" className="w-full aspect-video object-cover rounded-2xl mb-4 bg-slate-200" />
            )}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {activeSeries.category && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700">{activeSeries.category}</span>}
              {activeSeries.profiles?.full_name && <span className="text-xs text-slate-500">par {activeSeries.profiles.full_name}</span>}
            </div>
            {activeSeries.description && <p className="text-sm text-slate-600 leading-relaxed mb-6 whitespace-pre-line">{activeSeries.description}</p>}

            <h3 className="font-bold text-slate-900 mb-3">Épisodes {!episodesLoading && `(${episodes.length})`}</h3>
            {episodesLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 bg-white border rounded-2xl animate-pulse" />)}</div>
            ) : episodes.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-8">Aucun épisode pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {episodes.map((ep) => {
                  const unlocked = isEpisodeUnlocked(ep)
                  return (
                    <button key={ep.id} onClick={() => tapEpisode(ep)} disabled={busy} className="w-full text-left bg-white border rounded-2xl p-4 shadow-sm active:bg-slate-50 disabled:opacity-60">
                      <div className="flex justify-between items-center gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">Ép. {ep.episode_number} · {ep.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{ep.is_free ? 'Gratuit' : unlocked ? 'Débloqué' : `${ep.price_in_coins} jetons`}</p>
                        </div>
                        <span className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-lg ${unlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{unlocked ? 'Lire' : '🔒 Débloquer'}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    )
  }

  // ───────────── GRILLE ─────────────
  return (
    <main className="fixed inset-0 z-40 bg-slate-50 flex flex-col">
      {noticeBanner}
      <header className="bg-white border-b px-3 pb-3 shrink-0" style={topPad}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" aria-label="Retour" className="w-10 h-10 shrink-0 text-slate-600 bg-slate-100 rounded-full flex items-center justify-center active:bg-slate-200"><BackIcon /></Link>
          <h1 className="font-bold text-slate-900 text-lg flex-1">Séries</h1>
          {profile && <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">🪙 {profile.coins_balance ?? 0}</span>}
        </div>
        <input type="search" placeholder="Rechercher une série…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-11 mt-3 px-4 bg-slate-50 border border-slate-200 rounded-full text-base outline-none focus:border-sky-400" />
        <div className="flex overflow-x-auto gap-2 mt-3 -mx-3 px-3 no-scrollbar">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`shrink-0 whitespace-nowrap px-4 h-9 rounded-full text-xs font-bold ${category === c ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'}`}>{c}</button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }}>
        <div className="max-w-md mx-auto p-3">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="aspect-[3/4] bg-slate-200 rounded-2xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center mt-16 px-6">
              <p className="text-4xl mb-3">🎬</p>
              <p className="text-slate-700 font-semibold">{series.length === 0 ? 'Aucune série pour le moment' : 'Aucun résultat'}</p>
              {(search || category !== 'Tout') && <button onClick={() => { setSearch(''); setCategory('Tout') }} className="mt-4 px-5 py-3 bg-slate-900 text-white font-bold rounded-xl text-sm">Réinitialiser les filtres</button>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((s) => (
                <button key={s.id} onClick={() => openSeries(s)} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-sky-500 to-indigo-700 text-left shadow-sm active:scale-[0.97] transition">
                  {s.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.cover_url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-5xl font-black text-white/40">{s.title?.charAt(0)}</span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 p-3 pt-10 bg-gradient-to-t from-black/85 to-transparent">
                    <span className="block text-white text-[13px] font-bold leading-tight line-clamp-2">{s.title}</span>
                    {s.category && <span className="block text-[10px] text-white/70 mt-0.5">{s.category}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
