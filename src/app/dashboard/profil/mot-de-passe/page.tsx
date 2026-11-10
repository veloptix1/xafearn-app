'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ModifierMotDePassePage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 🛡️ SÉCURITÉ : Validation robuste
    if (newPassword.length < 6) return showToast('Le mot de passe doit faire au moins 6 caractères.', 'error')
    if (!/[A-Z]/.test(newPassword)) return showToast('Ajoute au moins une majuscule.', 'error')
    if (!/[0-9]/.test(newPassword)) return showToast('Ajoute au moins un chiffre.', 'error')
    if (newPassword !== confirmPassword) return showToast('Les mots de passe ne correspondent pas.', 'error')

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      showToast('Erreur : ' + error.message, 'error')
    } else {
      showToast('Mot de passe modifié avec succès !', 'success')
      setTimeout(() => router.push('/dashboard/profil'), 1500)
    }
    setSaving(false)
  }

  return (
    <main className="min-h-dvh bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard/profil" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Modifier le mot de passe</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto mt-2">
        <form onSubmit={handleSave} className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nouveau mot de passe</label>
            <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Confirmer le mot de passe</label>
            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
          </div>

          <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl">
            <p className="text-[10px] font-bold text-sky-800 uppercase tracking-wider mb-1">Règles de sécurité</p>
            <ul className="text-[10px] text-sky-700 space-y-0.5 list-disc pl-3">
              <li>Au moins 6 caractères</li>
              <li>Au moins 1 majuscule</li>
              <li>Au moins 1 chiffre</li>
            </ul>
          </div>

          {toast && (
            <div className={`p-3 rounded-xl text-xs font-bold text-center ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {toast.msg}
            </div>
          )}

          <button type="submit" disabled={saving} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl active:scale-95 disabled:opacity-50 transition shadow-md">
            {saving ? 'Enregistrement...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </main>
  )
}
