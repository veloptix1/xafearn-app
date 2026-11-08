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
  const [stats, setStats] = useState({ level1: 0, earnings: 0 })

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)

      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', session.user.id)
      const { data: txs } = await supabase.from('transactions').select('amount').eq('user_id', session.user.id).like('type', 'referral%')
      
      setStats({ 
        level1: count || 0, 
        earnings: txs?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0 
      })
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const referralLink = `https://getagriculture.store/signup?ref=${profile?.referral_code}`

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Mon Lien</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="bg-slate-900 rounded-3xl p-6 text-white text-center shadow-lg">
          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Gains de parrainage</p>
          <p className="text-4xl font-black">{stats.earnings.toLocaleString('fr-FR')} F</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Ton code unique</p>
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-3 text-center mb-4">
            <span className="text-xl font-black tracking-widest text-sky-600">{profile?.referral_code}</span>
          </div>
          <button onClick={copyLink} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl active:scale-95 transition">
            {copied ? 'Lien copié !' : 'Copier mon lien d\'invitation'}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="font-bold text-slate-900 mb-3">Mon réseau</p>
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
            <span className="text-sm text-slate-600">Filleuls directs</span>
            <span className="font-black text-lg text-emerald-600">{stats.level1}</span>
          </div>
        </div>
      </div>
    </main>
  )
}
