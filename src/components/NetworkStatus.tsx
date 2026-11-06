'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function NetworkStatus() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Pages publiques où on ne fait pas la redirection
    const publicPages = ['/', '/login', '/signup', '/offline', '/onboarding']
    const isPublicPage = publicPages.includes(pathname)

    const handleOffline = () => {
      if (!isPublicPage) {
        router.push('/offline')
      }
    }

    const handleOnline = () => {
      if (pathname === '/offline') {
        router.push('/dashboard')
      }
    }

    // Vérifier au chargement
    if (!navigator.onLine && !isPublicPage) {
      router.push('/offline')
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [pathname, router])

  return null
}
