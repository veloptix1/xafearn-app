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

type Profile = { id: string; balance: number | null; is_premium: boolean | null }

export default function ActivationPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS)
  const [method, setMethod] = useState<PaymentMethod>('balance')
  const [processing, setProcessing] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  const price = settings.activationPrice

  const refreshProfile = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('profiles').select('id, balance, is_premium').eq('id', session.user.id).single()
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

  useOnReturn(refreshProfile)

  const balance = profile?.balance || 0

  const activateWithBalance = async () => {
    if (!profile) return
    if (balance < price) return alert('Solde insuffisant. Recharge-le avec LeekPay ou SoleasPay.')
    if (!confirm(`Activer le compte pour ${price.toLocaleString('fr-FR')} FCFA ?`)) return
    const { error } = await supabase.rpc('activate_premium_account', { p_user_id: profile.id })
    if (error) return alert('Activation impossible : ' + error.message)
    alert('Compte activé avec succès !')
    setTimeout(() => router.push('/dashboard'), 1200)
  }

  const handlePay = async () => {
    setProcessing(true)
    setInfo(null)
    try {
      if (method === 'balance') {
        await activateWithBalance()
      } else if (method === 'leekpay') {
        const url = await startLeekPay(rechargeFor(price, balance), 'Activation Premium XAFEARN')
        await openExternal(url)
        setInfo('Termine le paiement, puis reviens ici : ton solde se met à jour tout seul. Choisis ensuite « Mon solde » pour activer ton compte.')
      } else {
        await openExternal(settings.soleasLink)
        setInfo("Ton paiement SoleasPay sera validé par l'équipe après réception. Tu recevras une notification dès que ton compte sera activé.")
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Paiement impossible.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading)
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )

  const ctaLabel =
    method === 'balance' ? `Payer avec mon solde (${price.toLocaleString('fr-FR')} F)` : method === 'leekpay' ? 'Payer avec LeekPay' : 'Payer avec SoleasPay'

  return (
    <main className="min-h-dvh bg-slate-50 pb-6">
      <PageHeader title="Activation Premium" backHref="/dashboard" />

      <div className="p-4 max-w-md mx-auto mt-2 space-y-4">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white text-center shadow-lg">
          <h2 className="text-2xl font-black mb-1">Passe au niveau supérieur</h2>
          <p className="text-amber-100 text-sm">Débloque les tâches Premium et le parrainage à 3 niveaux.</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
            <span className="text-slate-500 font-medium">Frais d&apos;activation</span>
            <span className="text-2xl font-black text-slate-900">{price.toLocaleString('fr-FR')} F</span>
          </div>
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-500 font-medium">Ton solde</span>
            <span className={`font-black ${balance >= price ? 'text-emerald-600' : 'text-red-500'}`}>{balance.toLocaleString('fr-FR')} F</span>
          </div>

          {profile?.is_premium ? (
            <div className="w-full py-4 bg-emerald-50 text-emerald-600 font-bold rounded-xl text-center border border-emerald-200">✅ Ton compte est déjà activé</div>
          ) : (
            <div className="space-y-4">
              <PaymentMethodPicker amount={price} balance={balance} settings={settings} value={method} onChange={setMethod} />
              {info && <div className="bg-sky-50 border border-sky-200 text-sky-800 text-xs rounded-2xl p-4 leading-relaxed">{info}</div>}
              <button
                onClick={handlePay}
                disabled={processing || (method === 'balance' && balance < price)}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition"
              >
                {processing ? 'Traitement…' : ctaLabel}
              </button>
            </div>
          )}
        </div>

        {settings.soleasEnabled && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
            <p className="text-xs text-amber-800 leading-relaxed">
              💡 Le paiement par <strong>SoleasPay</strong> est validé manuellement par l&apos;équipe après réception.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
