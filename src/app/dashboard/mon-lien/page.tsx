'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function MonLienPage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [network, setNetwork] = useState({ l1: 0, l2: 0, l3: 0, earnings: 0 })

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      // Niveau 1
      const { data: l1 } = await supabase.from('profiles').select('id').eq('referred_by', session.user.id)
      const l1Ids = l1?.map(p => p.id) || []

      // Niveau 2
      let l2Ids: string[] = []
      if (l1Ids.length > 0) {
        const { data: l2 } = await supabase.from('profiles').select('id').in('referred_by', l1Ids)
        l2Ids = l2?.map(p => p.id) || []
      }

      // Niveau 3
      let l3Ids: string[] = []
      if (l2Ids.length > 0) {
        const { data: l3 } = await supabase.from('profiles').select('id').in('referred_by', l2Ids)
        l3Ids = l3?.map(p => p.id) || []
      }

      // Gains
      const { data: txs } = await supabase.from('transactions').select('amount').eq('user_id', session.user.id).like('type', 'referral%')

      setNetwork({
        l1: l1Ids.length, l2: l2Ids.length, l3: l3Ids.length,
        earnings: txs?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0
      })
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const copy = () => {
    navigator.clipboard.writeText(`https://getagriculture.store/signup?ref=${profile?.referral_code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Mon Lien</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="bg-emerald-500 rounded-3xl p-6 text-white text-center shadow-lg">
          <p className="text-xs font-bold text-emerald-100 uppercase">Gains totaux</p>
          <p className="text-4xl font-black">{network.earnings.toLocaleString('fr-FR')} F</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Ton code</p>
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-3 text-center mb-4">
            <span className="text-xl font-black tracking-widest text-sky-600">{profile?.referral_code}</span>
          </div>
          <button onClick={copy} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl active:scale-95 transition">
            {copied ? 'Lien copié !' : 'Copier mon lien'}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="font-bold text-slate-900 mb-3">Mes niveaux</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-sky-50 rounded-xl p-3 text-center border border-sky-100">
              <p className="text-2xl font-black text-sky-600">{network.l1}</p>
              <p className="text-[10px] font-bold text-slate-500">Niveau 1</p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-3 text-center border border-indigo-100">
              <p className="text-2xl font-black text-indigo-600">{network.l2}</p>
              <p className="text-[10px] font-bold text-slate-500">Niveau 2</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
              <p className="text-2xl font-black text-purple-600">{network.l3}</p>
              <p className="text-[10px] font-bold text-slate-500">Niveau 3</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
