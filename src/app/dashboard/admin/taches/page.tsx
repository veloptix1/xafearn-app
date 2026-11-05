'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TaskAdminSection } from '../EmailComponents'

export default function AdminTasksPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profile || (profile.role !== 'admin' && !profile.is_admin)) return router.push('/dashboard')

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement...</div>

  return (
    <div>
      <h2 className="text-xl font-black text-slate-900 mb-4">🎮 Tâches</h2>
      <TaskAdminSection />
    </div>
  )
}
