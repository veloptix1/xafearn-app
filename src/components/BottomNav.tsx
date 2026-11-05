'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/dashboard', icon: '🏠', label: 'Accueil' },
    { href: '/dashboard/reseau', icon: '🌐', label: 'Réseau' },
    { href: '/series', icon: '📚', label: 'Séries' },
    { href: '/dashboard/taches', icon: '✅', label: 'Tâches' },
    { href: '/dashboard/profil', icon: '👤', label: 'Profil' },
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-between items-center z-50 md:hidden shadow-lg">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link 
            key={item.href} 
            href={item.href} 
            className={`flex flex-col items-center gap-1 flex-1 py-1 transition ${isActive ? 'text-sky-500' : 'text-slate-400'}`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
