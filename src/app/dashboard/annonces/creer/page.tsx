'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PaymentMethodPicker from '@/components/PaymentMethodPicker'
import { useOnReturn } from '@/lib/useOnReturn'
import { DEFAULT_PAYMENT_SETTINGS, loadPaymentSettings, openExternal, rechargeFor, startLeekPay, type PaymentMethod, type PaymentSettings } from '@/lib/payments'

const paysAfrique = [
  { code: '', nom: 'Tous les pays (Mondial)' },
  { code: 'CM', nom: 'Cameroun' }, { code: 'CI', nom: "Côte d'Ivoire" }, { code: 'SN', nom: 'Sénégal' },
  { code: 'GA', nom: 'Gabon' }, { code: 'CG', nom: 'Congo' }, { code: 'CD', nom: 'RD Congo' },
  { code: 'BJ', nom: 'Bénin' }, { code: 'BF', nom: 'Burkina Faso' }, { code: 'ML', nom: 'Mali' },
  { code: 'TG', nom: 'Togo' }, { code: 'NE', nom: 'Niger' }, { code: 'TD', nom: 'Tchad' },
]

// 🚀 L'URL DE TON SITE VERCEL (pour appeler les API routes)

export default function CreerAnnoncePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)

  // Formulaire
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [sector, setSector] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [views, setViews] = useState('1000')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isFlash, setIsFlash] = useState(false)

  // Paiement
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('balance')
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS)
  const [paying, setPaying] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const duration = 7
  const budget = Math.round((parseInt(views) || 0) * 1.92 * 100) / 100 // même calcul que le serveur

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setWhatsapp(data?.whatsapp || '')
      setCountry(data?.country || 'CM')
      setSettings(await loadPaymentSettings(supabase))
      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('campaign-images').upload(fileName, file)
    if (uploadError) {
      setError('Erreur upload image.')
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('campaign-images').getPublicUrl(fileName)
    setImageUrl(publicUrl)
    setUploading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptTerms) return setError('Tu dois accepter les conditions.')
    if (!imageUrl) return setError('Veuillez ajouter une image.')
    if (parseInt(views) < 300) return setError('Le nombre de vues minimum est de 300.')
    setShowPaymentModal(true)
  }

  const refreshProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
  }, [supabase])

  // Au retour du navigateur de paiement, le solde est rechargé automatiquement
  useOnReturn(refreshProfile)

  const processPayment = async () => {
    setError(null)
    setInfo(null)
    setPaying(true)
    const balance = profile?.balance || 0
    try {
      if (paymentMethod === 'balance') {
        if (balance < budget) throw new Error('Solde insuffisant. Recharge-le avec LeekPay ou SoleasPay.')
        // Prix et solde sont recalculés et vérifiés par la base de données
        const { data, error: rpcError } = await supabase.rpc('create_campaign', {
          p_title: title.trim(), p_description: description.trim(), p_image_url: imageUrl,
          p_price: parseFloat(price) || 0, p_sector: sector, p_country: country, p_city: city,
          p_neighborhood: neighborhood, p_whatsapp: whatsapp.replace(/\s/g, ''),
          p_views: parseInt(views), p_is_flash: isFlash,
        })
        if (rpcError || !data?.success) throw new Error(data?.error || 'Création de la campagne impossible.')
        router.push('/dashboard/annonces')
        return
      }
      if (paymentMethod === 'leekpay') {
        const url = await startLeekPay(rechargeFor(budget, balance), `Recharge campagne : ${title}`.slice(0, 100))
        await openExternal(url)
        setInfo('Termine le paiement puis reviens ici : ton solde se met à jour tout seul. Choisis ensuite « Mon solde » pour lancer ta campagne.')
        return
      }
      await openExternal(settings.soleasLink)
      setInfo("Ton paiement SoleasPay sera validé par l'équipe après réception. Tu pourras ensuite lancer ta campagne avec ton solde.")
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Paiement impossible.')
    } finally {
      setPaying(false)
    }
  }

  if (loading && !showPaymentModal) return (
    <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium text-sm">Chargement...</p>
    </div>
  )

  return (
    <main className="min-h-dvh bg-slate-50 pb-24">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-5 py-4 sticky top-0 z-50 flex items-center gap-3">
        <Link href="/dashboard/annonces" className="text-slate-500 hover:text-slate-900 bg-slate-100 p-2 rounded-full active:bg-slate-200 transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-lg font-black text-slate-900">Créer une campagne</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto mt-2">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-bold mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SECTION 1 : CONTENU */}
          <section className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
            <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-[10px]">1</span>
              Contenu
            </h2>
            <div className="space-y-3">
              <input type="text" required placeholder="Titre de l'annonce" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
              <textarea required rows={3} placeholder="Description détaillée..." value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 resize-none text-sm" />
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center relative">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {imageUrl ? (
                  <img src={imageUrl} alt="Aperçu" className="max-h-40 mx-auto rounded-lg object-contain" />
                ) : (
                  <div className="py-2">
                    <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p className="text-xs text-slate-500 font-medium">{uploading ? 'Envoi...' : 'Ajouter une image'}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 2 : DÉTAILS */}
          <section className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
            <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-[10px]">2</span>
              Détails
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" placeholder="Prix (FCFA)" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
              <select required value={sector} onChange={e => setSector(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm">
                <option value="" disabled>Secteur</option>
                <option value="commerce">Commerce</option>
                <option value="restauration">Restauration</option>
                <option value="mode">Mode</option>
                <option value="tech">Tech</option>
                <option value="sante">Santé</option>
              </select>
              <div className="col-span-2">
                <input type="tel" required placeholder="Numéro WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
              </div>
            </div>
          </section>

          {/* SECTION 3 : CIBLAGE */}
          <section className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
            <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-[10px]">3</span>
              Ciblage
            </h2>
            <div className="space-y-3">
              <select value={country} onChange={e => setCountry(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm">
                {paysAfrique.map(p => <option key={p.code} value={p.code}>{p.nom}</option>)}
              </select>
              <input type="text" placeholder="Ville (optionnel)" value={city} onChange={e => setCity(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
              <input type="text" placeholder="Quartier (optionnel)" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 text-sm" />
            </div>
          </section>

          {/* SECTION 4 : BUDGET */}
          <section className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
            <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-[10px]">4</span>
              Paramètres
            </h2>
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vues souhaitées (min. 300)</label>
              <input type="number" min="300" required value={views} onChange={e => setViews(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-sky-500 outline-none text-slate-900 font-bold text-sm" />
            </div>

            <label className="flex items-start gap-3 cursor-pointer p-3 border border-rose-200 bg-rose-50 rounded-xl mb-3">
              <input type="checkbox" checked={isFlash} onChange={e => setIsFlash(e.target.checked)} className="mt-0.5 w-4 h-4 accent-rose-500 rounded" />
              <div>
                <p className="text-xs font-bold text-rose-700 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Mode Flash
                </p>
                <p className="text-[10px] text-rose-600 mt-0.5">Expire dans 2 heures.</p>
              </div>
            </label>

            <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-sky-700 font-bold uppercase tracking-wider">Budget total</p>
                <p className="text-[10px] text-slate-500">1,92 F / vue</p>
              </div>
              <p className="text-xl font-black text-sky-600">{budget.toLocaleString('fr-FR')} F</p>
            </div>

            <div className="mt-3 text-[10px] text-slate-500 flex justify-between">
              <span>Ton solde :</span>
              <span className="font-bold text-slate-700">{(profile?.balance || 0).toLocaleString('fr-FR')} F</span>
            </div>
          </section>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} className="mt-0.5 w-5 h-5 accent-sky-500 rounded border-slate-300" />
              <span className="text-xs text-slate-600 leading-relaxed">
                J'accepte les <Link href="/conditions" className="text-sky-500 font-bold">conditions</Link>.
              </span>
            </label>
          </div>

          <button type="submit" disabled={uploading} className="w-full py-4 bg-sky-500 text-white font-bold rounded-2xl active:scale-95 disabled:opacity-50 transition shadow-lg shadow-sky-500/30">
            Passer au paiement
          </button>
        </form>
      </div>

      {/* MODAL DE PAIEMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4" onClick={() => !paying && setShowPaymentModal(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90dvh] overflow-y-auto" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black text-slate-900 mb-1">Paiement</h2>
            <p className="text-sm text-slate-500 mb-5">Montant : <strong className="text-slate-900">{budget.toLocaleString('fr-FR')} FCFA</strong></p>

            <div className="mb-5">
              <PaymentMethodPicker amount={budget} balance={profile?.balance || 0} settings={settings} value={paymentMethod} onChange={setPaymentMethod} />
            </div>

            {info && <div className="bg-sky-50 border border-sky-200 text-sky-800 text-xs rounded-2xl p-4 mb-4 leading-relaxed">{info}</div>}
            {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl p-4 mb-4">{error}</div>}

            <div className="flex gap-2">
              <button onClick={() => setShowPaymentModal(false)} disabled={paying} className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl">Fermer</button>
              <button onClick={processPayment} disabled={paying || (paymentMethod === 'balance' && (profile?.balance || 0) < budget)} className="flex-1 py-3.5 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 shadow-md">
                {paying ? 'Traitement…' : paymentMethod === 'balance' ? 'Confirmer' : 'Payer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
