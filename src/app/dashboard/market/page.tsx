'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function MarketPage() {
  const supabase = createClient()
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showToast, setShowToast] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(prof)
      const { data } = await supabase.from('digital_products').select('*, profiles:seller_id(full_name)').eq('is_active', true).eq('is_approved', true).order('created_at', { ascending: false })
      setProducts(data || [])
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const contactSeller = async (method: 'whatsapp' | 'telegram' | 'message') => {
    if (!selectedProduct || !profile) return
    
    try {
      await fetch('/api/market/notify-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: selectedProduct.id, buyer_id: profile.id, contact_method: method })
      })
    } catch {}

    if (method === 'whatsapp' && selectedProduct.contact_whatsapp) {
      window.open(`https://wa.me/${selectedProduct.contact_whatsapp.replace(/\D/g, '')}`, '_blank')
    } else if (method === 'telegram' && selectedProduct.contact_telegram) {
      window.open(selectedProduct.contact_telegram, '_blank')
    } else {
      router.push('/dashboard/messages')
    }
    setSelectedProduct(null)
    setShowToast('Vendeur notifié !')
    setTimeout(() => setShowToast(null), 2500)
  }

  if (loading) return <div className="min-h-dvh flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-dvh bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="font-bold text-slate-900 flex-1">Market</h1>
        <Link href="https://getagriculture.store/dashboard/market" className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">+ Vendre</Link>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-3">
        {products.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500">Aucun produit disponible.</div>
        ) : (
          products.map(p => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {p.preview_image && <img src={p.preview_image} alt="" className="w-full h-40 object-cover" />}
              <div className="p-4">
                <h3 className="font-bold text-slate-900">{p.name}</h3>
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{p.description}</p>
                <div className="flex justify-between items-center">
                  <span className="font-black text-slate-900">{p.price_fcfa.toLocaleString('fr-FR')} F</span>
                  <button onClick={() => setSelectedProduct(p)} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl active:scale-95 transition">
                    Contacter
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Contact */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 mb-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-slate-900 mb-3 text-center">Contacter le vendeur</h2>
            <div className="space-y-2">
              <button onClick={() => contactSeller('whatsapp')} disabled={!selectedProduct.contact_whatsapp} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 transition disabled:opacity-50">WhatsApp</button>
              <button onClick={() => contactSeller('telegram')} disabled={!selectedProduct.contact_telegram} className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl active:scale-95 transition disabled:opacity-50">Telegram</button>
              <button onClick={() => contactSeller('message')} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition">Message interne</button>
              <button onClick={() => setSelectedProduct(null)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-full shadow-xl">
          {showToast}
        </div>
      )}
    </main>
  )
}
