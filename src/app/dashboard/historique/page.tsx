'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function HistoriquePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'gains' | 'diffusions'>('gains')
  const [profile, setProfile] = useState<any>(null)
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: wds } = await supabase.from('withdrawals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setWithdrawals(wds || [])

      const { data: subs } = await supabase.from('ad_submissions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setSubmissions(subs || [])

      if (subs && subs.length > 0) {
        const campIds = subs.map(s => s.campaign_id)
        const { data: camps } = await supabase.from('campaigns').select('*').in('id', campIds)
        setCampaigns(camps || [])
      }
      setLoading(false)
    }
    load()
  }, [router, supabase])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  const level = profile?.level || 1
  const gainPerView = level === 1 ? 0.50 : level === 2 ? 1.25 : 1.75

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Mon Historique</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto mt-2">
        
        <div className="flex bg-slate-200 p-1 rounded-xl mb-5">
          <button onClick={() => setActiveTab('gains')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === 'gains' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Gains
          </button>
          <button onClick={() => setActiveTab('diffusions')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${activeTab === 'diffusions' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            Diffusions
          </button>
        </div>

        {activeTab === 'gains' && (
          <div className="space-y-3">
            {withdrawals.length === 0 ? (
              <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 mb-1 text-sm">Aucun retrait</h3>
                <p className="text-slate-500 text-xs">Vos demandes apparaîtront ici.</p>
              </div>
            ) : (
              withdrawals.map(w => (
                <div key={w.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{w.operator} ({w.country})</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(w.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Frais: {w.fee} F</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 text-sm">{w.amount?.toLocaleString('fr-FR')} F</p>
                    <p className={`text-[10px] font-bold mt-1 ${w.status === 'paid' ? 'text-emerald-600' : w.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>
                      {w.status === 'paid' ? 'Payé' : w.status === 'rejected' ? 'Rejeté' : 'En attente'}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div className="bg-sky-50 border border-sky-100 p-3 rounded-2xl mt-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-sky-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-[10px] text-sky-800 font-medium">Ton gain actuel : <strong>{gainPerView.toFixed(2)} F / vue</strong> (Niveau {level})</p>
            </div>
          </div>
        )}

        {activeTab === 'diffusions' && (
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                </div>
                <h3 className="font-bold text-slate-900 mb-1 text-sm">Aucune diffusion</h3>
                <p className="text-slate-500 text-xs">Vos diffusions apparaîtront ici.</p>
              </div>
            ) : (
              submissions.map(s => {
                const campaign = campaigns.find(c => c.id === s.campaign_id)
                return (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex gap-3 p-3">
                      {campaign?.image_url && (
                        <img src={campaign.image_url} className="w-14 h-14 rounded-lg object-cover shrink-0" alt={campaign.title} />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-xs truncate">{campaign?.title || 'Campagne'}</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">{new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                        <div className="flex justify-between items-center mt-1.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                            s.status === 'validated' ? 'bg-emerald-100 text-emerald-700' : 
                            s.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {s.status === 'validated' ? 'Validé' : s.status === 'rejected' ? 'Rejeté' : 'En attente'}
                          </span>
                          {s.status === 'validated' && (
                            <span className="text-[10px] font-bold text-emerald-600">
                              +{((s.views_count || 0) * gainPerView).toFixed(0)} F
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </main>
  )
}
