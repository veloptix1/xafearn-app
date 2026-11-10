'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 🛡️ VALIDATIONS
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return setError('Format d\'email invalide.')
    if (password.length < 6) return setError('Mot de passe trop court.')

    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({ 
      email: email.trim().toLowerCase(), 
      password 
    })
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect.')
      } else if (error.message.includes('Email not confirmed')) {
        setError('Confirme ton email avant de te connecter.')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }
    
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-6">
          <img src="/logo.png" alt="XAFEARN" className="h-10 w-auto object-contain mx-auto" />
        </Link>
        
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
          <h1 className="text-xl font-black text-slate-900 mb-1 text-center">Bon retour</h1>
          <p className="text-slate-500 text-xs mb-5 text-center">Connecte-toi à ton compte XAFEARN.</p>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Mot de passe</label>
                <Link href="/forgot-password" className="text-[10px] text-sky-500 font-bold">Oublié ?</Link>
              </div>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
            </div>

            {error && <div className="text-red-500 text-[11px] text-center bg-red-50 p-2.5 rounded-lg font-medium">{error}</div>}

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-sky-500 text-white font-bold rounded-xl active:scale-95 disabled:opacity-50 transition shadow-md mt-2">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          
          <p className="text-center text-xs text-slate-500 mt-5">
            Pas encore de compte ? <Link href="/signup" className="text-sky-500 font-bold">S'inscrire</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
