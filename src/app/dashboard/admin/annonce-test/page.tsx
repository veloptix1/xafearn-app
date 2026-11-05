'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'

export default function AdminAnnonceTestPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profile || (profile.role !== 'admin' && !profile.is_admin)) return router.push('/dashboard')
      
      setLoading(false)
    }
    checkAuth()
  }, [])

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement...</div>

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h2 className="text-xl font-black text-slate-900">🎯 Annonce Test</h2>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500">
        Page en construction.
      </div>
    </div>
  )
}
