import type { SupabaseClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { apiFetch } from '@/lib/api'

export type PaymentMethod = 'balance' | 'leekpay' | 'soleaspay'

export type PaymentSettings = {
  leekEnabled: boolean
  soleasEnabled: boolean
  soleasLink: string
  activationPrice: number
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  leekEnabled: true,
  soleasEnabled: false,
  soleasLink: '',
  activationPrice: 2000,
}

/** Réglages choisis par l'admin (page Admin > Paiements). Lus via une fonction qui n'expose que ces 5 valeurs. */
export async function loadPaymentSettings(supabase: SupabaseClient): Promise<PaymentSettings> {
  try {
    const { data, error } = await supabase.rpc('get_payment_settings')
    if (error || !data) return DEFAULT_PAYMENT_SETTINGS
    const externalAllowed = data.provider !== 'disabled'
    const link = String(data.soleaspay_link || '')
    return {
      leekEnabled: externalAllowed && !!data.leekpay_enabled,
      soleasEnabled: externalAllowed && !!data.soleaspay_enabled && /^https:\/\//i.test(link),
      soleasLink: link,
      activationPrice: Number(data.activation_price) || DEFAULT_PAYMENT_SETTINGS.activationPrice,
    }
  } catch {
    return DEFAULT_PAYMENT_SETTINGS
  }
}

/** Montant à payer sur LeekPay pour pouvoir régler `amount` avec le solde (le paiement recharge le solde). */
export const rechargeFor = (amount: number, balance: number) =>
  balance >= amount ? Math.ceil(amount) : Math.max(100, Math.ceil(amount - balance))

/** Crée le paiement LeekPay (recharge du solde) côté serveur et renvoie l'adresse de paiement. */
export async function startLeekPay(amount: number, description: string): Promise<string> {
  const res = await apiFetch('/api/leekpay/create', {
    method: 'POST',
    body: JSON.stringify({ amount: Math.round(amount), description }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.payment_url) throw new Error(data.error || 'Paiement indisponible pour le moment')
  return data.payment_url as string
}

/** Ouvre un lien de paiement dans le navigateur intégré (https uniquement). */
export async function openExternal(url: string) {
  if (!/^https:\/\//i.test(url)) throw new Error('Lien de paiement invalide')
  if (Capacitor.isNativePlatform()) await Browser.open({ url })
  else window.open(url, '_blank', 'noopener')
}
