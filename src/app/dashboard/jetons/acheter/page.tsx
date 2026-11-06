'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Browser } from '@capacitor/browser'
import Toast from '@/components/Toast'

const COINS_PER_1000_FCFA = 800
const VERCEL_URL = 'https://getagriculture.store'

export default function BuyCoinsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [selectedFCFA, setSelectedFCFA] = useState(1000)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const coinsToReceive = Math.floor((selectedFCFA / 1000) * COINS_PER_1000_FCFA)

  const handleBuyWithBalance = async () => {
    if ((profile.balance || 0) < selectedFCFA) return showToast('Solde FCFA insuffisant.', 'error')
    setIsProcessing(true)
    try {
      await supabase.from('profiles').update({ balance: profile.balance - selectedFCFA }).eq('id', profile.id)
      await supabase.from('profiles').update({ coins_balance: (profile.coins_balance || 0) + coinsToReceive }).eq('id', profile.id)
      await supabase.from('notifications').insert({ user_id: profile.id, title: 'Jetons achetés', message: `+${coinsToReceive} jetons`, link: '/dashboard/reseau' })
      showToast(`${coinsToReceive} jetons ajoutés !`, 'success')
      setTimeout(() => router.push('/dashboard/reseau'), 1500)
    } catch (err: any) { showToast('Erreur : ' + err.message, 'error') }
    setIsProcessing(false)
  }

  // 🚀 NOUVEAU : LeekPay avec navigateur in-app
  const handleBuyWithLeekPay = async () => {
    setIsProcessing(true)
    try {
      // 1. Demander à ton API Vercel de créer la session LeekPay
      const res = await fetch(`${VERCEL_URL}/api/leekpay/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: selectedFCFA, 
          description: `Achat de ${coinsToReceive} jetons XAFEARN`,
          user_id: profile.id,
          return_url: 'com.xafearn.app://checkout' // Lien de retour vers l'app
        })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur LeekPay')

      // 2. Ouvrir le navigateur in-app avec l'URL de paiement LeekPay
      await Browser.open({ url: data.payment_url })
      
    } catch (err: any) {
      showToast(err.message, 'error')
      setIsProcessing(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-black text-slate-900">Acheter des jetons</h1>
        </div>
        <div className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl border border-amber-100 flex items-center gap-1.5 text-xs font-bold">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
          {profile?.coins_balance || 0}
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mb-5 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Solde FCFA</p>
            <p className="text-2xl font-black text-emerald-600">{profile?.balance?.toLocaleString('fr-FR')} F</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mes jetons</p>
            <p className="text-2xl font-black text-amber-500">{profile?.coins_balance || 0}</p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          {[1000, 2500, 5000, 10000].map(amount => (
            <button 
              key={amount} 
              onClick={() => setSelectedFCFA(amount)} 
              className={`w-full p-4 rounded-2xl border-2 transition flex justify-between items-center ${
                selectedFCFA === amount 
                  ? 'border-amber-500 bg-amber-50 shadow-md' 
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedFCFA === amount ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                </div>
                <div className="text-left">
                  <span className="font-black text-slate-900 block">{Math.floor((amount / 1000) * COINS_PER_1000_FCFA)} jetons</span>
                  <span className="text-xs text-slate-500">{amount.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
              {selectedFCFA === amount && (
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <button 
            onClick={handleBuyWithBalance} 
            disabled={isProcessing || (profile?.balance || 0) < selectedFCFA} 
            className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 disabled:opacity-50 transition shadow-md flex justify-center items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            Payer avec mon solde ({selectedFCFA.toLocaleString('fr-FR')} F)
          </button>
          
          <button 
            onClick={handleBuyWithLeekPay} 
            disabled={isProcessing} 
            className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl active:scale-95 disabled:opacity-50 transition shadow-md flex justify-center items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            {isProcessing ? 'Ouverture...' : 'Payer par Mobile Money'}
          </button>
        </div>
      </div>
    </main>
  )
}
