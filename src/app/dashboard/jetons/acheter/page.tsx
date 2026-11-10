'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const COINS_PER_1000_FCFA = 800
const MIN_FCFA = 100

export default function BuyCoinsPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [selectedFCFA, setSelectedFCFA] = useState(1000)
  const [customAmount, setCustomAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const finalAmount = customAmount ? parseInt(customAmount) || 0 : selectedFCFA
  const coinsToReceive = Math.floor((finalAmount / 1000) * COINS_PER_1000_FCFA)
  const isValidAmount = finalAmount >= MIN_FCFA

  const handleBuyWithBalance = async () => {
    if (!isValidAmount) return alert(`Le minimum est de ${MIN_FCFA} FCFA.`)
    if ((profile.balance || 0) < finalAmount) return alert('Solde FCFA insuffisant.')
    
    setIsProcessing(true)
    try {
      await supabase.from('profiles').update({ balance: profile.balance - finalAmount }).eq('id', profile.id)
      await supabase.from('profiles').update({ coins_balance: (profile.coins_balance || 0) + coinsToReceive }).eq('id', profile.id)
      alert('Achat réussi !')
      router.push('/dashboard')
    } catch (err) {
      alert('Erreur lors de l\'achat.')
    }
    setIsProcessing(false)
  }

  const handleBuyWithLeekPay = async () => {
    if (!isValidAmount) return alert(`Le minimum est de ${MIN_FCFA} FCFA.`)
    window.location.href = 'https://getagriculture.store/dashboard/jetons/acheter'
  }

  if (loading) return <div className="min-h-dvh flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-dvh bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Acheter des Jetons</h1>
      </header>

      <div className="p-4 max-w-md mx-auto mt-2">
        
        <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-lg mb-4 flex justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Solde FCFA</p>
            <p className="text-xl font-black">{profile?.balance?.toLocaleString('fr-FR') || 0} F</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mes Jetons</p>
            <p className="text-xl font-black text-amber-400">{profile?.coins_balance || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 mb-4">
          <h2 className="font-bold text-slate-900 mb-3 text-sm">Choisis ton montant</h2>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[100, 500, 1000, 2500].map(amount => (
              <button 
                key={amount} 
                onClick={() => { setSelectedFCFA(amount); setCustomAmount('') }} 
                className={`p-3 rounded-xl border-2 transition text-left ${selectedFCFA === amount && !customAmount ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'}`}
              >
                <p className="font-bold text-slate-900 text-sm">{Math.floor((amount / 1000) * COINS_PER_1000_FCFA)} Jetons</p>
                <p className="text-[10px] text-slate-500">{amount.toLocaleString('fr-FR')} F</p>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Montant personnalisé (min. {MIN_FCFA} F)</label>
            <div className="relative">
              <input 
                type="number" 
                value={customAmount} 
                onChange={e => setCustomAmount(e.target.value)} 
                placeholder={`${MIN_FCFA}`} 
                min={MIN_FCFA}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 pr-16" 
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">FCFA</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-amber-700">Tu recevras</span>
            <span className="text-xl font-black text-amber-900">{coinsToReceive.toLocaleString('fr-FR')} Jetons</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-amber-600">Pour un total de</span>
            <span className="text-sm font-bold text-amber-700">{finalAmount.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={handleBuyWithLeekPay} disabled={isProcessing || !isValidAmount} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50 active:scale-95 transition shadow-md flex justify-center items-center gap-2">
            Payer par Mobile Money
          </button>
          
          <button onClick={handleBuyWithBalance} disabled={isProcessing || !isValidAmount || (profile?.balance || 0) < finalAmount} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50 active:scale-95 transition shadow-md">
            Payer avec mon solde ({finalAmount.toLocaleString('fr-FR')} F)
          </button>
        </div>

        {!isValidAmount && finalAmount > 0 && (
          <p className="text-xs text-red-500 text-center mt-2 font-bold">Le minimum est de {MIN_FCFA} FCFA.</p>
        )}
      </div>
    </main>
  )
}
