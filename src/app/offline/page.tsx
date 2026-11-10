'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Vérifie la connexion
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <main className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md text-center">
        
        {/* Icône */}
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        </div>

        {/* Titre */}
        <h1 className="text-2xl font-black text-slate-900 mb-3">
          {isOnline ? 'Tu es de retour !' : 'Pas de connexion'}
        </h1>
        
        {/* Message */}
        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          {isOnline 
            ? 'Ta connexion a été rétablie. Tu peux continuer à utiliser l\'application.'
            : 'Vérifie ta connexion internet ou tes données mobiles. Certaines fonctionnalités peuvent être limitées hors ligne.'
          }
        </p>

        {/* Actions */}
        <div className="space-y-3">
          {isOnline ? (
            <Link href="/dashboard" className="block w-full py-4 bg-sky-500 text-white font-bold rounded-xl active:scale-95 transition shadow-md">
              Retourner à l'accueil
            </Link>
          ) : (
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl active:scale-95 transition shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Réessayer
            </button>
          )}
        </div>

        {/* Astuce */}
        <div className="mt-8 bg-amber-50 border border-amber-100 p-4 rounded-2xl">
          <p className="text-[10px] text-amber-800 leading-relaxed">
            <strong className="font-bold">💡 Astuce :</strong> Active le Wi-Fi ou les données mobiles pour accéder à toutes les fonctionnalités de XAFEARN.
          </p>
        </div>
      </div>
    </main>
  )
}
