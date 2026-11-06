'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function TasksPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  const [userTasks, setUserTasks] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  const [activeTask, setActiveTask] = useState<any>(null)
  const [proofText, setProofText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    const { data: t } = await supabase.from('tasks').select('*').eq('status', 'active').order('created_at', { ascending: false })
    setTasks(t || [])

    const { data: ut } = await supabase.from('task_submissions').select('*').eq('user_id', user.id)
    setUserTasks(ut || [])

    setLoading(false)
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!proofText.trim()) return showToast('Entre ta preuve (lien ou texte).', 'error')
    
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('task_submissions').insert({
        task_id: activeTask.id,
        user_id: profile.id,
        proof_text: proofText,
        status: 'pending'
      })
      if (error) throw error

      await supabase.from('notifications').insert({
        user_id: profile.id,
        title: 'Preuve envoyée ⏳',
        message: `Ta preuve pour la tâche "${activeTask.title}" est en attente de validation.`,
        link: '/dashboard/taches'
      })

      showToast('Preuve envoyée avec succès !', 'success')
      setActiveTask(null)
      setProofText('')
      load()
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement des tâches...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* HEADER MOBILE */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-lg font-black text-slate-900">Tâches</h1>
        </div>
        <div className="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl border border-amber-100 flex items-center gap-1.5 text-xs font-bold">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
          {profile?.coins_balance || 0}
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <h2 className="font-black text-lg relative z-10 mb-1">Gagne des jetons gratuits</h2>
          <p className="text-sky-100 text-xs relative z-10 leading-relaxed">Accomplis des tâches simples et reçois des jetons immédiatement après validation.</p>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center mt-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <p className="text-slate-500 text-sm">Aucune tâche disponible pour le moment.</p>
          </div>
        ) : (
          tasks.map(task => {
            const submission = userTasks.find(ut => ut.task_id === task.id)
            const isPending = submission?.status === 'pending'
            const isValidated = submission?.status === 'validated'
            const isRejected = submission?.status === 'rejected'

            return (
              <div key={task.id} className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                    +{task.reward}
                  </div>
                </div>
                
                <h3 className="font-bold text-slate-900 mb-1">{task.title}</h3>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed flex-1">{task.description}</p>
                
                {isValidated ? (
                  <div className="w-full py-3 bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-sm rounded-xl flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    Validée
                  </div>
                ) : isPending ? (
                  <div className="w-full py-3 bg-amber-50 text-amber-600 border border-amber-100 font-bold text-sm rounded-xl flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    En attente
                  </div>
                ) : (
                  <button onClick={() => setActiveTask(task)} className={`w-full py-3.5 text-white font-bold text-sm rounded-xl transition shadow-md active:scale-95 ${isRejected ? 'bg-red-500' : 'bg-sky-500'}`}>
                    {isRejected ? 'Réessayer' : 'Commencer la tâche'}
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* MODAL DE SOUMISSION DE PREUVE */}
      {activeTask && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-lg">Preuve de la tâche</h2>
              <button onClick={() => setActiveTask(null)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl mb-4">
              <p className="text-sm font-bold text-sky-800 mb-1">{activeTask.title}</p>
              <p className="text-xs text-sky-700 leading-relaxed">{activeTask.description}</p>
            </div>

            <form onSubmit={handleSubmitProof} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ta preuve (lien, pseudo, capture texte...)</label>
                <textarea 
                  required 
                  value={proofText}
                  onChange={e => setProofText(e.target.value)}
                  rows={4}
                  placeholder="Colle le lien de ton abonnement, ton pseudo, etc..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:border-sky-400 outline-none"
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 transition disabled:opacity-50">
                {isSubmitting ? 'Envoi...' : 'Soumettre ma preuve'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
