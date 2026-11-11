'use client'

import type { PaymentMethod, PaymentSettings } from '@/lib/payments'
import { rechargeFor } from '@/lib/payments'

type Props = {
  amount: number
  balance: number
  settings: PaymentSettings
  value: PaymentMethod
  onChange: (m: PaymentMethod) => void
}

const fmt = (n: number) => n.toLocaleString('fr-FR')

/** Choix du moyen de paiement : solde, LeekPay, SoleasPay (selon ce que l'admin a activé). */
export default function PaymentMethodPicker({ amount, balance, settings, value, onChange }: Props) {
  const enough = balance >= amount
  const options: { id: PaymentMethod; title: string; sub: string; badge?: string; tone: string }[] = [
    {
      id: 'balance',
      title: 'Mon solde',
      sub: `Disponible : ${fmt(balance)} F`,
      badge: enough ? undefined : 'Insuffisant',
      tone: 'emerald',
    },
  ]
  if (settings.leekEnabled) {
    options.push({
      id: 'leekpay',
      title: 'LeekPay · Mobile Money / carte',
      sub: `Tu paies ${fmt(rechargeFor(amount, balance))} F : ton solde est rechargé, puis tu valides ici`,
      tone: 'sky',
    })
  }
  if (settings.soleasEnabled) {
    options.push({
      id: 'soleaspay',
      title: 'SoleasPay',
      sub: "Paiement via lien · validé par l'équipe après réception",
      tone: 'indigo',
    })
  }

  const ring: Record<string, string> = {
    emerald: 'border-emerald-500 bg-emerald-50',
    sky: 'border-sky-500 bg-sky-50',
    indigo: 'border-indigo-500 bg-indigo-50',
  }

  return (
    <div role="radiogroup" className="space-y-2">
      {options.map((o) => {
        const selected = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.id)}
            className={`w-full text-left p-4 rounded-xl border-2 transition active:scale-[0.99] ${selected ? ring[o.tone] : 'border-slate-200 bg-white'}`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${selected ? 'border-slate-900' : 'border-slate-300'}`}>
                {selected && <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm">{o.title}</p>
                <p className="text-xs text-slate-500 leading-snug">{o.sub}</p>
              </div>
              {o.badge && <span className="text-[10px] font-bold text-red-500 shrink-0">{o.badge}</span>}
            </div>
          </button>
        )
      })}
    </div>
  )
}
