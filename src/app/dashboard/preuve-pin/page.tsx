'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function PreuvePinPage() {
  const [pin, setPin] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  // 🛡️ SÉCURITÉ : Expiration du PIN après 5 minutes
  useEffect(() => {
    if (!pin) return
    setTimeLeft(300) // 5 minutes en secondes
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setPin(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [pin])

  const generatePin = () => {
    setLoading(true)
    setTimeout(() => {
      const randomPin = Math.floor(100000 + Math.random() * 900000).toString()
      setPin(randomPin)
      setLoading(false)
    }, 1000)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Preuve par Code PIN</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto mt-2">
        
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-5 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Méthode ultra-rapide</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">Plus besoin de vidéo. Génère un code PIN unique et envoie-le à notre robot WhatsApp pour valider instantanément.</p>
          
          {!pin ? (
            <button onClick={generatePin} disabled={loading} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 disabled:opacity-50 transition shadow-md">
              {loading ? 'Génération...' : 'Générer mon Code PIN'}
            </button>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl">
              <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mb-2">Ton code secret</p>
              <p className="text-4xl font-black text-emerald-600 tracking-widest mb-1">{pin}</p>
              <p className="text-[10px] text-red-500 font-bold mb-4">Expire dans {formatTime(timeLeft)}</p>
              <a href={`https://wa.me/237600000000?text=VALIDATION%20${pin}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-white font-bold rounded-xl active:scale-95 transition shadow-sm">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                Envoyer au robot WhatsApp
              </a>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3">
          <div className="text-amber-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-amber-800 text-sm">Comment ça marche ?</h3>
            <p className="text-amber-700 text-xs mt-1 leading-relaxed">Notre robot vérifie que tu as bien publié le statut et valide tes gains automatiquement en quelques secondes.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
