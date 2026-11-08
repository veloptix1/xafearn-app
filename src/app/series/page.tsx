'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SeriesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [series, setSeries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data } = await supabase.from('series').select('*, profiles(full_name)').eq('is_published', true).order('created_at', { ascending: false })
      setSeries(data || [])
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const filtered = series.filter(s => {
    if (!search.trim()) return true
    return s.title?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase())
  })

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Séries</h1>
      </header>

      <div className="p-4 max-w-md mx-auto">
        <input
          type="text"
          placeholder="Rechercher une série..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 mb-4 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-sky-500"
        />

        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">Aucune série disponible.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => (
              <Link key={s.id} href={`/series/${s.id}`} className="block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm active:bg-slate-50 transition">
                {s.cover_url && <img src={s.cover_url} alt="" className="w-full h-40 object-cover" />}
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 text-sm">{s.title}</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{s.category || s.content_type}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
