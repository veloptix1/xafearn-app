'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ModifierTelephonePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null)
  const [phone, setPhone] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data } = await supabase.from('profiles').select('phone').eq('id', user.id).single()
      setPhone(data?.phone || '')
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 🛡️ SÉCURITÉ : Validation du numéro
    const cleanPhone = phone.replace(/\s/g, '')
    if (!/^[0-9+]{8,15}$/.test(cleanPhone)) return showToast('Numéro invalide (8 à 15 chiffres).', 'error')

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').update({ phone: cleanPhone }).eq('id', user.id)

    if (error) {
      showToast('Erreur : ' + error.message, 'error')
    } else {
      showToast('Numéro mis à jour !', 'success')
      setTimeout(() => router.push('/dashboard/profil'), 1500)
    }
    setSaving(false)
  }

  if (loading) return <div className="min-h-dvh bg-slate-50 flex items-center justify-center text-slate-500">Chargement...</div>

  return (
    <main className="min-h-dvh bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard/profil" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Changer le numéro</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto mt-2">
        <form onSubmit={handleSave} className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Numéro de téléphone</label>
            <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+237 690 00 00 00" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
          </div>

          {toast && (
            <div className={`p-3 rounded-xl text-xs font-bold text-center ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {toast.msg}
            </div>
          )}

          <button type="submit" disabled={saving} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl active:scale-95 disabled:opacity-50 transition shadow-md">
            {saving ? 'Enregistrement...' : 'Mettre à jour'}
          </button>
        </form>
      </div>
    </main>
  )
}
