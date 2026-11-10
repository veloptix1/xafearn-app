'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // Pas de session → redirection vers login
        router.replace('/login')
        return
      }

      setIsAuth(true)
      setLoading(false)
    }

    checkAuth()

    // Écouter les changements de session (déconnexion, expiration, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router, pathname])

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium text-sm">Vérification de la session...</p>
      </div>
    )
  }

  if (!isAuth) return null

  return <>{children}</>
}
