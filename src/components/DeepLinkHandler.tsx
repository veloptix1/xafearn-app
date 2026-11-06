'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DeepLinkHandler() {
  const router = useRouter()

  useEffect(() => {
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()
    if (!isCapacitor) return

    let listener: any = null

    async function setupListener() {
      try {
        const { App } = await import('@capacitor/app')
        listener = await App.addListener('appUrlOpen', (data: { url: string }) => {
          console.log('Deep link reçu:', data.url)

          if (data.url.includes('checkout')) {
            // L'utilisateur revient du paiement LeekPay
            // On attend 2 secondes que le webhook LeekPay mette à jour Supabase
            setTimeout(() => {
              router.push('/dashboard/reseau')
              // Recharger pour voir les nouveaux jetons
              window.location.reload()
            }, 2000)
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
  }, [router])

  return null
}
