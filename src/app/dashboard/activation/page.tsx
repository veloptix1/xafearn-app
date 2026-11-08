'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ActivationPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [price, setPrice] = useState(2000)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(data)

      const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'activation_price').single()
      if (setting) setPrice(parseInt(setting.value))
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const activate = async (method: 'balance' | 'leekpay') => {
    if (method === 'leekpay') {
      window.location.href = `https://getagriculture.store/dashboard/activation`
      return
    }
    if ((profile?.balance || 0) < price) return alert('Solde insuffisant.')
    
    setProcessing(true)
    const { error } = await supabase.rpc('activate_premium_account', { p_user_id: profile.id })
    if (!error) {
      alert('Compte activé avec succès !')
      router.push('/dashboard')
    } else alert('Erreur: ' + error.message)
    setProcessing(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Activation Premium</h1>
      </header>

      <div className="p-4 max-w-md mx-auto">
        {profile?.is_premium ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-xl font-black text-emerald-900 mb-2">Compte Activé</h2>
            <p className="text-sm text-emerald-700">Tu as accès à toutes les fonctionnalités Premium.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 text-white text-center shadow-lg">
              <h2 className="text-2xl font-black mb-1">Passe au niveau supérieur</h2>
              <p className="text-amber-100 text-sm">Débloque les tâches Premium et le parrainage.</p>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Prix d'activation</span>
                <span className="text-2xl font-black text-slate-900">{price.toLocaleString('fr-FR')} F</span>
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <span className="text-slate-500 font-medium">Ton solde</span>
                <span className={`font-black ${(profile?.balance || 0) >= price ? 'text-emerald-600' : 'text-red-500'}`}>
                  {profile?.balance?.toLocaleString('fr-FR') || 0} F
                </span>
              </div>

              <div className="space-y-2">
                <button onClick={() => activate('leekpay')} className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl active:scale-95 transition shadow-md">
                  Payer par Mobile Money
                </button>
                <button onClick={() => activate('balance')} disabled={processing || (profile?.balance || 0) < price} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50 active:scale-95 transition shadow-md">
                  {processing ? 'Activation...' : 'Payer avec mon solde'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
