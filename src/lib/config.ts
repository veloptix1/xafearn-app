// Adresse publique du site XAFEARN (liens de partage, parrainage, paiement externe).
// Pour la changer sans toucher au code : définir NEXT_PUBLIC_SITE_URL au moment du build.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://getagriculture.store').replace(/\/$/, '')
