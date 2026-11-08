'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function MarketPage() {
  const supabase = createClient()
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data } = await supabase.from('digital_products').select('*, profiles:seller_id(full_name)').eq('is_active', true).eq('is_approved', true).order('created_at', { ascending: false })
      setProducts(data || [])
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
        <h1 className="font-bold text-slate-900 flex-1">Market</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {products.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500">
            Aucun produit disponible.
          </div>
        ) : (
          products.map(p => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {p.preview_image && <img src={p.preview_image} alt="" className="w-full h-40 object-cover" />}
              <div className="p-4">
                <h3 className="font-bold text-slate-900">{p.name}</h3>
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{p.description}</p>
                <div className="flex justify-between items-center">
                  <span className="font-black text-slate-900">{p.price_fcfa.toLocaleString('fr-FR')} F</span>
                  <a href={`https://wa.me/${p.contact_whatsapp?.replace(/\D/g, '')}`} target="_blank" className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl active:scale-95 transition">
                    Contacter
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
