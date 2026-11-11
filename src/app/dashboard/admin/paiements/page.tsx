'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'

type Provider = 'leekpay' | 'soleaspay' | 'manual' | 'disabled'

function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="w-full flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl text-left active:bg-slate-100">
      <span>
        <span className="block font-bold text-slate-900 text-sm">{label}</span>
        <span className="block text-xs text-slate-500">{sub}</span>
      </span>
      <span className={`w-12 h-7 rounded-full p-0.5 transition shrink-0 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className={`block w-6 h-6 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}

export default function AdminPaiementsPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null)

  const [provider, setProvider] = useState<Provider>('leekpay')
  const [soleasLink, setSoleasLink] = useState('')
  const [leekEnabled, setLeekEnabled] = useState(true)
  const [soleasEnabled, setSoleasEnabled] = useState(false)

  useEffect(() => {
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')

      // Contrôle d'affichage seulement : l'enregistrement est de toute façon refusé par le serveur si on n'est pas admin
      const { data: prof } = await supabase.from('profiles').select('role, is_admin').eq('id', session.user.id).single()
      if (!prof || (prof.role !== 'admin' && !prof.is_admin)) return router.replace('/dashboard')

      const { data } = await supabase.rpc('get_payment_settings')
      if (data) {
        setProvider((data.provider as Provider) || 'leekpay')
        setSoleasLink(data.soleaspay_link || '')
        setLeekEnabled(!!data.leekpay_enabled)
        setSoleasEnabled(!!data.soleaspay_enabled)
      }
      setLoading(false)
    })()
  }, [supabase, router])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3500)
    return () => clearTimeout(t)
  }, [notice])

  const linkInvalid = soleasLink.trim() !== '' && !/^https:\/\/\S+$/i.test(soleasLink.trim())

  const save = async () => {
    if (linkInvalid) return setNotice({ text: 'Le lien doit commencer par https://', ok: false })
    if (soleasEnabled && !soleasLink.trim()) return setNotice({ text: 'Ajoute le lien SoleasPay avant de l’activer.', ok: false })
    setSaving(true)
    const { data, error } = await supabase.rpc('admin_set_payment_settings', {
      p_provider: provider,
      p_soleas_link: soleasLink.trim(),
      p_leek_enabled: leekEnabled,
      p_soleas_enabled: soleasEnabled,
    })
    setSaving(false)
    if (error || !data?.success) return setNotice({ text: data?.error || 'Enregistrement impossible.', ok: false })
    setNotice({ text: 'Réglages enregistrés ✔', ok: true })
  }

  if (loading)
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )

  return (
    <main className="min-h-dvh bg-slate-50 pb-6">
      <PageHeader title="Paiements" backHref="/dashboard/admin" />

      {notice && (
        <div role="alert" className={`fixed left-3 right-3 z-[300] text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg ${notice.ok ? 'bg-emerald-600' : 'bg-red-600'}`} style={{ top: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}>
          {notice.text}
        </div>
      )}

      <div className="p-4 max-w-md mx-auto mt-2 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Fournisseur principal</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)} className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl text-base outline-none focus:border-sky-400">
              <option value="leekpay">LeekPay</option>
              <option value="soleaspay">SoleasPay</option>
              <option value="manual">Lien manuel (admin)</option>
              <option value="disabled">Désactiver les paiements externes</option>
            </select>
          </div>

          <Toggle on={leekEnabled} onChange={setLeekEnabled} label="LeekPay" sub="Mobile Money / carte, recharge automatique du solde" />
          <Toggle on={soleasEnabled} onChange={setSoleasEnabled} label="SoleasPay" sub="Lien de paiement, validation manuelle" />

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Lien de paiement SoleasPay</label>
            <input
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              value={soleasLink}
              onChange={(e) => setSoleasLink(e.target.value)}
              placeholder="https://…"
              className={`w-full h-12 px-3 bg-slate-50 border rounded-xl text-base outline-none ${linkInvalid ? 'border-red-400' : 'border-slate-200 focus:border-sky-400'}`}
            />
            {linkInvalid && <p className="text-xs text-red-500 mt-1 font-semibold">Le lien doit commencer par https://</p>}
            <p className="text-[11px] text-slate-400 mt-1">Les utilisateurs l&apos;ouvrent depuis les pages de paiement. Tu valides ensuite leur paiement à la main.</p>
          </div>
        </div>

        <button onClick={save} disabled={saving} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50 active:scale-95 transition shadow-md">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </main>
  )
}
