// Renders public/icon.svg into the PNG sizes the PWA manifest needs.
// Run: NODE_PATH=$(npm root -g) node scripts/make-icons.mjs  (uses the Playwright Chromium already on the machine)
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

// require() honours NODE_PATH, so a globally installed Playwright works too.
const { chromium } = createRequire(import.meta.url)('playwright')

const svg = await readFile(new URL('../public/icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage()
const jobs = [
  ['pwa-192.png', 192, 0],
  ['pwa-512.png', 512, 0],
  ['apple-touch-icon.png', 180, 0],
  ['pwa-maskable-512.png', 512, 0.1], // extra padding so Android's mask never cuts the flame
]
for (const [name, size, pad] of jobs) {
  await page.setViewportSize({ width: size, height: size })
  const inner = Math.round(size * (1 - pad * 2))
  await page.setContent(
    `<body style="margin:0;background:#1d1a1c;display:grid;place-items:center;width:${size}px;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body>`,
  )
  await page.screenshot({ path: new URL(`../public/${name}`, import.meta.url).pathname, omitBackground: false })
}
await browser.close()
console.log('icons written')
