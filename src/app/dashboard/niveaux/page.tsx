'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NiveauxPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentLevel, setCurrentLevel] = useState(1)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      
      const { data } = await supabase.from('profiles').select('level').eq('id', user.id).single()
      setCurrentLevel(data?.level || 1)
      setLoading(false)
    }
    load()
  }, [router, supabase])

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Chargement...</div>

  const levels = [
    {
      id: 1,
      name: 'Débutant',
      rate: '0,50 F / vue',
      color: 'from-orange-400 to-orange-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
      ),
      conditions: ['Inscription validée', 'Profil complété à 100%', 'Numéro WhatsApp vérifié'],
      advantages: ['Accès aux annonces standards', 'Retrait à partir de 2 000 F', 'Support par email (48h)'],
    },
    {
      id: 2,
      name: 'Confirmé',
      rate: '1,25 F / vue',
      color: 'from-slate-400 to-slate-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
      ),
      conditions: ['5 000 vues cumulées validées', '10 annonces diffusées avec succès', 'Taux de validation ≥ 90%', 'Aucun signalement', 'Compte actif depuis 14 jours'],
      advantages: ['Accès aux annonces premium', 'Retrait à partir de 1 000 F (48h)', 'Bonus mensuel si > 10 000 vues', 'Support chat prioritaire'],
    },
    {
      id: 3,
      name: 'Expert',
      rate: '1,75 F / vue',
      color: 'from-amber-400 to-amber-600',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
      ),
      conditions: ['25 000 vues cumulées validées', '50 annonces diffusées avec succès', 'Taux de validation ≥ 95%', 'Compte actif depuis 30 jours', 'Avoir complété 1 défi de qualité'],
      advantages: ['Accès aux campagnes exclusives', 'Retrait à partir de 500 F (24h)', 'Création d\'équipe (jusqu\'à 5 employés)', 'Commission sur les gains de l\'équipe', 'Support WhatsApp dédié', 'Badge Expert vérifié'],
    },
  ]

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Mes niveaux</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-5">
        
        {/* Carte du niveau actuel */}
        <div className={`bg-gradient-to-br ${levels[currentLevel - 1].color} rounded-3xl p-6 text-white shadow-lg relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3">
              {levels[currentLevel - 1].icon}
            </div>
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-1">Ton niveau actuel</p>
            <h1 className="text-2xl font-black mb-2">{levels[currentLevel - 1].name}</h1>
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-bold">
              {levels[currentLevel - 1].rate}
            </div>
          </div>
        </div>

        {/* Liste des niveaux */}
        {levels.map((lvl) => {
          const isCurrent = lvl.id === currentLevel
          const isLocked = lvl.id > currentLevel

          return (
            <div key={lvl.id} className={`bg-white border rounded-3xl shadow-sm overflow-hidden transition ${isCurrent ? 'border-sky-400 ring-2 ring-sky-400/20' : 'border-slate-200'}`}>
              
              <div className={`p-4 flex items-center justify-between ${isCurrent ? 'bg-sky-50' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${lvl.color} shadow-sm text-white`}>
                    {lvl.icon}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">Niveau {lvl.id} • {lvl.name}</h2>
                    <p className="text-xs font-bold text-slate-600">{lvl.rate}</p>
                  </div>
                </div>
                {isCurrent && <span className="bg-sky-500 text-white text-[9px] font-bold px-2 py-1 rounded-full uppercase">Actuel</span>}
                {isLocked && (
                  <div className="text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                )}
              </div>

              <div className="p-4 border-b border-slate-100">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Conditions</h3>
                <ul className="space-y-1.5">
                  {lvl.conditions.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <svg className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isCurrent || lvl.id < currentLevel ? 'text-emerald-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-emerald-50/30">
                <h3 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Avantages</h3>
                <ul className="space-y-1.5">
                  {lvl.advantages.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}

        <div className="bg-slate-100 p-4 rounded-2xl text-center">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Le passage au niveau suivant est automatique dès que toutes les conditions sont remplies.
          </p>
        </div>
      </div>
    </main>
  )
}
