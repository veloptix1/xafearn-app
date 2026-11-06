'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

const PACKS = [
  { coins: 100, price: 500, bonus: 0, popular: false },
  { coins: 300, price: 1000, bonus: 50, popular: true },
  { coins: 700, price: 2000, bonus: 150, popular: false },
  { coins: 1500, price: 4000, bonus: 400, popular: false },
]

export default function BuyCoinsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [selectedPack, setSelectedPack] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
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

  const handlePurchase = async () => {
    if (!selectedPack) return
    setIsProcessing(true)

    try {
      // Simulation d'achat (à connecter avec ton vrai système de paiement)
      const totalCoins = selectedPack.coins + selectedPack.bonus
      
      const { error } = await supabase.from('profiles').update({
        coins_balance: (profile.coins_balance || 0) + totalCoins
      }).eq('id', profile.id)

      if (error) throw error

      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Jetons crédités',
        message: `${totalCoins} jetons ont été ajoutés à ton compte.`,
        link: '/dashboard'
      })

      showToast(`${totalCoins} jetons ajoutés avec succès !`, 'success')
      setProfile({ ...profile, coins_balance: (profile.coins_balance || 0) + totalCoins })
      setSelectedPack(null)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center justify-between">
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

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <h2 className="font-black text-xl mb-1">Booste ton compte</h2>
            <p className="text-slate-400 text-xs leading-relaxed">Achète des jetons pour débloquer des épisodes de séries et soutenir tes créateurs préférés.</p>
          </div>
        </div>

        <div className="space-y-3 mt-4">
          {PACKS.map((pack, idx) => (
            <button 
              key={idx}
              onClick={() => setSelectedPack(pack)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${
                selectedPack?.coins === pack.coins 
                  ? 'border-sky-500 bg-sky-50 shadow-md' 
                  : 'border-slate-200 bg-white'
              }`}
            >
              {pack.popular && (
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                  POPULAIRE
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedPack?.coins === pack.coins ? 'bg-sky-500 text-white' : 'bg-amber-100 text-amber-600'}`}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                  </div>
                  <div>
                    <p className="font-black text-lg text-slate-900">{pack.coins} jetons</p>
                    {pack.bonus > 0 && (
                      <p className="text-xs font-bold text-emerald-600">+{pack.bonus} offerts</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">{pack.price.toLocaleString('fr-FR')} F</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button 
          onClick={handlePurchase}
          disabled={!selectedPack || isProcessing}
          className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl active:scale-95 transition disabled:opacity-50 shadow-lg shadow-sky-500/30 mt-4"
        >
          {isProcessing ? 'Traitement...' : `Payer ${selectedPack ? selectedPack.price.toLocaleString('fr-FR') : ''} F`}
        </button>
      </div>
    </main>
  )
}
