'use client'

import { useEffect, useState } from 'react'

type Tone = 'success' | 'error' | 'info'
type Item = { id: number; text: string; tone: Tone }

const tones: Record<Tone, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-slate-900 text-white',
}

/**
 * Remplace les pop-ups natifs `alert()` (moches dans l'app : « localhost indique… »)
 * par des notifications discrètes qui disparaissent seules. Aucun changement requis
 * dans les pages existantes.
 */
export default function AlertToastHost() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const original = window.alert
    let counter = 0
    window.alert = (message?: unknown) => {
      const text = String(message ?? '').trim()
      if (!text) return
      const l = text.toLowerCase()
      const tone: Tone = /^(✅|🎉)|succès|réussi|envoyé|copié|enregistré/.test(l)
        ? 'success'
        : /❌|erreur|échec|impossible|insuffisant|invalide|refus|incorrect/.test(l)
          ? 'error'
          : 'info'
      const id = ++counter
      setItems((prev) => [...prev.slice(-2), { id, text, tone }])
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 4500)
    }
    return () => {
      window.alert = original
    }
  }, [])

  if (items.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-3 z-[400] flex flex-col items-center gap-2 pointer-events-none"
      style={{ top: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
    >
      {items.map((i) => (
        <button
          key={i.id}
          type="button"
          onClick={() => setItems((prev) => prev.filter((x) => x.id !== i.id))}
          className={`pointer-events-auto w-full max-w-md text-left px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold ${tones[i.tone]}`}
        >
          {i.text}
        </button>
      ))}
    </div>
  )
}
