// Génère l'icône de notification Android (silhouette blanche sur fond transparent).
import sharp from 'sharp'
import fs from 'node:fs'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="192 192 640 640">
<defs><mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
<rect width="1024" height="1024" fill="#fff"/>
<line x1="292" y1="732" x2="716" y2="308" stroke="#000" stroke-width="150" stroke-linecap="round"/></mask></defs>
<g transform="translate(-18 18)" fill="none" stroke="#fff" stroke-linecap="round">
<line x1="268" y1="268" x2="756" y2="756" stroke-width="124" mask="url(#cut)"/>
<line x1="292" y1="732" x2="716" y2="308" stroke-width="124"/>
<path d="M640 214 H810 V384 Z" fill="#fff" stroke-width="40" stroke-linejoin="round"/></g></svg>`
const sizes = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 }
for (const [d, px] of Object.entries(sizes)) {
  const dir = `android/app/src/main/res/drawable-${d}`
  fs.mkdirSync(dir, { recursive: true })
  await sharp(Buffer.from(svg), { density: 300 }).resize(px, px).png().toFile(`${dir}/ic_notification.png`)
}
console.log('Icône de notification générée ✔')
