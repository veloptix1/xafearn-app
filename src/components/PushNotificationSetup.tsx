'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function PushNotificationSetup() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | undefined>()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id)
    })
  }, [])

  // Hook d'initialisation des notifications (placeholder)
  useEffect(() => {
    if (!userId) return
    // La logique Firebase sera ajoutée plus tard
  }, [userId])

  return null
}
