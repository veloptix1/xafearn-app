'use client'

import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { Share } from '@capacitor/share'
import { createClient } from '@/lib/supabase/client'
import { SITE_URL } from '@/lib/config'

type Campaign = { id: string; title: string; description: string | null; price: number | string | null; image_url: string | null }
type Submission = {
  id: string
  status: string
  tracking_id?: string | null
  proof_video_url?: string | null
} | null
type ToastState = { message: string; type: 'success' | 'error' | 'warning' } | null

const newTrackingId = () => Math.random().toString(36).substring(2, 10)

/**
 * Parcours de diffusion d'une annonce (identique au site) :
 *  1. L'utilisateur publie sur son statut WhatsApp  → « J'ai publié »
 *  2. Au bout de 18 h il envoie une vidéo de preuve
 *  3. L'équipe valide → les vues sont payées
 * Le lien partagé pointe vers le site (et non vers l'app) et est propre à l'utilisateur,
 * pour que les clics lui soient attribués.
 */
export default function DiffusionModal({ campaign, userId, submission }: { campaign: Campaign; userId: string; submission?: Submission }) {
  const [supabase] = useState(() => createClient())
  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [step, setStep] = useState<'details' | 'upload'>('details')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [localSubmission, setLocalSubmission] = useState<Submission>(submission ?? null)
  const [trackingId] = useState(() => submission?.tracking_id || newTrackingId())

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Garde l'état à jour (l'équipe peut avoir fait avancer la soumission)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('ad_submissions').select('*').eq('campaign_id', campaign.id).eq('user_id', userId).maybeSingle()
      if (!cancelled) setLocalSubmission((data as Submission) ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [campaign.id, userId, submission, supabase])

  const link = `${SITE_URL}/track/${localSubmission?.tracking_id || trackingId}`
  const message = `${campaign.title}\n\n${campaign.description ?? ''}\n\nPrix: ${campaign.price} F\n\n👉 En savoir plus: ${link}`

  const downloadImage = async () => {
    if (!campaign.image_url) return showToast("Pas d'image pour cette annonce.", 'warning')
    try {
      if (Capacitor.isNativePlatform()) {
        // Sur le téléphone : on ouvre l'image, il suffit de l'enregistrer en appuyant longuement dessus
        await Browser.open({ url: campaign.image_url })
        showToast("Maintiens ton doigt sur l'image pour l'enregistrer.", 'success')
        return
      }
      const blob = await (await fetch(campaign.image_url)).blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'annonce.jpg'
      a.click()
      window.URL.revokeObjectURL(url)
      showToast('Image téléchargée !', 'success')
    } catch {
      showToast("Impossible de récupérer l'image.", 'error')
    }
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(message)
      showToast('Texte copié !', 'success')
    } catch {
      showToast('Copie impossible. Sélectionne le texte à la main.', 'error')
    }
  }

  const shareText = async () => {
    try {
      await Share.share({ title: campaign.title, text: message, dialogTitle: 'Partager mon annonce' })
    } catch {
      // fenêtre de partage fermée : rien à faire
    }
  }

  // ÉTAPE 1 : « J'ai publié »
  const handlePublishedClick = async () => {
    const { data, error } = await supabase
      .from('ad_submissions')
      .insert({ campaign_id: campaign.id, user_id: userId, tracking_id: trackingId, status: 'en_attente_proof' })
      .select()
      .single()
    if (error) return showToast('Enregistrement impossible. Réessaie dans un instant.', 'error')
    setLocalSubmission(data as Submission)
    setIsOpen(false)
    showToast('Publication enregistrée ! Envoie ta preuve dans 18 h.', 'success')
  }

  const handleOpenUpload = () => {
    setStep('upload')
    setIsOpen(true)
    setVideoFile(null)
    setConfirmed(false)
  }

  // ÉTAPE 3 : envoi de la preuve
  const handleUploadProof = async () => {
    if (!localSubmission) return
    if (!confirmed) return showToast('Tu dois confirmer que ton statut a au moins 18h.', 'warning')
    if (!videoFile) return showToast('Sélectionne une vidéo.', 'warning')
    if (videoFile.size > 50 * 1024 * 1024) return showToast('Max 50 MB.', 'error')
    if (!videoFile.type.startsWith('video/')) return showToast('Doit être une vidéo.', 'error')

    setUploading(true)
    try {
      const fileName = `proof-${userId}-${Date.now()}.mp4`
      const { error: uploadError } = await supabase.storage.from('proof-videos').upload(fileName, videoFile, { contentType: videoFile.type })
      if (uploadError) throw uploadError
      const {
        data: { publicUrl },
      } = supabase.storage.from('proof-videos').getPublicUrl(fileName)

      const { data, error } = await supabase
        .from('ad_submissions')
        .update({ proof_video_url: publicUrl, proof_type: 'video', status: 'pending' })
        .eq('id', localSubmission.id)
        .select()
        .single()
      if (error) throw error

      setLocalSubmission(data as Submission)
      setIsOpen(false)
      showToast('Preuve envoyée ! En attente de validation.', 'success')
    } catch {
      showToast("L'envoi a échoué. Vérifie ta connexion et réessaie.", 'error')
    } finally {
      setUploading(false)
    }
  }

  const state = !localSubmission
    ? 'not_published'
    : localSubmission.status === 'validated'
      ? 'validated'
      : localSubmission.status === 'rejected'
        ? 'rejected'
        : localSubmission.status === 'en_attente_proof'
          ? 'ready_to_prove'
          : localSubmission.proof_video_url
            ? 'pending'
            : 'ready_to_prove'

  const toastBanner = toast && (
    <div
      role="alert"
      className={`fixed left-3 right-3 z-[300] px-4 py-3 rounded-xl shadow-lg text-white text-sm font-bold ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}
      style={{ top: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
    >
      {toast.message}
    </div>
  )

  if (state === 'validated') {
    return <div className="w-full py-3 text-sm font-bold rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex justify-center items-center gap-2">✅ Validé &amp; Payé</div>
  }

  if (state === 'pending') {
    return (
      <>
        {toastBanner}
        <div className="w-full py-3 text-sm font-bold rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex justify-center items-center gap-2">⏳ En attente de validation</div>
      </>
    )
  }

  if (state === 'rejected' || state === 'ready_to_prove') {
    const rejected = state === 'rejected'
    return (
      <>
        {toastBanner}
        <button onClick={handleOpenUpload} className={`w-full py-3 text-sm font-bold rounded-xl text-white active:scale-95 transition shadow-md ${rejected ? 'bg-red-500' : 'bg-sky-500'}`}>
          {rejected ? '🔄 Preuve rejetée - Recommencer' : '🎥 Vérifier & Envoyer ma preuve'}
        </button>
        {isOpen && step === 'upload' && (
          <UploadModal
            title={rejected ? 'Nouvelle preuve' : 'Envoyer ma preuve'}
            description={rejected ? 'Ta preuve précédente a été rejetée. Envoie une nouvelle vidéo.' : 'Assure-toi que ton statut a été publié il y a au moins 18 heures.'}
            confirmed={confirmed}
            setConfirmed={setConfirmed}
            videoFile={videoFile}
            setVideoFile={setVideoFile}
            uploading={uploading}
            onClose={() => setIsOpen(false)}
            onSubmit={handleUploadProof}
            buttonText={rejected ? 'Envoyer ma nouvelle preuve' : 'Envoyer ma preuve'}
          />
        )}
      </>
    )
  }

  // Pas encore publié
  return (
    <>
      {toastBanner}
      <button
        onClick={() => {
          setIsOpen(true)
          setStep('details')
        }}
        className="w-full py-3 text-sm font-bold rounded-xl bg-slate-900 text-white active:scale-95 transition"
      >
        📢 Diffuser cette annonce
      </button>

      {isOpen && step === 'details' && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90dvh] overflow-y-auto" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Publier cette annonce</h2>
              <button onClick={() => setIsOpen(false)} aria-label="Fermer" className="w-9 h-9 bg-slate-100 rounded-full text-slate-500 flex items-center justify-center">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-900 mb-2">1. Récupère l&apos;image</p>
                <button onClick={downloadImage} className="w-full py-3 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl active:bg-slate-200 transition">Télécharger l&apos;image</button>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-900 mb-2">2. Copie le texte</p>
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600 whitespace-pre-wrap break-words font-mono mb-2 max-h-40 overflow-y-auto">{message}</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={copyText} className="py-3 bg-sky-50 text-sky-600 font-semibold text-sm rounded-xl active:bg-sky-100 transition">Copier le texte</button>
                  <button onClick={shareText} className="py-3 bg-emerald-50 text-emerald-600 font-semibold text-sm rounded-xl active:bg-emerald-100 transition">Partager…</button>
                </div>
              </div>

              <button onClick={handlePublishedClick} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 transition shadow-md">J&apos;ai publié sur mon statut</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

type UploadModalProps = {
  title: string
  description: string
  confirmed: boolean
  setConfirmed: (v: boolean) => void
  videoFile: File | null
  setVideoFile: (f: File | null) => void
  uploading: boolean
  onClose: () => void
  onSubmit: () => void
  buttonText: string
}

function UploadModal({ title, description, confirmed, setConfirmed, videoFile, setVideoFile, uploading, onClose, onSubmit, buttonText }: UploadModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4" onClick={() => !uploading && onClose()}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90dvh] overflow-y-auto" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} disabled={uploading} aria-label="Fermer" className="w-9 h-9 bg-slate-100 rounded-full text-slate-500 flex items-center justify-center">✕</button>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4">
          <p className="text-xs text-blue-700 leading-relaxed">{description}</p>
        </div>

        <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer mb-4">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 w-5 h-5 accent-amber-500 rounded shrink-0" />
          <span className="text-xs text-amber-900 leading-relaxed font-medium">
            Je valide que j&apos;ai posté mon statut <strong>il y a au moins 18h</strong>.
          </span>
        </label>

        <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center relative mb-4">
          <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          {videoFile ? (
            <div>
              <p className="text-sm text-emerald-600 font-bold">Vidéo prête</p>
              <p className="text-[10px] text-slate-400 mt-1">{Math.round(videoFile.size / 1024 / 1024)} MB</p>
            </div>
          ) : (
            <div>
              <p className="text-3xl mb-1">🎥</p>
              <p className="text-sm text-slate-500">Ajouter une vidéo (max 50 MB)</p>
            </div>
          )}
        </div>

        <button onClick={onSubmit} disabled={uploading || !confirmed || !videoFile} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 active:scale-95 transition">
          {uploading ? 'Envoi en cours…' : buttonText}
        </button>
      </div>
    </div>
  )
}
