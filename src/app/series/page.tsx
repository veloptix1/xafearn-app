'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = ['Tout', 'Romance', 'Action', 'Thriller', 'Fantastique', 'Science-Fiction', 'Drame', 'Comédie', 'Horreur', 'Aventure']

export default function AllSeriesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [series, setSeries] = useState<any[]>([])
  const [filteredSeries, setFilteredSeries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Tout')

  useEffect(() => {
    loadSeries()
  }, [])

  useEffect(() => {
    let result = series
    if (activeCategory !== 'Tout') result = result.filter(s => s.category === activeCategory)
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase()
      result = result.filter(s => 
        s.title.toLowerCase().includes(lowerQuery) || 
        (s.description && s.description.toLowerCase().includes(lowerQuery))
      )
    }
    setFilteredSeries(result)
  }, [searchQuery, series, activeCategory])

  async function loadSeries() {
    const { data } = await supabase
      .from('series')
      .select('*, profiles(full_name)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
    
    setSeries(data || [])
    setFilteredSeries(data || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      
      {/* HEADER */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard/reseau" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900 flex-1">Bibliothèque</h1>
        <div className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-xl border border-purple-100 flex items-center gap-1.5 text-xs font-bold">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          {series.length}
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        
        {/* BARRE DE RECHERCHE */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input 
            type="text" 
            placeholder="Rechercher une série, un auteur..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
          />
        </div>

        {/* FILTRES CATÉGORIES */}
        <div className="flex overflow-x-auto gap-2 pb-4 mb-2 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition ${
                activeCategory === cat 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-white text-slate-600 border border-slate-200 active:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* LISTE DES SÉRIES */}
        {filteredSeries.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm mt-4">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Aucun résultat</h2>
            <p className="text-slate-500 text-xs">Aucune série ne correspond à ta recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredSeries.map((s: any) => (
              <Link key={s.id} href={`/series/${s.id}`} className="group flex flex-col">
                <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden bg-slate-200 mb-2 relative shadow-sm">
                  {s.cover_url ? (
                    <img src={s.cover_url} alt={s.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-400">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                    {s.category || s.content_type}
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2 mb-1">{s.title}</h3>
                <p className="text-[10px] text-slate-500 line-clamp-1">Par {s.profiles?.full_name || 'Anonyme'}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
