'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminUserRow } from '../EmailComponents'

export default function AdminUsersPage() {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profile || (profile.role !== 'admin' && !profile.is_admin)) return router.push('/dashboard')

      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-center py-20 text-slate-500">Chargement...</div>

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-slate-900">👥 Utilisateurs ({users.length})</h2>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Solde</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u: any) => <AdminUserRow key={u.id} user={u} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
