'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'

const PAYS_OPERATEURS: Record<string, { nom: string, operateurs: string[] }> = {
  CM: { nom: 'Cameroun', operateurs: ['Orange Money', 'MTN Mobile Money'] },
  CI: { nom: "Côte d'Ivoire", operateurs: ['Orange Money', 'MTN Mobile Money', 'Moov Money', 'Wave'] },
  SN: { nom: 'Sénégal', operateurs: ['Orange Money', 'Wave', 'Free Money'] },
  BF: { nom: 'Burkina Faso', operateurs: ['Orange Money', 'Moov Money'] },
  ML: { nom: 'Mali', operateurs: ['Orange Money', 'Moov Money'] },
  BJ: { nom: 'Bénin', operateurs: ['MTN Mobile Money', 'Moov Money', 'Celtiis Cash'] },
  TG: { nom: 'Togo', operateurs: ['T-Money (Togocom)', 'Moov Money'] },
  NE: { nom: 'Niger', operateurs: ['Airtel Money', 'Orange Money', 'Moov Money'] },
  GA: { nom: 'Gabon', operateurs: ['Airtel Money', 'Moov Money'] },
  CG: { nom: 'Congo', operateurs: ['Airtel Money', 'MTN Mobile Money'] },
  CD: { nom: 'RD Congo', operateurs: ['Airtel Money', 'Orange Money', 'M-Pesa (Vodacom)'] },
  GN: { nom: 'Guinée', operateurs: ['Orange Money', 'MTN Mobile Money'] },
}

export default function RetraitPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null)

  const [country, setCountry] = useState('CM')
  const [operator, setOperator] = useState('Orange Money')
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [amount, setAmount] = useState('')

  const FEE_RATE = 0.05 // 5% de frais

  const getMinAmount = (level: number) => {
    if (level === 3) return 500
    if (level === 2) return 1000
    return 2000
  }

  const minAmount = getMinAmount(profile?.level || 1)
  const balance = profile?.balance || 0

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data } = await supabase.from('profiles').select('id, balance, level, full_name, phone, country').eq('id', user.id).single()
      setProfile(data)
      setFullName(data?.full_name || '')
      setPhone(data?.phone || '')
      
      if (data?.country && PAYS_OPERATEURS[data.country]) {
        setCountry(data.country)
        setOperator(PAYS_OPERATEURS[data.country].operateurs[0])
      }
      
      setLoading(false)
    }
    load()
  }, [router, supabase])

  useEffect(() => {
    if (PAYS_OPERATEURS[country]) {
      setOperator(PAYS_OPERATEURS[country].operateurs[0])
    }
  }, [country])

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const numericAmount = parseFloat(amount) || 0
  const feeAmount = numericAmount * FEE_RATE
  const netAmount = numericAmount - feeAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 🛡️ SÉCURITÉ : Validations strictes
    if (isNaN(numericAmount) || numericAmount < minAmount) {
      return showToast(`Le montant minimum pour ton niveau est de ${minAmount} FCFA.`, 'error')
    }
    if (numericAmount > balance) {
      return showToast('Ton solde est insuffisant.', 'error')
    }
    if (!phone || !/^[0-9]{8,15}$/.test(phone.replace(/\s/g, ''))) {
      return showToast('Numéro de téléphone invalide.', 'error')
    }
    if (!fullName || fullName.trim().length < 2) {
      return showToast('Nom complet invalide.', 'error')
    }

    setSubmitting(true)

    // Opération atomique côté serveur : contrôle du solde, frais, débit et création de la demande
    const { data, error } = await supabase.rpc('request_withdrawal', {
      p_amount: numericAmount,
      p_country: country,
      p_operator: operator,
      p_phone: phone.replace(/\s/g, ''),
      p_full_name: fullName.trim(),
    })

    if (error || !data?.success) {
      showToast(data?.error || 'Erreur : ' + (error?.message ?? 'demande refusée'), 'error')
      setSubmitting(false)
      return
    }

    setProfile({ ...profile, balance: data.new_balance })
    showToast('Demande de retrait envoyée !', 'success')
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (loading) return (
    <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-dvh bg-slate-50 pb-6">
      {toast && (
        <div className={`fixed top-[max(env(safe-area-inset-top,0px),1rem)] left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl shadow-xl font-bold text-sm text-white ${
          toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        }`}>
          {toast.msg}
        </div>
      )}

      <PageHeader title="Retirer mes gains" backHref="/dashboard" />

      <div className="p-4 max-w-lg mx-auto mt-2">
        
        {/* Carte Solde */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-3xl p-5 text-white shadow-lg mb-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider mb-1">Solde disponible</p>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-black">{balance.toLocaleString('fr-FR')}</span>
              <span className="text-sm font-bold text-emerald-100">FCFA</span>
            </div>
            <div className="bg-white/20 rounded-xl p-2.5 text-[11px]">
              Niveau {profile?.level} • Retrait minimum : <strong>{minAmount.toLocaleString('fr-FR')} FCFA</strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-sm">Informations de retrait</h2>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pays</label>
            <select value={country} onChange={e => setCountry(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 text-sm">
              {Object.entries(PAYS_OPERATEURS).map(([code, data]) => (
                <option key={code} value={code}>{data.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Opérateur Mobile Money</label>
            <select value={operator} onChange={e => setOperator(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-900 text-sm">
              {PAYS_OPERATEURS[country]?.operateurs.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Numéro de téléphone</label>
            <input type="tel" required placeholder="Ex: 690000000" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nom complet (titulaire)</label>
            <input type="text" required placeholder="Nom inscrit sur le compte" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Montant à retirer (FCFA)</label>
            <input type="number" inputMode="numeric" required min={minAmount} max={balance} placeholder={`Min. ${minAmount}`} value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 font-black text-lg" />
          </div>

          {numericAmount > 0 && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Montant demandé</span>
                <span className="font-bold">{numericAmount.toLocaleString('fr-FR')} F</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>Frais de retrait (5%)</span>
                <span className="font-bold">-{feeAmount.toLocaleString('fr-FR')} F</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-emerald-600 font-bold text-sm">
                <span>Tu recevras</span>
                <span>{netAmount.toLocaleString('fr-FR')} F</span>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting || numericAmount < minAmount || numericAmount > balance} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 disabled:opacity-50 transition shadow-md">
            {submitting ? 'Envoi...' : 'Confirmer le retrait'}
          </button>
        </form>
      </div>
    </main>
  )
}
