'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const MENU = [
  { label: 'Vue d\'ensemble', href: '/dashboard/partenaire' },
  { label: 'Documentation', href: '/dashboard/partenaire/docs' },
  { label: 'Playground', href: '/dashboard/partenaire/playground' },
  { label: 'Webhooks', href: '/dashboard/partenaire/webhooks' },
  { label: 'Logs', href: '/dashboard/partenaire/logs' },
]

export default function PartnerPage() {
  const supabase = createClient()
  const router = useRouter()
  const [keys, setKeys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data } = await supabase.from('api_keys').select('*').eq('partner_id', session.user.id).order('created_at', { ascending: false })
      setKeys(data || [])
      setLoading(false)
    }
    load()
  }, [supabase, router])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="font-bold text-slate-900">Portail API</h1>
        </div>
        <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center active:bg-slate-200">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
        </button>
      </header>

      {showMenu && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60" onClick={() => setShowMenu(false)}>
          <div className="absolute top-20 right-4 bg-white rounded-2xl shadow-xl w-56 overflow-hidden" onClick={e => e.stopPropagation()}>
            {MENU.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setShowMenu(false)} className="block px-4 py-3 text-sm font-bold text-slate-700 border-b border-slate-100 active:bg-slate-50">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="bg-indigo-500 rounded-3xl p-6 text-white shadow-lg">
          <p className="text-xs font-bold text-indigo-100 uppercase mb-1">Crédits API</p>
          <p className="text-3xl font-black mb-3">{keys[0]?.credits || 0}</p>
          <Link href="https://getagriculture.store/dashboard/partenaire" className="inline-block px-4 py-2 bg-white text-indigo-600 font-bold text-xs rounded-xl">
            Gérer sur le web
          </Link>
        </div>

        {keys.length === 0 ? (
          <div className="bg-white p-6 text-center rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-sm mb-3">Aucune clé API.</p>
            <Link href="https://getagriculture.store/dashboard/partenaire" className="inline-block px-4 py-2 bg-indigo-500 text-white font-bold rounded-xl text-xs">Créer ma clé</Link>
          </div>
        ) : (
          keys.map(k => (
            <div key={k.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between mb-2">
                <h3 className="font-bold text-slate-900 text-sm">{k.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${k.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {k.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 truncate">{k.api_key}</p>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
