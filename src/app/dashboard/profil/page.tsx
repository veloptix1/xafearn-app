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
  const [isAnnonceurMode, setIsAnnonceurMode] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!data) return router.push('/login')
      
      setProfile(data)
      setIsAnnonceurMode(data.role === 'annonceur')
      setLoading(false)
    }
    load()
  }, [])

  const toggleMode = async () => {
    if (!profile) return
    const newMode = !isAnnonceurMode
    setIsAnnonceurMode(newMode)
    const newRole = newMode ? 'annonceur' : 'diffuseur'
    await supabase.from('profiles').update({ role: newRole }).eq('id', profile.id)
    setProfile({ ...profile, role: newRole })
    router.refresh()
  }

  const getIcon = (name: string) => {
    switch (name) {
      case 'edit': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      case 'mail': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      case 'phone': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      case 'lock': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      case 'bell': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      case 'wallet': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      case 'shield': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      case 'help': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      default: return null
    }
  }

  const menuItems = [
    { icon: 'edit', label: 'Modifier le profil', href: '/dashboard/profil/modifier', color: 'text-sky-500', bg: 'bg-sky-50' },
    { icon: 'mail', label: 'Modifier mon email', href: '/dashboard/profil/email', color: 'text-sky-500', bg: 'bg-sky-50' },
    { icon: 'phone', label: 'Changer le numéro de téléphone', href: '/dashboard/profil/telephone', color: 'text-sky-500', bg: 'bg-sky-50' },
    { icon: 'lock', label: 'Modifier mon mot de passe', href: '/dashboard/profil/mot-de-passe', color: 'text-slate-700', bg: 'bg-slate-100' },
    { icon: 'bell', label: 'Notifications', href: '/dashboard/profil/notifications', color: 'text-slate-700', bg: 'bg-slate-100' },
    { icon: 'wallet', label: 'Mes transactions', href: '/dashboard/profil/transactions', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: 'shield', label: 'Sécurité & Confidentialité', href: '/dashboard/profil/securite', color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: 'help', label: 'Aide & Support', href: '/dashboard/profil/support', color: 'text-slate-700', bg: 'bg-slate-100' },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  const levelColor = profile?.level === 3 ? 'from-amber-400 to-amber-600' : profile?.level === 2 ? 'from-slate-300 to-slate-500' : 'from-orange-400 to-orange-600'
  const levelName = profile?.level === 3 ? 'Expert' : profile?.level === 2 ? 'Confirmé' : 'Débutant'

  return (
    <main className="min-h-dvh bg-slate-50 pb-24">
      
      {/* HEADER MOBILE */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Mon Profil</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        
        {/* CARTE DE VISITE */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-5">
          <div className={`h-24 bg-gradient-to-r ${levelColor}`}></div>
          <div className="px-5 pb-5 relative">
            <div className="flex justify-between items-end -mt-10 mb-4">
              <div className="w-20 h-20 bg-white rounded-full p-1 shadow-sm">
                <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-3xl font-black border border-slate-200">
                  {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <Link href="/dashboard/profil/modifier" className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-full active:bg-slate-200 transition">
                Modifier
              </Link>
            </div>
            
            <h1 className="text-xl font-black text-slate-900">{profile?.full_name || 'Utilisateur'}</h1>
            <p className="text-sm text-slate-500 mb-3">{profile?.email}</p>
            
            <div className="flex flex-wrap gap-2">
              <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full bg-gradient-to-r ${levelColor} text-white shadow-sm`}>
                Niveau {profile?.level || 1} • {levelName}
              </span>
            </div>
          </div>
        </div>

        {/* SÉLECTEUR DE MODE */}
        {profile?.role !== 'admin' && (
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm mb-5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Mode d'utilisation</p>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => isAnnonceurMode && toggleMode()} 
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${!isAnnonceurMode ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Diffuseur
              </button>
              <button 
                onClick={() => !isAnnonceurMode && toggleMode()} 
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${isAnnonceurMode ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                Annonceur
              </button>
            </div>
          </div>
        )}

        {/* MENU DES OPTIONS */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-5">
          {menuItems.map((item, index) => (
            <Link 
              key={index}
              href={item.href}
              className="w-full flex items-center justify-between p-4 border-b border-slate-100 last:border-0 active:bg-slate-50 transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${item.bg} rounded-full flex items-center justify-center ${item.color}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {getIcon(item.icon)}
                  </svg>
                </div>
                <span className="font-semibold text-slate-800 text-sm">{item.label}</span>
              </div>
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </Link>
          ))}
        </div>

        {/* DÉCONNEXION */}
        <button 
          onClick={handleLogout}
          className="w-full py-4 bg-white border border-red-200 text-red-600 font-bold rounded-2xl active:bg-red-50 transition flex justify-center items-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Se déconnecter
        </button>
      </div>
    </main>
  )
}
