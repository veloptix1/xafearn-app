'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function PartnerPage() {
  const supabase = createClient()
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data } = await supabase.from('api_keys').select('*').eq('partner_id', session.user.id).order('created_at', { ascending: false })
      setApiKeys(data || [])
      setLoading(false)
    }
    load()
  }, [supabase, router])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement...</div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Portail Développeur</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="bg-indigo-500 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-xs font-bold text-indigo-100 uppercase mb-1">Crédits API</p>
          <p className="text-3xl font-black mb-4">{apiKeys[0]?.credits || 0}</p>
          <p className="text-xs text-indigo-100">Connecte tes applications à Xafearn.</p>
        </div>

        {apiKeys.length > 0 ? (
          apiKeys.map(key => (
            <div key={key.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-900">{key.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${key.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {key.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono truncate">{key.api_key}</p>
            </div>
          ))
        ) : (
          <div className="bg-white p-6 text-center rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-sm mb-4">Tu n'as pas encore de clé API.</p>
            <a href="https://getagriculture.store/dashboard/partenaire" target="_blank" className="inline-block px-4 py-2 bg-indigo-500 text-white font-bold rounded-xl text-sm">
              Créer une clé sur le site web
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
