'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { createClient } from '@/lib/supabase/client'
import { PUSH_TOKEN_KEY } from '@/lib/push'

/**
 * Notifications push natives (Firebase Cloud Messaging) pour l'app Android.
 * - demande l'autorisation, récupère le jeton du téléphone et le rattache au compte connecté
 * - affiche un bandeau si une notification arrive pendant que l'app est ouverte
 * - ouvre le bon écran quand on touche une notification
 * Ne fait rien dans un navigateur (le site web a son propre système).
 */
export default function PushNotificationSetup() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let disposed = false
    const handles: PluginListenerHandle[] = []

    const saveToken = async (token: string) => {
      try {
        localStorage.setItem(PUSH_TOKEN_KEY, token)
      } catch {}
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return // enregistré dès la connexion
      await supabase.rpc('register_device_token', { p_token: token, p_platform: Capacitor.getPlatform() })
    }

    const ensureRegistered = async () => {
      try {
        let perm = await PushNotifications.checkPermissions()
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
          perm = await PushNotifications.requestPermissions()
        }
        if (perm.receive !== 'granted') return
        await PushNotifications.register()
      } catch (e) {
        console.warn('Push: enregistrement impossible', e)
      }
    }

    ;(async () => {
      const add = async (p: Promise<PluginListenerHandle>) => {
        const h = await p
        if (disposed) h.remove()
        else handles.push(h)
      }

      await add(PushNotifications.addListener('registration', (t) => void saveToken(t.value)))
      await add(PushNotifications.addListener('registrationError', (e) => console.warn('Push: erreur', e)))
      await add(
        PushNotifications.addListener('pushNotificationReceived', (n) => {
          // App ouverte : Android n'affiche pas de notification système, on montre un bandeau
          window.alert(`🔔 ${n.title ?? ''}${n.body ? '\n' + n.body : ''}`.trim())
        })
      )
      await add(
        PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
          const url = a.notification.data?.url
          if (typeof url === 'string' && url.startsWith('/')) router.push(url)
        })
      )

      await PushNotifications.createChannel({
        id: 'default',
        name: 'Notifications XAFEARN',
        description: 'Messages, gains, retraits et validations',
        importance: 5,
        visibility: 1,
        vibration: true,
      }).catch(() => {})
    })()

    // Enregistre le téléphone à l'ouverture de l'app (déjà connecté) et à chaque connexion
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) void ensureRegistered()
    })

    return () => {
      disposed = true
      sub.subscription.unsubscribe()
      handles.forEach((h) => h.remove())
    }
  }, [supabase, router])

  return null
}
