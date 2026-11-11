import { createClient } from '@/lib/supabase/client'
import { SITE_URL } from '@/lib/config'

/**
 * Appelle une route du site depuis l'app. L'app n'a pas de cookies de session : on joint le jeton de
 * connexion Supabase (en-tête Authorization), que le serveur vérifie.
 */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`)

  return fetch(`${SITE_URL}${path}`, { ...init, headers })
}
