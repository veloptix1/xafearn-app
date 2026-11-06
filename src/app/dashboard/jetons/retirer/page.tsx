'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const RATE = 5 // 1 jeton = 5 FCFA (à ajuster)

export default function WithdrawCoinsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('wave')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const coins = parseInt(amount)
    
    if (!coins || coins < 100) {
      return showToast('Minimum 100 jetons pour retirer.', 'error')
    }

    if (coins > (profile.coins_balance || 0)) {
      return showToast('Solde de jetons insuffisant.', 'error')
    }

    if (!phone) {
      return showToast('Entre ton numéro de téléphone.', 'error')
    }

    setIsSubmitting(true)

    try {
      const fcfaAmount = coins * RATE

      const { error } = await supabase.from('withdrawals').insert({
        user_id: profile.id,
        amount: fcfaAmount,
        method: method,
        phone: phone,
        status: 'pending',
        type: 'coins_exchange'
      })

      if (error) throw error

      await supabase.from('profiles').update({
        coins_balance: (profile.coins_balance || 0) - coins
      }).eq('id', profile.id)

      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Demande de retrait envoyée',
        message: `Ta demande de ${fcfaAmount} FCFA est en cours de traitement.`,
        link: '/dashboard/historique'
      })

      showToast('Demande envoyée avec succès !', 'success')
      setProfile({ ...profile, coins_balance: (profile.coins_balance || 0) - coins })
      setAmount('')
      setPhone('')
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  const coins = parseInt(amount) || 0
  const fcfaReceived = coins * RATE

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-black text-slate-900">Retirer</h1>
        </div>
        <div className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl border border-amber-100 flex items-center gap-1.5 text-xs font-bold">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
          {profile?.coins_balance || 0}
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <h2 className="font-black text-xl mb-1">Convertis tes jetons</h2>
            <p className="text-amber-100 text-xs leading-relaxed">Échange tes jetons contre des FCFA envoyés directement sur Wave, Orange Money ou MTN.</p>
            <p className="mt-3 text-xs font-bold bg-white/20 px-3 py-1.5 rounded-lg inline-block">Taux actuel : 1 jeton = {RATE} FCFA</p>
          </div>
        </div>

        <form onSubmit={handleWithdraw} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre de jetons à convertir</label>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              placeholder="Ex: 500"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-900 focus:border-sky-400 outline-none"
            />
            {coins > 0 && (
              <p className="text-xs font-bold text-emerald-600 mt-2">Tu recevras : {fcfaReceived.toLocaleString('fr-FR')} FCFA</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Méthode de paiement</label>
            <div className="grid grid-cols-3 gap-2">
              {['wave', 'orange', 'mtn'].map(m => (
                <button 
                  key={m} 
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-3 rounded-xl font-bold text-xs capitalize transition border-2 ${method === m ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-600'}`}
                >
                  {m === 'wave' ? 'Wave' : m === 'orange' ? 'Orange' : 'MTN'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Numéro de téléphone</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              placeholder="Ex: 690000000"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-sky-400 outline-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || coins < 100}
            className="w-full py-4 bg-amber-500 text-white font-bold rounded-xl active:scale-95 transition disabled:opacity-50 shadow-md"
          >
            {isSubmitting ? 'Traitement...' : 'Demander le retrait'}
          </button>
        </form>
      </div>
    </main>
  )
}
