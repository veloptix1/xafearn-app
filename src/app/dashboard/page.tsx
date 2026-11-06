'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import NotificationBell from '@/components/NotificationBell'
import WelcomePopup from '@/components/WelcomePopup'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAnnonceurMode, setIsAnnonceurMode] = useState(false)
  const [showSeriesPopup, setShowSeriesPopup] = useState(false)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        if (!data.is_onboarded) { router.push('/onboarding'); return }
        setProfile(data)
        setIsAnnonceurMode(data.role === 'annonceur')
        // Optionnel : on peut retirer la popup pour le moment pour faire plus propre
        // setTimeout(() => setShowSeriesPopup(true), 1500)
      }
      setLoading(false)
    }
    loadData()
  }, [router, supabase])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <WelcomePopup />
      
      {/* Header Mobile Propre */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-3 sticky top-0 z-50 flex justify-between items-center">
        <img src="/logo.png" alt="XAFEARN" className="h-6 w-auto object-contain" />
        <div className="flex items-center gap-2">
          <NotificationBell userId={profile?.id} />
          <Link href="/dashboard/profil" className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-600 active:bg-slate-200 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        </div>
      </header>

      <div className="p-4 w-full max-w-md mx-auto mt-2">
        
        {!isAnnonceurMode ? (
          <div className="space-y-4">
            
            {/* CARTE SOLDE MODERNE */}
            <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Solde disponible</p>
                <div className="flex items-baseline gap-1.5 mb-5">
                  <span className="text-3xl font-black">{profile?.balance?.toLocaleString('fr-FR') || '0'}</span>
                  <span className="text-xs font-bold text-slate-400">FCFA</span>
                </div>
                <div className="flex gap-2">
                  <Link href="/dashboard/retrait" className="flex-1 py-2.5 bg-sky-500 text-white font-bold text-xs rounded-xl text-center active:scale-95 transition">Retirer</Link>
                  <Link href="/dashboard/historique" className="flex-1 py-2.5 bg-white/10 text-white font-bold text-xs rounded-xl text-center active:scale-95 transition border border-white/10">Historique</Link>
                </div>
              </div>
            </div>

            {/* CARTE NIVEAU MODERNE */}
            <Link href="/dashboard/niveaux" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Niveau Actuel</p>
                  <p className="text-sm font-black text-slate-900">Niveau {profile?.level || 1}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                <span className="text-xs font-bold text-emerald-600">
                  {profile?.level === 1 ? '0,50 F/vue' : profile?.level === 2 ? '1,25 F/vue' : '1,75 F/vue'}
                </span>
              </div>
            </Link>

            {/* SERVICES - GRILLE PROPRE */}
            <div className="pt-2">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Services</h2>
              <div className="grid grid-cols-2 gap-3">
                
                <Link href="/dashboard/annonces" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center text-sky-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Diffuser</h3>
                  <p className="text-[10px] text-slate-500">Gérer mes annonces</p>
                </Link>

                <Link href="/dashboard/studio" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Studio</h3>
                  <p className="text-[10px] text-slate-500">Créer des séries</p>
                </Link>

                <Link href="/dashboard/equipe" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Équipe</h3>
                  <p className="text-[10px] text-slate-500">Gérer mes agents</p>
                </Link>

                <Link href="/dashboard/coffres" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Trésors</h3>
                  <p className="text-[10px] text-slate-500">Gagne des jetons</p>
                </Link>

              </div>
            </div>
          </div>
        ) : (
          
          // VUE ANNONCEUR
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-amber-100 text-xs font-bold uppercase tracking-wider mb-1">Espace Annonceur</p>
                <h1 className="text-xl font-black mb-4">Développe ton business</h1>
                <Link href="/dashboard/annonces/creer" className="inline-block px-5 py-2.5 bg-white text-amber-700 font-bold text-xs rounded-xl shadow-md active:scale-95 transition">
                  + Créer une campagne
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Link href="/dashboard/annonceur/analytics" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Tableau de bord</h3>
                </div>
                <p className="text-xs text-slate-500">Suis les performances de tes campagnes.</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
