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
  const [unreadCount, setUnreadCount] = useState(0)
  const [isMaintenance, setIsMaintenance] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      
      if (data) {
        if (!data.is_onboarded) { router.push('/onboarding'); return }
        setProfile(data)
        setIsAnnonceurMode(data.role === 'annonceur')

        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
        setUnreadCount(count || 0)
      }

      // Vérifier le mode maintenance
      const { data: settings } = await supabase.from('app_settings').select('*').in('key', ['maintenance_mode', 'maintenance_message'])
      settings?.forEach(s => {
        if (s.key === 'maintenance_mode' && s.value === 'true') setIsMaintenance(true)
        if (s.key === 'maintenance_message' && s.value) setMaintenanceMessage(s.value)
      })

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

      {/* Bannière Maintenance */}
      {isMaintenance && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {maintenanceMessage || 'Maintenance en cours'}
        </div>
      )}

      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-3 sticky top-0 z-50 flex justify-between items-center">
        <img src="/logo.png" alt="XAFEARN" className="h-6 w-auto object-contain" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <NotificationBell userId={profile?.id} />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </div>
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

            {/* CARTE SOLDE */}
            <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Solde disponible</p>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-3xl font-black">{profile?.balance?.toLocaleString('fr-FR') || '0'}</span>
                  <span className="text-xs font-bold text-slate-400">FCFA</span>
                </div>
                <div className="flex gap-2">
                  <Link href="/dashboard/retrait" className="flex-1 py-2.5 bg-sky-500 text-white font-bold text-xs rounded-xl text-center active:scale-95 transition">Retirer</Link>
                  <Link href="/dashboard/historique" className="flex-1 py-2.5 bg-white/10 text-white font-bold text-xs rounded-xl text-center active:scale-95 transition border border-white/10">Historique</Link>
                </div>
              </div>
            </div>

            {/* CARTE JETONS + CREDITS IA */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/jetons/acheter" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col items-center shadow-sm active:scale-95 transition">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 mb-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span className="text-lg font-black text-amber-600">{profile?.coins_balance || 0}</span>
                <span className="text-[10px] font-bold text-amber-500 uppercase">Jetons</span>
              </Link>
              <Link href="/dashboard/credits-ia/acheter" className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-col items-center shadow-sm active:scale-95 transition">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                </div>
                <span className="text-lg font-black text-indigo-600">{profile?.credits_ia || 0}</span>
                <span className="text-[10px] font-bold text-indigo-500 uppercase">Crédits IA</span>
              </Link>
            </div>

            {/* CARTE NIVEAU */}
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

            {/* SERVICES - GRILLE DE 10 CARTES */}
            <div className="pt-2">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Services</h2>
              <div className="grid grid-cols-2 gap-3">

                <Link href="/dashboard/messages" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center text-sky-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Messages</h3>
                  <p className="text-[10px] text-slate-500">Discuter en privé</p>
                </Link>

                <Link href="/dashboard/reseau" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-cyan-50 rounded-lg flex items-center justify-center text-cyan-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Réseau</h3>
                  <p className="text-[10px] text-slate-500">Publications</p>
                </Link>

                <Link href="/dashboard/mon-lien" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Mon Lien</h3>
                  <p className="text-[10px] text-slate-500">Parrainage</p>
                </Link>

                <Link href="/dashboard/roue" className="block bg-gradient-to-br from-pink-500 to-rose-600 p-4 rounded-2xl shadow-md text-white active:scale-95 transition">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="font-bold text-sm">Roue</h3>
                  <p className="text-[10px] text-pink-100">Tente ta chance</p>
                </Link>

                <Link href="/dashboard/market" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-700 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Market</h3>
                  <p className="text-[10px] text-slate-500">Sites & apps</p>
                </Link>

                <Link href="/dashboard/activation" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Premium</h3>
                  <p className="text-[10px] text-slate-500">Activer</p>
                </Link>

                <Link href="/dashboard/annonces" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Diffuser</h3>
                  <p className="text-[10px] text-slate-500">Annonces</p>
                </Link>

                <Link href="/dashboard/studio" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Studio</h3>
                  <p className="text-[10px] text-slate-500">Créer séries</p>
                </Link>

                <Link href="/dashboard/taches" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Tâches</h3>
                  <p className="text-[10px] text-slate-500">Gagner</p>
                </Link>

                <Link href="/dashboard/equipe" className="block bg-white border border-slate-200 p-4 rounded-2xl shadow-sm active:bg-slate-50 transition">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Équipe</h3>
                  <p className="text-[10px] text-slate-500">Gérer agents</p>
                </Link>

              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg">
              <p className="text-amber-100 text-xs font-bold uppercase tracking-wider mb-1">Espace Annonceur</p>
              <h1 className="text-xl font-black mb-4">Développe ton business</h1>
              <Link href="/dashboard/annonces/creer" className="inline-block px-5 py-2.5 bg-white text-amber-700 font-bold text-xs rounded-xl shadow-md active:scale-95 transition">
                + Créer une campagne
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
