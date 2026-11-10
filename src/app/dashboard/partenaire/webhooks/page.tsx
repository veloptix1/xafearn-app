'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const EVENTS = [
  { id: 'task.completed', label: 'Tâche validée' },
  { id: 'task.rejected', label: 'Tâche rejetée' },
  { id: 'payment.success', label: 'Paiement réussi' },
  { id: 'series.unlocked', label: 'Épisode débloqué' },
]

export default function WebhooksPage() {
  const supabase = createClient()
  const router = useRouter()
  const [apiKey, setApiKey] = useState<any>(null)
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [listenAll, setListenAll] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/login')
      const { data: keys } = await supabase.from('api_keys').select('*').eq('partner_id', session.user.id).limit(1)
      if (keys && keys[0]) {
        setApiKey(keys[0])
        const { data: hooks } = await supabase.from('api_webhooks').select('*').eq('api_key_id', keys[0].id).order('created_at', { ascending: false })
        setWebhooks(hooks || [])
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const showMsg = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const addWebhook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.startsWith('http')) return showMsg('URL invalide')
    if (!listenAll && selectedEvents.length === 0) return showMsg('Sélectionne un événement')

    const { data, error } = await supabase.from('api_webhooks').insert({
      api_key_id: apiKey.id, url, events: selectedEvents, listen_all: listenAll, is_active: true
    }).select().single()

    if (error) return showMsg('Erreur: ' + error.message)
    setWebhooks([data, ...webhooks])
    setShowForm(false); setUrl(''); setSelectedEvents([]); setListenAll(false)
    showMsg('Webhook ajouté !')
  }

  const toggleEvent = (id: string) => {
    setSelectedEvents(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm('Supprimer ce webhook ?')) return
    await supabase.from('api_webhooks').delete().eq('id', id)
    setWebhooks(webhooks.filter(w => w.id !== id))
    showMsg('Webhook supprimé')
  }

  const testWebhook = async (hook: any) => {
    showMsg('Test en cours...')
    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test.ping', timestamp: new Date().toISOString() })
      })
      showMsg(res.ok ? 'Webhook OK (200)' : `Code ${res.status}`)
    } catch { showMsg('Erreur de connexion') }
  }

  if (loading) return <div className="min-h-dvh flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div></div>

  return (
    <main className="min-h-dvh bg-slate-50 pb-24">
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/partenaire" className="text-slate-500 bg-slate-100 p-2 rounded-full active:bg-slate-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="font-bold text-slate-900">Webhooks</h1>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="px-3 py-2 bg-sky-500 text-white text-xs font-bold rounded-xl active:scale-95 transition">+ Ajouter</button>
        )}
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {showForm && (
          <form onSubmit={addWebhook} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
            <h2 className="font-bold text-slate-900">Nouveau Webhook</h2>
            <input type="url" required placeholder="https://monsite.com/webhook" value={url} onChange={e => setUrl(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
            <label className="flex items-center gap-2 p-3 bg-sky-50 rounded-xl">
              <input type="checkbox" checked={listenAll} onChange={e => setListenAll(e.target.checked)} className="w-4 h-4 accent-sky-500" />
              <span className="text-xs font-bold text-sky-700">Écouter TOUS les événements</span>
            </label>
            {!listenAll && (
              <div className="space-y-2">
                {EVENTS.map(ev => (
                  <label key={ev.id} className="flex items-center gap-2 p-2 border border-slate-200 rounded-xl">
                    <input type="checkbox" checked={selectedEvents.includes(ev.id)} onChange={() => toggleEvent(ev.id)} className="w-4 h-4 accent-sky-500" />
                    <span className="text-xs text-slate-700">{ev.label}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button type="submit" className="flex-1 py-3 bg-sky-500 text-white font-bold rounded-xl">Enregistrer</button>
            </div>
          </form>
        )}

        {webhooks.length === 0 && !showForm ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <p className="text-slate-500 text-sm mb-3">Aucun webhook configuré.</p>
            <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-sky-500 text-white font-bold rounded-xl text-sm">Ajouter un webhook</button>
          </div>
        ) : (
          webhooks.map(h => (
            <div key={h.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-slate-900 text-xs truncate flex-1 mr-2">{h.url}</p>
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${h.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{h.is_active ? 'Actif' : 'Off'}</span>
              </div>
              <div className="mb-3">
                {h.listen_all ? (
                  <span className="text-[10px] font-bold bg-sky-100 text-sky-700 px-2 py-1 rounded">Tous les événements</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {h.events?.map((id: string) => (
                      <span key={id} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">{id}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => testWebhook(h)} className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg active:bg-slate-200">Tester</button>
                <button onClick={() => deleteWebhook(h.id)} className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg">Suppr.</button>
              </div>
            </div>
          ))
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 bg-slate-900 text-white text-sm font-bold rounded-full shadow-xl">{toast}</div>
      )}
    </main>
  )
}
