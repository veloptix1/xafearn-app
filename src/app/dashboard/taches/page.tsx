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
  const [submissions, setSubmissions] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [isTestModeActive, setIsTestModeActive] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  
  const [activeTask, setActiveTask] = useState<any>(null)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      setIsTestModeActive(prof?.is_test_mode === true)

      const { data: t } = await supabase.from('tasks').select('*').eq('status', 'active')
      const { data: c } = await supabase.from('campaigns').select('*').eq('status', 'active').eq('display_type', 'task')
      
      const combined = [
        ...(t || []),
        ...(c || []).map(camp => ({ 
          ...camp, 
          is_campaign_task: true, 
          type: 'diffusion_duration', 
          gain_per_view: camp.custom_gain_per_view, 
          action_url: camp.whatsapp_number, 
          reward: 0 
        }))
      ]
      setTasks(combined)

      const { data: subs } = await supabase.from('task_submissions').select('*').eq('user_id', user.id)
      setSubmissions(subs || [])
      
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message: msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const startTask = (task: any) => {
    if (isTestModeActive) {
      return showToast('Termine d\'abord ton annonce test pour débloquer les tâches.', 'warning')
    }
    setActiveTask(task)
    setScreenshot(null)
    if (task.action_url) {
      window.open(task.action_url, '_system')
    }
  }

  const submitProof = async () => {
    if (!screenshot) return showToast('Veuillez uploader une capture d\'écran.', 'warning')
    if (screenshot.size > 5 * 1024 * 1024) return showToast('Image trop lourde (max 5 Mo).', 'error')
    if (!screenshot.type.startsWith('image/')) return showToast('Le fichier doit être une image.', 'error')

    setUploading(true)
    try {
      const fileName = `task-proof-${profile.id}-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('proof-videos').upload(fileName, screenshot)
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage.from('proof-videos').getPublicUrl(fileName)

      const { error } = await supabase.from('task_submissions').insert({
        task_id: activeTask.id,
        user_id: profile.id,
        status: 'pending',
        proof_screenshot_url: publicUrl
      })

      if (error) throw error

      showToast('Tâche soumise ! En attente de validation.', 'success')
      setSubmissions([...submissions, { task_id: activeTask.id, status: 'pending' }])
      setActiveTask(null)
    } catch (err: any) {
      showToast('Erreur : ' + err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Tâches rémunérées</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        
        {isTestModeActive && (
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl text-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="font-bold text-amber-800 mb-1">Tâches bloquées</h3>
            <p className="text-xs text-amber-700 mb-4 leading-relaxed">Termine d'abord ton annonce test pour débloquer les tâches rémunérées.</p>
            <Link href="/dashboard/annonces" className="inline-block px-5 py-2 bg-amber-500 text-white font-bold text-xs rounded-xl active:scale-95 transition">
              Aller à l'annonce test
            </Link>
          </div>
        )}

        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <div className="relative z-10">
            <h2 className="text-lg font-black mb-1">Gagne plus en un clic</h2>
            <p className="text-sky-100 text-xs leading-relaxed">Accomplis des missions simples et reçois de l'argent après validation.</p>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <p className="text-slate-500 text-xs">Aucune tâche disponible.</p>
          </div>
        ) : (
          tasks.map(task => {
            const submission = submissions.find(s => s.task_id === task.id)
            const isCompleted = submission?.status === 'approved' || submission?.status === 'validated'
            const isPending = submission?.status === 'pending'

            return (
              <div key={task.id} className={`bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden ${isTestModeActive ? 'opacity-50 pointer-events-none' : ''}`}>
                {task.image_url && (
                  <div className="h-32 w-full bg-slate-100">
                    <img src={task.image_url} className="w-full h-full object-cover" alt={task.title} />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900 text-sm flex-1 pr-2">{task.title}</h3>
                    <span className="bg-emerald-50 text-emerald-700 font-black text-xs px-2.5 py-1 rounded-lg border border-emerald-100 whitespace-nowrap flex items-center gap-1">
                      {task.type === 'diffusion_duration' ? `${task.gain_per_view} F/vue` : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                          {task.reward} F
                        </>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">{task.description}</p>

                  {isCompleted ? (
                    <div className="w-full py-3 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-xl text-center border border-emerald-100 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      Tâche accomplie
                    </div>
                  ) : isPending ? (
                    <div className="w-full py-3 bg-amber-50 text-amber-600 font-bold text-xs rounded-xl text-center border border-amber-100 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      En attente de validation
                    </div>
                  ) : (
                    <button onClick={() => startTask(task)} className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl active:scale-95 transition">
                      Faire la tâche
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {activeTask && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-black text-lg text-slate-900">Preuve de réalisation</h2>
              <button onClick={() => setActiveTask(null)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Tâche : <strong className="text-slate-700">{activeTask.title}</strong></p>
            
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4">
              <p className="text-[11px] text-amber-800 leading-relaxed">Fais une capture d'écran qui prouve que tu as bien réalisé la tâche.</p>
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center relative mb-4">
              <input type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              {screenshot ? (
                <div>
                  <p className="text-xs text-emerald-600 font-bold">Capture prête</p>
                  <p className="text-[10px] text-slate-400 mt-1">{Math.round(screenshot.size / 1024)} Ko</p>
                </div>
              ) : (
                <div>
                  <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-xs text-slate-500 font-medium">Ajouter une capture (max 5 Mo)</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setActiveTask(null)} className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button onClick={submitProof} disabled={uploading || !screenshot} className="flex-1 py-3.5 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 transition">
                {uploading ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
