'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Si l'utilisateur est déjà connecté, on le redirige vers le dashboard
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.push('/dashboard')
      } else {
        setChecking(false)
      }
    })
  }, [])

  if (checking) return (
    <div className="min-h-dvh bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <main className="min-h-dvh bg-gradient-to-br from-emerald-50 via-white to-sky-50 overflow-hidden">
      
      {/* HEADER */}
      <header className="px-5 py-4 flex justify-between items-center">
        <img src="/logo.png" alt="XAFEARN" className="h-8 w-auto object-contain" />
        <Link href="/login" className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-full shadow-sm active:scale-95 transition">
          Connexion
        </Link>
      </header>

      {/* HERO */}
      <div className="px-6 pt-6 pb-12 max-w-lg mx-auto text-center">
        
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Gagne de l'argent en ligne
        </div>

        <h1 className="text-4xl font-black text-slate-900 leading-tight mb-4">
          Gagne de l'argent avec tes <span className="text-emerald-600">statuts WhatsApp</span>
        </h1>
        
        <p className="text-base text-slate-600 leading-relaxed mb-8">
          Publie les annonces de nos partenaires sur ton statut, prouve ta diffusion, et reçois ton argent directement sur Mobile Money.
        </p>

        {/* BOUTONS */}
        <div className="space-y-3">
          <Link href="/signup" className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-95 transition">
            Commencer à gagner
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </Link>
          <Link href="/login" className="flex items-center justify-center w-full py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl active:scale-95 transition">
            J'ai déjà un compte
          </Link>
        </div>

      </div>

      {/* FONCTIONNALITÉS */}
      <div className="px-5 pb-12 max-w-lg mx-auto">
        <div className="grid grid-cols-1 gap-4">
          
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center shrink-0 text-sky-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Gagne par vue</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Chaque vue sur ton statut te rapporte de l'argent. Plus tu publies, plus tu gagnes.</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Bibliothèque de séries</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Découvre et lis des histoires captivantes, ou crée les tiennes et monétise-les.</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 text-amber-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Retrait Mobile Money</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Retire tes gains facilement via Orange Money, MTN, Wave et bien d'autres.</p>
            </div>
          </div>

        </div>
      </div>

      {/* CTA FINAL */}
      <div className="px-5 pb-8 max-w-lg mx-auto">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <h2 className="text-xl font-black mb-2">Prêt à commencer ?</h2>
            <p className="text-slate-300 text-xs mb-5">Rejoins des milliers d'utilisateurs qui gagnent déjà.</p>
            <Link href="/signup" className="inline-block w-full py-3.5 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 transition">
              Créer mon compte gratuitement
            </Link>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="px-5 pb-8 text-center">
        <div className="flex justify-center gap-4 mb-3 text-xs text-slate-500">
          <Link href="/conditions" className="active:text-slate-900">Conditions</Link>
          <Link href="/confidentialite" className="active:text-slate-900">Confidentialité</Link>
        </div>
        <p className="text-[10px] text-slate-400">© 2026 XAFEARN. Tous droits réservés.</p>
      </footer>

    </main>
  )
}
