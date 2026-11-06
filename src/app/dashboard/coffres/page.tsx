'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const VERCEL_URL = 'https://getagriculture.store'

export default function TreasuresPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [treasures, setTreasures] = useState<any[]>([])
  const [links, setLinks] = useState<Record<string, any[]>>({})
  const [profile, setProfile] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const [activeTreasure, setActiveTreasure] = useState<any>(null)
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [winResult, setWinResult] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: t } = await supabase.from('treasures').select('*').eq('status', 'active').order('created_at', { ascending: false })
      setTreasures(t || [])

      if (t && t.length > 0) {
        const ids = t.map(x => x.id)
        const { data: l } = await supabase.from('treasure_links').select('*').in('treasure_id', ids)
        const grouped: Record<string, any[]> = {}
        l?.forEach(link => {
          if (!grouped[link.treasure_id]) grouped[link.treasure_id] = []
          grouped[link.treasure_id].push(link)
        })
        setLinks(grouped)
      }
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleClaim = async () => {
    if (!code.trim()) return showToast('Veuillez entrer le code secret.', 'warning')
    setIsSubmitting(true)
    setWinResult(null)

    try {
      const res = await fetch(`${VERCEL_URL}/api/treasures/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treasureId: activeTreasure.id, code: code.trim().toUpperCase(), user_id: profile.id })
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Code incorrect.', 'error')
      } else {
        setWinResult(data)
        showToast('Félicitations !', 'success')
        setTimeout(() => { setActiveTreasure(null); window.location.reload() }, 5000)
      }
    } catch (err) {
      showToast('Erreur réseau. Réessaie.', 'error')
    }
    setIsSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Trésors</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <h2 className="text-lg font-black mb-1">Trouve le code, gagne le trésor</h2>
            <p className="text-amber-100 text-xs leading-relaxed">Observe les indices cachés dans les vidéos des annonceurs et sois le premier à ouvrir le coffre.</p>
          </div>
        </div>

        {treasures.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center shadow-sm">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Aucun trésor disponible</h3>
            <p className="text-slate-500 text-xs">Reviens plus tard.</p>
          </div>
        ) : (
          treasures.map(t => {
            const treasureLinks = links[t.id] || []
            const timeLeft = new Date(t.expires_at).getTime() - Date.now()
            const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600000))
            const minsLeft = Math.max(0, Math.floor((timeLeft % 3600000) / 60000))

            const tierColors: Record<string, string> = {
              diamant: 'bg-purple-500',
              or: 'bg-amber-500',
              argent: 'bg-slate-500',
              bronze: 'bg-orange-500'
            }

            return (
              <div key={t.id} className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sponsorisé par</p>
                    <p className="font-bold text-sm">{t.sponsor_name}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase text-white ${tierColors[t.tier] || 'bg-slate-500'}`}>{t.tier}</span>
                </div>
                <div className="p-5 text-center">
                  <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Cagnotte à gagner</p>
                  <p className="text-2xl font-black text-amber-600 mb-3">{t.prize_pool.toLocaleString('fr-FR')} F</p>
                  
                  <div className="flex justify-center gap-3 text-[11px] font-bold text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {hoursLeft}h {minsLeft}m
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      {t.tier === 'diamant' ? 5 : t.tier === 'or' ? 3 : t.tier === 'argent' ? 2 : 1} gagnant(s)
                    </span>
                  </div>

                  <button onClick={() => { setActiveTreasure(t); setCode(''); setWinResult(null); }} className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl active:scale-95 transition shadow-md">
                    Participer
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* MODAL */}
      {activeTreasure && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            
            {!winResult ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-black text-lg text-slate-900">Trouve le code</h2>
                  <button onClick={() => setActiveTreasure(null)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-4">Sponsorisé par <strong>{activeTreasure.sponsor_name}</strong></p>

                <div className="space-y-2 mb-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Indices à trouver :</p>
                  {(links[activeTreasure.id] || []).map((link, idx) => (
                    <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl active:bg-slate-100 transition">
                      <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0 text-xs font-bold text-slate-400">#{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 capitalize">{link.platform}</p>
                        <p className="text-[10px] text-slate-500 truncate">{link.hint}</p>
                      </div>
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4">
                  <p className="text-[10px] text-amber-800 font-medium text-center">3 tentatives maximum.</p>
                </div>

                <input 
                  type="text" 
                  placeholder="CODE SECRET" 
                  value={code} 
                  onChange={e => setCode(e.target.value.toUpperCase())} 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-center font-black text-lg tracking-widest focus:border-amber-500 outline-none mb-4" 
                />

                <div className="flex gap-2">
                  <button onClick={() => setActiveTreasure(null)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
                  <button onClick={handleClaim} disabled={isSubmitting} className="flex-1 py-3.5 bg-amber-500 text-white font-bold rounded-xl disabled:opacity-50">
                    {isSubmitting ? '...' : 'Ouvrir'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h2 className="text-xl font-black text-emerald-600 mb-2">Félicitations !</h2>
                <p className="text-xs text-slate-600 mb-4">{winResult.message}</p>
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-5">
                  <p className="text-[10px] text-emerald-700 font-bold uppercase mb-1">Gains</p>
                  <p className="text-2xl font-black text-emerald-600">{winResult.prize?.toFixed(2)} F</p>
                </div>
                <button onClick={() => { setActiveTreasure(null); window.location.reload(); }} className="w-full py-3.5 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 transition">Retour</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
