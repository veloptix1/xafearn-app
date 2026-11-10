import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  title: string
  backHref?: string
  onBack?: () => void
  right?: ReactNode
}

const btn =
  'w-10 h-10 shrink-0 text-slate-600 bg-slate-100 rounded-full flex items-center justify-center active:bg-slate-200 transition'

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
  </svg>
)

/** En-tête commun des pages : collant, respecte l'encoche / barre d'état, boutons de 40px. */
export default function PageHeader({ title, backHref = '/dashboard', onBack, right }: Props) {
  return (
    <header
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 pb-3 flex items-center gap-3"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
    >
      {onBack ? (
        <button onClick={onBack} aria-label="Retour" className={btn}>
          <BackIcon />
        </button>
      ) : (
        <Link href={backHref} aria-label="Retour" className={btn}>
          <BackIcon />
        </Link>
      )}
      <h1 className="text-lg font-black text-slate-900 flex-1 truncate">{title}</h1>
      {right}
    </header>
  )
}
