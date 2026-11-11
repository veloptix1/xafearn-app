import { useEffect, useRef } from 'react'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

/** Exécute `callback` quand l'utilisateur revient dans l'app (fin du paiement dans le navigateur intégré). */
export function useOnReturn(callback: () => void) {
  const ref = useRef(callback)
  useEffect(() => {
    ref.current = callback
  })

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') ref.current()
    }
    document.addEventListener('visibilitychange', onVisible)

    let handle: PluginListenerHandle | null = null
    let disposed = false
    if (Capacitor.isNativePlatform()) {
      Browser.addListener('browserFinished', () => ref.current()).then((h) => {
        if (disposed) h.remove()
        else handle = h
      })
    }
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisible)
      handle?.remove()
    }
  }, [])
}
