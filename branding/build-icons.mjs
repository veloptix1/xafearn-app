// Génère tout le branding XAFEARN (icône Android, splash, logo, favicon) en PNG.
// Usage :  node branding/build-icons.mjs   (puis: npx @capacitor/assets generate --android)
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const OUT_ASSETS = 'assets'
const OUT_PUBLIC = 'public'
fs.mkdirSync(OUT_ASSETS, { recursive: true })
fs.mkdirSync('branding', { recursive: true })

const defs = `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#38bdf8"/><stop offset="0.5" stop-color="#0284c7"/><stop offset="1" stop-color="#1e3a8a"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.2" cy="0.12" r="0.8">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="gw" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9f0ff"/>
  </linearGradient>
  <linearGradient id="gg" x1="0" y1="1" x2="1" y2="0">
    <stop offset="0" stop-color="#fcd34d"/><stop offset="1" stop-color="#f59e0b"/>
  </linearGradient>
  <filter id="sh" x="-25%" y="-25%" width="150%" height="150%">
    <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#001a4d" flood-opacity="0.38"/>
  </filter>
  <mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
    <rect width="1024" height="1024" fill="#fff"/>
    <line x1="292" y1="732" x2="716" y2="308" stroke="#000" stroke-width="150" stroke-linecap="round"/>
  </mask>
</defs>`

// Le X + flèche dorée (centré dans la zone sûre des icônes adaptatives)
const mark = `
<g transform="translate(-18 18)" filter="url(#sh)">
  <line x1="268" y1="268" x2="756" y2="756" stroke="url(#gw)" stroke-width="124" stroke-linecap="round" mask="url(#cut)"/>
  <line x1="292" y1="732" x2="716" y2="308" stroke="url(#gg)" stroke-width="124" stroke-linecap="round"/>
  <path d="M640 214 H810 V384 Z" fill="url(#gg)" stroke="url(#gg)" stroke-width="40" stroke-linejoin="round"/>
</g>`

const svg = (inner, size = 1024, viewBox = '0 0 1024 1024') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">${defs}${inner}</svg>`

const bgRect = `<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#glow)"/>`

const files = {
  'icon-full': svg(bgRect + mark),
  'icon-foreground': svg(mark),
  'icon-background': svg(bgRect),
}
for (const [n, s] of Object.entries(files)) fs.writeFileSync(`branding/${n}.svg`, s)

const png = (s, out, size) => sharp(Buffer.from(s), { density: 300 }).resize(size, size).png().toFile(out)

await png(files['icon-full'], `${OUT_ASSETS}/icon-only.png`, 1024)
await png(files['icon-foreground'], `${OUT_ASSETS}/icon-foreground.png`, 1024)
await png(files['icon-background'], `${OUT_ASSETS}/icon-background.png`, 1024)

// Icônes web / PWA
await png(files['icon-full'], `${OUT_PUBLIC}/icon-512.png`, 512)
await png(files['icon-full'], `${OUT_PUBLIC}/icon-192.png`, 192)
await png(files['icon-full'], `${OUT_PUBLIC}/apple-touch-icon.png`, 180)

// Écran de démarrage 2732x2732
const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
<defs>
  <linearGradient id="sbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0c4a8a"/><stop offset="1" stop-color="#0a1b3f"/></linearGradient>
  <radialGradient id="sglow" cx="0.5" cy="0.38" r="0.5"><stop offset="0" stop-color="#38bdf8" stop-opacity="0.35"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></radialGradient>
</defs>
<rect width="2732" height="2732" fill="url(#sbg)"/><rect width="2732" height="2732" fill="url(#sglow)"/>
<g transform="translate(886 760) scale(0.94)"><svg width="1024" height="1024" viewBox="0 0 1024 1024" overflow="visible">${defs}
<rect width="1024" height="1024" rx="230" fill="url(#bg)"/><rect width="1024" height="1024" rx="230" fill="url(#glow)"/>${mark}</svg></g>
<text x="1366" y="1960" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="190" letter-spacing="14" fill="#ffffff">XAF<tspan fill="#38bdf8">EARN</tspan></text>
<text x="1366" y="2105" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="78" fill="#bfe4fb">Gagne de l'argent en ligne</text>
</svg>`
fs.writeFileSync('branding/splash.svg', splashSvg)
await sharp(Buffer.from(splashSvg), { density: 72 }).png().toFile(`${OUT_ASSETS}/splash.png`)

// Logo horizontal (pages d'accueil, connexion, en-têtes) — fond transparent, léger
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="600" viewBox="0 0 2400 600">
<defs></defs>
<g transform="translate(0 0) scale(0.5859)"><svg width="1024" height="1024" viewBox="0 0 1024 1024" overflow="visible">${defs}
<rect width="1024" height="1024" rx="230" fill="url(#bg)"/><rect width="1024" height="1024" rx="230" fill="url(#glow)"/>${mark}</svg></g>
<text x="680" y="430" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" font-size="330" letter-spacing="6" fill="#0b2a5b">XAF<tspan fill="#0ea5e9">EARN</tspan></text>
</svg>`
fs.writeFileSync('branding/logo-horizontal.svg', logoSvg)
await sharp(Buffer.from(logoSvg), { density: 144 }).trim().resize({ height: 160 }).png({ compressionLevel: 9 }).toFile(`${OUT_PUBLIC}/logo.png`)
console.log('Branding généré ✔')
