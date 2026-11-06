'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SecuritePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null)

  const [prefs, setPrefs] = useState({
    security_2fa: false,
    security_login_alerts: true,
    security_new_device: true,
    security_payment_alerts: true,
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setPrefs({
          security_2fa: data.security_2fa ?? false,
          security_login_alerts: data.security_login_alerts ?? true,
          security_new_device: data.security_new_device ?? true,
          security_payment_alerts: data.security_payment_alerts ?? true,
        })
      }
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const toggle = (key: keyof typeof prefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update(prefs).eq('id', user.id)
    if (error) {
      setToast({ msg: 'Erreur : ' + error.message, type: 'error' })
    } else {
      setToast({ msg: 'Paramètres de sécurité enregistrés !', type: 'success' })
      setTimeout(() => router.push('/dashboard/profil'), 1500)
    }
    setSaving(false)
    setTimeout(() => setToast(null), 3000)
  }

  const options = [
    { key: 'security_2fa', title: 'Authentification à deux facteurs', desc: 'Sécurisez votre compte avec un code envoyé par email.', isPremium: true },
    { key: 'security_login_alerts', title: 'Alertes de connexion', desc: 'Recevez un email à chaque nouvelle connexion.' },
    { key: 'security_new_device', title: 'Nouvel appareil', desc: 'Soyez alerté si quelqu\'un se connecte depuis un appareil inconnu.' },
    { key: 'security_payment_alerts', title: 'Alertes de retrait', desc: 'Confirmation par email à chaque demande de retrait.' },
  ]

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard/profil" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Sécurité</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto mt-2">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-5">
          {options.map((opt, idx) => (
            <div key={opt.key} className={`p-4 flex items-center justify-between ${idx !== options.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-sm">{opt.title}</p>
                  {opt.isPremium && <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded">Conseillé</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{opt.desc}</p>
              </div>
              <button
                onClick={() => toggle(opt.key as keyof typeof prefs)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${prefs[opt.key as keyof typeof prefs] ? 'bg-sky-500' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs[opt.key as keyof typeof prefs] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>

        {toast && (
          <div className={`p-3 rounded-xl text-xs font-bold text-center mb-4 ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {toast.msg}
          </div>
        )}

        <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl active:scale-95 disabled:opacity-50 transition shadow-md">
          {saving ? 'Enregistrement...' : 'Mettre à jour la sécurité'}
        </button>
      </div>
    </main>
  )
}
