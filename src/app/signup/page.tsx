'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const VERCEL_URL = 'https://getagriculture.store'

const paysAfrique = [
  { code: 'CM', nom: 'Cameroun', indicatif: '+237' },
  { code: 'CI', nom: "Côte d'Ivoire", indicatif: '+225' },
  { code: 'SN', nom: 'Sénégal', indicatif: '+221' },
  { code: 'BF', nom: 'Burkina Faso', indicatif: '+226' },
  { code: 'ML', nom: 'Mali', indicatif: '+223' },
  { code: 'BJ', nom: 'Bénin', indicatif: '+229' },
  { code: 'TG', nom: 'Togo', indicatif: '+228' },
  { code: 'NE', nom: 'Niger', indicatif: '+227' },
  { code: 'TD', nom: 'Tchad', indicatif: '+235' },
  { code: 'GA', nom: 'Gabon', indicatif: '+241' },
  { code: 'CG', nom: 'Congo', indicatif: '+242' },
  { code: 'CD', nom: 'RD Congo', indicatif: '+243' },
  { code: 'GN', nom: 'Guinée', indicatif: '+224' },
]

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'diffuseur' | 'annonceur'>('diffuseur')
  const [selectedCountry, setSelectedCountry] = useState(paysAfrique[0])
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 🛡️ VALIDATIONS STRICTES
    if (!acceptTerms) return setError('Tu dois accepter les conditions d\'utilisation.')
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return setError('Format d\'email invalide.')
    
    if (password.length < 6) return setError('Le mot de passe doit faire au moins 6 caractères.')
    if (!/[A-Z]/.test(password)) return setError('Ajoute au moins une majuscule dans le mot de passe.')
    if (!/[0-9]/.test(password)) return setError('Ajoute au moins un chiffre dans le mot de passe.')
    
    if (!fullName.trim() || fullName.trim().length < 2) return setError('Nom complet invalide.')
    if (!/^[0-9]{6,15}$/.test(phone.replace(/\s/g, ''))) return setError('Numéro de téléphone invalide.')

    setLoading(true)

    const fullPhone = `${selectedCountry.indicatif}${phone.replace(/\s/g, '')}`

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: fullPhone,
          country: selectedCountry.code,
          role: role,
        }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Envoi de l'email en arrière-plan (API de ton site)
      try {
        fetch(`${VERCEL_URL}/api/send-welcome`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: fullName })
        }).catch(console.error)
      } catch (err) {}
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center bg-white border border-slate-200 p-8 rounded-3xl max-w-md shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <h2 className="text-xl font-black mb-2 text-slate-900">Vérifie tes emails</h2>
          <p className="text-slate-500 text-xs mb-6 leading-relaxed">Un lien de confirmation a été envoyé à <strong className="text-slate-900">{email}</strong>. Clique dessus pour activer ton compte.</p>
          <Link href="/login" className="block w-full py-3.5 bg-sky-500 text-white font-bold rounded-xl active:scale-95 transition">
            Aller à la connexion
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-6">
          <img src="/logo.png" alt="XAFEARN" className="h-10 w-auto object-contain mx-auto" />
        </Link>
        
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
          <h1 className="text-xl font-black text-slate-900 mb-1 text-center">Créer un compte</h1>
          <p className="text-slate-500 text-xs mb-5 text-center">Rejoins XAFEARN et commence à gagner.</p>

          <form onSubmit={handleSignup} className="space-y-3">
            
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button type="button" onClick={() => setRole('diffuseur')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${role === 'diffuseur' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>Diffuseur</button>
              <button type="button" onClick={() => setRole('annonceur')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${role === 'annonceur' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}>Annonceur</button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nom complet</label>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jean Dupont" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Téléphone</label>
              <div className="flex gap-2">
                <select value={selectedCountry.code} onChange={(e) => {
                  const c = paysAfrique.find(p => p.code === e.target.value)
                  if (c) setSelectedCountry(c)
                }} className="w-1/3 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm">
                  {paysAfrique.map(p => <option key={p.code} value={p.code}>{p.indicatif}</option>)}
                </select>
                <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="6 90 00 00 00" className="w-2/3 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Mot de passe</label>
              <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
              <div className="bg-sky-50 border border-sky-100 p-2 rounded-lg mt-2">
                <p className="text-[9px] text-sky-800 font-bold uppercase tracking-wider mb-1">Règles :</p>
                <ul className="text-[9px] text-sky-700 space-y-0.5 list-disc pl-3">
                  <li>6 caractères minimum</li>
                  <li>Au moins 1 majuscule</li>
                  <li>Au moins 1 chiffre</li>
                </ul>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer pt-1">
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-0.5 w-4 h-4 accent-sky-500 rounded" />
              <span className="text-[10px] text-slate-600 leading-relaxed">
                J'accepte les <Link href="/conditions" className="text-sky-500 font-bold">conditions</Link> et la <Link href="/confidentialite" className="text-sky-500 font-bold">confidentialité</Link>.
              </span>
            </label>

            {error && <div className="text-red-500 text-[11px] text-center bg-red-50 p-2.5 rounded-lg font-medium">{error}</div>}

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-sky-500 text-white font-bold rounded-xl active:scale-95 disabled:opacity-50 transition shadow-md">
              {loading ? 'Création...' : "S'inscrire"}
            </button>
          </form>
          
          <p className="text-center text-xs text-slate-500 mt-5">
            Déjà un compte ? <Link href="/login" className="text-sky-500 font-bold">Se connecter</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
