'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!data) return router.push('/login')
      
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      
      {/* HEADER MOBILE */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Mon Profil</h1>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-5">
        
        {/* CARTE PROFIL */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-sky-400 to-blue-500"></div>
          
          <div className="relative z-10 mt-6">
            <div className="w-24 h-24 bg-white p-1 rounded-full shadow-lg">
              <div className="w-full h-full bg-gradient-to-br from-sky-100 to-blue-100 rounded-full flex items-center justify-center text-3xl font-black text-sky-600">
                {profile?.full_name?.charAt(0) || '?'}
              </div>
            </div>
          </div>
          
          <div className="relative z-10 mt-3">
            <h2 className="text-xl font-black text-slate-900">{profile?.full_name || 'Utilisateur'}</h2>
            <p className="text-sm text-slate-500">{profile?.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100 text-xs font-bold">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              Niveau {profile?.level || 1}
            </div>
          </div>

          {/* STATS RAPIDES */}
          <div className="grid grid-cols-2 gap-3 w-full mt-6 pt-6 border-t border-slate-100 relative z-10">
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Solde</p>
              <p className="text-lg font-black text-slate-900">{profile?.balance?.toLocaleString('fr-FR') || 0} F</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jetons</p>
              <p className="text-lg font-black text-amber-500">{profile?.coins_balance?.toLocaleString('fr-FR') || 0}</p>
            </div>
          </div>
        </div>

        {/* MENU PARAMÈTRES */}
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Paramètres</h3>
        
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          
          <Link href="/dashboard/profil/modifier" className="flex items-center gap-4 p-4 active:bg-slate-50 transition border-b border-slate-100">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-sm">Modifier le profil</p>
              <p className="text-xs text-slate-500">Nom, photo, informations</p>
            </div>
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </Link>

          <Link href="/dashboard/profil/securite" className="flex items-center gap-4 p-4 active:bg-slate-50 transition border-b border-slate-100">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-sm">Sécurité</p>
              <p className="text-xs text-slate-500">Mot de passe, PIN</p>
            </div>
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </Link>

          <Link href="/dashboard/profil/notifications" className="flex items-center gap-4 p-4 active:bg-slate-50 transition border-b border-slate-100">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-sm">Notifications</p>
              <p className="text-xs text-slate-500">Préférences d'alertes</p>
            </div>
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </Link>

          <Link href="/dashboard/profil/support" className="flex items-center gap-4 p-4 active:bg-slate-50 transition">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-sm">Support</p>
              <p className="text-xs text-slate-500">Aide et contact</p>
            </div>
            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>

        {/* DÉCONNEXION */}
        <button onClick={handleLogout} className="w-full py-4 bg-red-50 text-red-600 border border-red-100 font-bold rounded-2xl flex items-center justify-center gap-2 active:bg-red-100 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Se déconnecter
        </button>
      </div>
    </main>
  )
}
