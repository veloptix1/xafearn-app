'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'
import PaymentMethodPicker from '@/components/PaymentMethodPicker'
import { useOnReturn } from '@/lib/useOnReturn'
import {
  DEFAULT_PAYMENT_SETTINGS,
  loadPaymentSettings,
  openExternal,
  rechargeFor,
  startLeekPay,
  type PaymentMethod,
  type PaymentSettings,
} from '@/lib/payments'

const COINS_PER_1000_FCFA = 800
const MIN_FCFA = 100

type Profile = { id: string; balance: number | null; coins_balance: number | null }

export default function BuyCoinsPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS)
  const [selectedFCFA, setSelectedFCFA] = useState(1000)
  const [customAmount, setCustomAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('balance')
  const [isProcessing, setIsProcessing] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  const refreshProfile = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('profiles').select('id, balance, coins_balance').eq('id', session.user.id).single()
    if (data) setProfile(data as Profile)
  }, [supabase])

  useEffect(() => {
    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      await refreshProfile()
      setSettings(await loadPaymentSettings(supabase))
      setLoading(false)
    })()
  }, [supabase, router, refreshProfile])

  // Après un paiement dans le navigateur intégré, le solde est rechargé en revenant dans l'app
  useOnReturn(refreshProfile)

  const balance = profile?.balance || 0
  const finalAmount = Math.min(customAmount ? parseInt(customAmount) || 0 : selectedFCFA, 10_000_000)
  const coinsToReceive = Math.floor((finalAmount / 1000) * COINS_PER_1000_FCFA)
  const isValidAmount = finalAmount >= MIN_FCFA

  const buyWithBalance = async () => {
    if (balance < finalAmount) return alert('Solde FCFA insuffisant. Recharge-le avec LeekPay ou SoleasPay.')
    // Conversion faite côté serveur (800 jetons pour 1000 FCFA)
    const { data, error } = await supabase.rpc('buy_coins_with_balance', { p_fcfa: finalAmount })
    if (error || !data?.success) return alert(data?.error || "Erreur lors de l'achat.")
    alert(`Achat réussi ! +${data.coins} jetons`)
    router.push('/dashboard')
  }

  const handlePay = async () => {
    if (!isValidAmount) return alert(`Le minimum est de ${MIN_FCFA} FCFA.`)
    setIsProcessing(true)
    setInfo(null)
    try {
      if (method === 'balance') {
        await buyWithBalance()
      } else if (method === 'leekpay') {
        const url = await startLeekPay(rechargeFor(finalAmount, balance), `Recharge pour ${coinsToReceive} jetons`)
        await openExternal(url)
        setInfo('Termine le paiement, puis reviens ici : ton solde se met à jour tout seul. Choisis ensuite « Mon solde » pour obtenir tes jetons.')
      } else {
        await openExternal(settings.soleasLink)
        setInfo("Ton paiement SoleasPay sera validé par l'équipe après réception. Tu recevras une notification.")
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Paiement impossible.')
    } finally {
      setIsProcessing(false)
    }
  }

  const ctaLabel =
    method === 'balance'
      ? `Payer ${finalAmount.toLocaleString('fr-FR')} F avec mon solde`
      : method === 'leekpay'
        ? 'Payer avec LeekPay'
        : 'Payer avec SoleasPay'
  const ctaDisabled = isProcessing || !isValidAmount || (method === 'balance' && balance < finalAmount)

  if (loading)
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )

  return (
    <main className="min-h-dvh bg-slate-50 pb-6">
      <PageHeader title="Acheter des jetons" backHref="/dashboard" />

      <div className="p-4 max-w-md mx-auto mt-2 space-y-4">
        <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-lg flex justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Solde FCFA</p>
            <p className="text-xl font-black">{balance.toLocaleString('fr-FR')} F</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mes Jetons</p>
            <p className="text-xl font-black text-amber-400">{profile?.coins_balance || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-900 mb-3 text-sm">Choisis ton montant</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[100, 500, 1000, 2500].map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  setSelectedFCFA(amount)
                  setCustomAmount('')
                }}
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
                inputMode="numeric"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder={`${MIN_FCFA}`}
                min={MIN_FCFA}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-base outline-none focus:border-amber-500 pr-16"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">FCFA</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-amber-700">Tu recevras</span>
            <span className="text-xl font-black text-amber-900">{coinsToReceive.toLocaleString('fr-FR')} Jetons</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-amber-600">Pour un total de</span>
            <span className="text-sm font-bold text-amber-700">{finalAmount.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
          <h2 className="font-bold text-slate-900 mb-3 text-sm">Moyen de paiement</h2>
          <PaymentMethodPicker amount={finalAmount} balance={balance} settings={settings} value={method} onChange={setMethod} />
        </div>

        {info && <div className="bg-sky-50 border border-sky-200 text-sky-800 text-xs rounded-2xl p-4 leading-relaxed">{info}</div>}

        <button onClick={handlePay} disabled={ctaDisabled} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50 active:scale-95 transition shadow-md">
          {isProcessing ? 'Traitement…' : ctaLabel}
        </button>

        {!isValidAmount && finalAmount > 0 && <p className="text-xs text-red-500 text-center font-bold">Le minimum est de {MIN_FCFA} FCFA.</p>}
      </div>
    </main>
  )
}
