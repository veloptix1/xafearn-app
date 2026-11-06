'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function AndroidBackHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Vérifie si on est dans un environnement Capacitor (mobile)
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()
    if (!isCapacitor) return

    let listener: any = null

    async function setupListener() {
      try {
        const { App } = await import('@capacitor/app')
        listener = await App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
          // Si on n'est pas sur l'accueil et qu'on peut revenir en arrière
          if (pathname !== '/dashboard' && canGoBack) {
            router.back()
          } else if (pathname === '/dashboard') {
            // Sur l'accueil, on minimise l'app au lieu de la quitter
            App.minimizeApp()
          } else {
            // Sinon on va à l'accueil
            router.push('/dashboard')
          }
        })
      } catch (e) {
        console.log('Capacitor App non disponible')
      }
    }

    setupListener()

    return () => {
      if (listener) listener.remove()
    }
  }, [pathname, router])

  return null
}
