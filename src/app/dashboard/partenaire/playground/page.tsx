'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function PlaygroundPage() {
  const supabase = createClient()
  const router = useRouter()
  const [key, setKey] = useState<string | null>(null)
  const [endpoint, setEndpoint] = useState('/tasks')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data } = await supabase.from('api_keys').select('api_key').eq('partner_id', session.user.id).limit(1)
      if (data && data[0]) setKey(data[0].api_key)
    }
    load()
  }, [supabase, router])

  const test = async () => {
    if (!key) return
    setLoading(true)
    setResponse(null)
    try {
      const res = await fetch(`https://getagriculture.store/api/v1${endpoint}?api_key=${key}`)
      const text = await res.text()
      try { setResponse({ status: res.status, data: JSON.parse(text) }) }
      catch { setResponse({ status: res.status, data: { error: 'Réponse non-JSON' } }) }
    } catch (err: any) {
      setResponse({ status: 500, data: { error: err.message } })
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard/partenaire" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Playground</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Endpoint</label>
          <select value={endpoint} onChange={e => setEndpoint(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3">
            <option value="/tasks">GET /tasks</option>
            <option value="/series">GET /series</option>
            <option value="/wallet">GET /wallet</option>
            <option value="/analytics">GET /analytics</option>
          </select>
          <button onClick={test} disabled={!key || loading} className="w-full py-3 bg-indigo-500 text-white font-bold rounded-xl active:scale-95 transition disabled:opacity-50">
            {loading ? 'Test en cours...' : 'Tester l\'API'}
          </button>
        </div>

        {response && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex justify-between mb-3">
              <h3 className="font-bold text-slate-900">Réponse</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded ${response.status === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {response.status}
              </span>
            </div>
            <pre className="bg-slate-900 text-emerald-400 text-xs p-3 rounded-xl overflow-x-auto max-h-64">
              {JSON.stringify(response.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  )
}
