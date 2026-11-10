'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AnalyticsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: c } = await supabase.from('campaigns').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setCampaigns(c || [])

      if (c && c.length > 0) {
        const campaignIds = c.map(camp => camp.id)
        const { data: s } = await supabase.from('ad_submissions').select('*').in('campaign_id', campaignIds)
        setSubmissions(s || [])

        const { data: p } = await supabase.from('profiles').select('id, city')
        setProfiles(p || [])
      }

      setLoading(false)
    }
    load()
  }, [router, supabase])

  if (loading) return (
    <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  const totalViews = submissions.reduce((acc, s) => acc + (s.views_count || 0), 0)
  const totalClicks = submissions.reduce((acc, s) => acc + (s.whatsapp_clicks || 0), 0)
  const totalBudget = campaigns.reduce((acc, c) => acc + (c.budget || 0), 0)
  const conversionRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0'

  const viewsByCity: Record<string, number> = {}
  submissions.forEach(sub => {
    const profile = profiles.find(p => p.id === sub.user_id)
    const city = profile?.city || 'Inconnue'
    viewsByCity[city] = (viewsByCity[city] || 0) + (sub.views_count || 0)
  })
  const topCities = Object.entries(viewsByCity).sort(([, a], [, b]) => b - a).slice(0, 4)

  return (
    <main className="min-h-dvh bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-black text-slate-900">Analytics</h1>
        </div>
        <Link href="/dashboard/annonces/creer" className="px-3 py-1.5 bg-sky-500 text-white text-xs font-bold rounded-lg active:scale-95 transition">
          + Campagne
        </Link>
      </header>

      <div className="p-4 max-w-lg mx-auto mt-2 space-y-5">
        
        {/* Stats globales */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Vues</p>
            <p className="text-xl font-black text-slate-900">{totalViews.toLocaleString('fr-FR')}</p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Clics</p>
            <p className="text-xl font-black text-emerald-600">{totalClicks.toLocaleString('fr-FR')}</p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Conv.</p>
            <p className="text-xl font-black text-sky-600">{conversionRate}%</p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Budget</p>
            <p className="text-xl font-black text-amber-600">{totalBudget.toLocaleString('fr-FR')} F</p>
          </div>
        </div>

        {/* Villes */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5">
          <h2 className="font-bold text-slate-900 text-sm mb-4">Où sont tes clients ?</h2>
          {topCities.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">Aucune donnée.</p>
          ) : (
            <div className="space-y-3">
              {topCities.map(([city, views], index) => {
                const percentage = totalViews > 0 ? (views / totalViews) * 100 : 0
                const colors = ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500']
                return (
                  <div key={city}>
                    <div className="flex justify-between text-[11px] font-bold mb-1">
                      <span className="text-slate-700">{index + 1}. {city}</span>
                      <span className="text-slate-900">{views.toLocaleString('fr-FR')} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`${colors[index]} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Campagnes */}
        <div>
          <h2 className="text-sm font-black text-slate-900 mb-3">Performance de tes campagnes</h2>
          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
                <p className="text-slate-500 text-xs mb-4">Aucune campagne.</p>
                <Link href="/dashboard/annonces/creer" className="inline-block px-5 py-2 bg-sky-500 text-white font-bold rounded-xl text-xs">Créer</Link>
              </div>
            ) : (
              campaigns.map(c => {
                const campSubs = submissions.filter(s => s.campaign_id === c.id)
                const views = campSubs.reduce((acc, s) => acc + (s.views_count || 0), 0)
                const clicks = campSubs.reduce((acc, s) => acc + (s.whatsapp_clicks || 0), 0)
                const progress = c.views_purchased > 0 ? Math.min((views / c.views_purchased) * 100, 100) : 0
                
                return (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 flex gap-3">
                      {c.image_url && (
                        <img src={c.image_url} className="w-16 h-16 object-cover rounded-xl shrink-0" alt={c.title} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-slate-900 text-xs truncate">{c.title}</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">{c.budget?.toLocaleString('fr-FR')} F</p>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                            c.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {c.status}
                          </span>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
                          <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-center">
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase">Vues</p>
                            <p className="text-[11px] font-black text-slate-900">{views}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase">Clics</p>
                            <p className="text-[11px] font-black text-emerald-600">{clicks}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase">/ {c.views_purchased}</p>
                            <p className="text-[11px] font-bold text-slate-500">{progress.toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
