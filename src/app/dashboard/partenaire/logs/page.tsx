'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LogsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data: keys } = await supabase.from('api_keys').select('id').eq('partner_id', session.user.id).limit(1)
      if (keys && keys[0]) {
        const { data } = await supabase.from('api_logs').select('*').eq('api_key_id', keys[0].id).order('created_at', { ascending: false }).limit(100)
        setLogs(data || [])
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const filtered = logs.filter(l => {
    if (filter === 'all') return true
    if (filter === 'success') return l.status_code === 200
    if (filter === 'error') return l.status_code !== 200
    return true
  })

  if (loading) return <div className="min-h-dvh flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-dvh bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard/partenaire" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Logs API</h1>
      </header>

      <div className="p-4 max-w-md mx-auto">
        <div className="flex gap-2 mb-4">
          {['all', 'success', 'error'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-xs font-bold ${filter === f ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {f === 'all' ? 'Tous' : f === 'success' ? 'Succès' : 'Erreurs'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <p className="text-slate-500 text-sm">Aucun log disponible.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {filtered.map(log => (
              <div key={log.id} className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-mono text-xs font-bold text-slate-900 truncate">{log.endpoint}</p>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${log.status_code === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{log.status_code}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                  <span>{new Date(log.created_at).toLocaleString('fr-FR')}</span>
                  <span className="font-bold text-indigo-600">-{log.cost} crédit(s)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
