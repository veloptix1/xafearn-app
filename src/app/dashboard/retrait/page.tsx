'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
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

    const { error } = await supabase.from('withdrawals').insert({
      user_id: profile.id,
      amount: numericAmount,
      fee: feeAmount,
      net_amount: netAmount,
      country,
      operator,
      phone_number: phone.replace(/\s/g, ''),
      full_name: fullName.trim(),
      status: 'pending'
    })

    if (error) {
      showToast('Erreur: ' + error.message, 'error')
      setSubmitting(false)
      return
    }

    await supabase.from('profiles').update({ balance: balance - numericAmount }).eq('id', profile.id)

    await supabase.from('notifications').insert({
      user_id: profile.id,
      title: 'Demande de retrait',
      message: `Ta demande de retrait de ${numericAmount.toLocaleString('fr-FR')} FCFA a été envoyée. Tu recevras ${netAmount.toLocaleString('fr-FR')} FCFA sous 72h.`,
      link: '/dashboard/historique'
    })

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
    <main className="min-h-dvh bg-slate-50 pb-24">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl shadow-xl font-bold text-sm text-white ${
          toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        }`}>
          {toast.msg}
        </div>
      )}

      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Retirer mes gains</h1>
      </header>

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
            <input type="number" required min={minAmount} max={balance} placeholder={`Min. ${minAmount}`} value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 font-black text-lg" />
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
