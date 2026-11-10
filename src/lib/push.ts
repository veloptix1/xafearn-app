import type { SupabaseClient } from '@supabase/supabase-js'

export const PUSH_TOKEN_KEY = 'xafearn_push_token'

/** À appeler à la déconnexion : le téléphone ne reçoit plus les notifications de l'ancien compte. */
export async function unregisterPush(supabase: SupabaseClient) {
  try {
    const token = localStorage.getItem(PUSH_TOKEN_KEY)
    if (!token) return
    await supabase.rpc('unregister_device_token', { p_token: token })
    localStorage.removeItem(PUSH_TOKEN_KEY)
  } catch {
    // Sans conséquence : le jeton sera supprimé côté serveur s'il devient invalide.
  }
}
