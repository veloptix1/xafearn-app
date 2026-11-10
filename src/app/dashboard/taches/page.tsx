'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/PageHeader'

export default function TasksPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [isTestModeActive, setIsTestModeActive] = useState(false)
  const [canClaimBonus, setCanClaimBonus] = useState(false)
  
  const [activeTask, setActiveTask] = useState<any>(null)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [claimingBonus, setClaimingBonus] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return router.push('/login')

        const { data: prof } = await supabase.from('profiles').select('id, is_premium, is_test_mode, coins_balance').eq('id', user.id).single()
        if (!prof) return
        
        setProfile(prof)
        setIsTestModeActive(prof?.is_test_mode === true)

        // Vérifier le bonus quotidien si Premium
        if (prof?.is_premium) {
          const todayStr = new Date().toISOString().split('T')[0]
          const { data: bonusClaim } = await supabase
            .from('daily_bonus_claims')
            .select('id')
            .eq('user_id', user.id)
            .eq('claim_date', todayStr)
            .maybeSingle()
          
          setCanClaimBonus(!bonusClaim)
        }

        // Charger les tâches
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

        // Charger les soumissions
        const { data: subs } = await supabase
          .from('task_submissions')
          .select('*')
          .eq('user_id', user.id)
        
        setSubmissions(subs || [])
      } catch (err) {
        alert('Erreur de chargement.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router, supabase])

  const claimDailyBonus = async () => {
    if (!profile || !canClaimBonus || claimingBonus) return
    setClaimingBonus(true)
    try {
      // Le serveur vérifie le statut Premium, l'unicité du jour et crédite les jetons
      const { data, error } = await supabase.rpc('claim_daily_bonus')
      if (error) throw error
      if (!data?.success) {
        if (/déjà/i.test(data?.error || '')) setCanClaimBonus(false)
        alert(data?.error || 'Bonus indisponible pour le moment.')
        return
      }
      setProfile({ ...profile, coins_balance: data.new_balance })
      setCanClaimBonus(false)
      alert(`+${data.coins} jetons ajoutés !`)
    } catch {
      alert('Impossible de réclamer le bonus. Réessaie.')
    } finally {
      setClaimingBonus(false)
    }
  }

  const startTask = (task: any) => {
    if (isTestModeActive) {
      return alert('Termine d\'abord ton annonce test.')
    }
    const existingSub = submissions.find(s => s.task_id === task.id)
    if (existingSub) {
      return alert('Tu as déjà soumis une preuve pour cette tâche.')
    }

    setActiveTask(task)
    setScreenshot(null)
    if (task.action_url) {
      window.open(task.action_url, '_blank')
    }
  }

  const submitProof = async () => {
    if (!screenshot) return alert('Veuillez uploader une capture d\'écran.')
    if (!profile || !activeTask) return
    if (!screenshot.type.startsWith('image/')) return alert('Le fichier doit être une image.')
    if (screenshot.size > 8 * 1024 * 1024) return alert('Image trop lourde (8 Mo maximum).')
    const ext = (screenshot.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '')

    setUploading(true)
    try {
      const fileName = `task-proof-${profile.id}-${activeTask.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('proof-videos').upload(fileName, screenshot, { contentType: screenshot.type })
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage.from('proof-videos').getPublicUrl(fileName)

      const { error } = await supabase.from('task_submissions').insert({
        task_id: activeTask.id,
        user_id: profile.id,
        status: 'pending',
        proof_screenshot_url: publicUrl
      })
      
      if (error) {
        if (error.code === '23505') throw new Error('Tu as déjà soumis cette tâche.')
        throw error
      }

      setSubmissions([...submissions, { task_id: activeTask.id, status: 'pending' }])
      alert('Preuve envoyée ! En attente de validation.')
      setActiveTask(null)
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'envoi.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return (
    <div className="min-h-dvh bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <main className="min-h-dvh bg-slate-50 pb-6">
      <PageHeader title="Tâches rémunérées" backHref="/dashboard" />

      <div className="p-4 max-w-md mx-auto space-y-4">
        
        {/* Bonus Quotidien (Premium) */}
        {profile?.is_premium && (
          <div className={`rounded-2xl p-4 shadow-md flex items-center justify-between transition ${canClaimBonus ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}>
            <div>
              <p className="font-bold text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
                Bonus quotidien
              </p>
              <p className={`text-xs mt-1 ${canClaimBonus ? 'text-purple-100' : 'text-slate-500'}`}>
                {canClaimBonus ? 'Tu as 50 jetons à réclamer aujourd\'hui !' : 'Revenu demain pour un nouveau bonus.'}
              </p>
            </div>
            {canClaimBonus ? (
              <button onClick={claimDailyBonus} disabled={claimingBonus} className="bg-white text-purple-600 font-bold text-xs px-4 py-2 rounded-xl shadow-sm active:scale-95 transition disabled:opacity-50">
                {claimingBonus ? '...' : 'Réclamer'}
              </button>
            ) : (
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            )}
          </div>
        )}

        {/* Blocage Mode Test */}
        {isTestModeActive && (
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="font-bold text-amber-800 mb-1">Tâches bloquées</h3>
            <p className="text-sm text-amber-700 mb-4">Termine d'abord ton annonce test pour débloquer les tâches rémunérées.</p>
            <Link href="/dashboard/annonces" className="inline-block px-6 py-2 bg-amber-500 text-white font-bold text-sm rounded-xl shadow-sm">
              Aller à l'annonce test
            </Link>
          </div>
        )}

        {/* Bannière */}
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-3xl p-5 text-white shadow-lg">
          <h2 className="text-lg font-bold mb-1">Gagne plus en un clic</h2>
          <p className="text-sky-100 text-sm">Accomplis des missions simples et reçois de l'argent après validation.</p>
        </div>

        {/* Liste des tâches */}
        {tasks.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center text-slate-500 border border-slate-200">
            <p className="font-medium">Aucune tâche disponible pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => {
              const submission = submissions.find(s => s.task_id === task.id)
              const isCompleted = submission?.status === 'approved'
              const isPending = submission?.status === 'pending'
              const isRejected = submission?.status === 'rejected'
              const isPremiumTask = task.is_premium === true
              const canDoPremium = !isPremiumTask || profile?.is_premium

              return (
                <div key={task.id} className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition ${isTestModeActive || (!canDoPremium && !isCompleted) ? 'opacity-60' : ''} ${isPremiumTask ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'}`}>
                  {task.image_url && (
                    <div className="h-32 w-full bg-slate-100 relative">
                      <img src={task.image_url} alt={task.title} className="w-full h-full object-cover" />
                      {isPremiumTask && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md">
                          Premium
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-900 leading-tight text-sm">{task.title}</h3>
                      <span className="bg-emerald-50 text-emerald-700 font-black text-sm px-3 py-1 rounded-lg border border-emerald-100 shrink-0 ml-2">
                        {task.type === 'diffusion_duration' ? `${task.gain_per_view} F/vue` : `+${task.reward} F`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">{task.description}</p>

                    {isCompleted ? (
                      <div className="w-full py-2.5 bg-emerald-50 text-emerald-600 font-bold text-sm rounded-xl text-center border border-emerald-100 flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        Tâche accomplie
                      </div>
                    ) : isPending ? (
                      <div className="w-full py-2.5 bg-amber-50 text-amber-600 font-bold text-sm rounded-xl text-center border border-amber-100 flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        En attente
                      </div>
                    ) : isRejected ? (
                      <div className="w-full py-2.5 bg-red-50 text-red-600 font-bold text-sm rounded-xl text-center border border-red-100">
                        Preuve rejetée. Réessaie.
                      </div>
                    ) : !canDoPremium ? (
                      <div className="w-full py-2.5 bg-slate-100 text-slate-500 font-bold text-sm rounded-xl text-center border border-slate-200">
                        Réservé aux membres Premium
                      </div>
                    ) : (
                      <button onClick={() => startTask(task)} disabled={isTestModeActive} className="w-full py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl active:scale-[0.98] transition">
                        Faire la tâche
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de preuve */}
      {activeTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6">
            <h2 className="font-bold text-lg mb-2 text-slate-900">Preuve de réalisation</h2>
            <p className="text-sm text-slate-500 mb-4">Tâche : <strong className="text-slate-800">{activeTask.title}</strong></p>
            
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4">
              <p className="text-xs text-amber-800 leading-relaxed">Fais une capture d'écran qui prouve que tu as bien réalisé la tâche et upload-la ici.</p>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 mb-4 transition"
            />

            <div className="flex gap-2">
              <button onClick={() => setActiveTask(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl">Annuler</button>
              <button onClick={submitProof} disabled={uploading || !screenshot} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50">
                {uploading ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
