// End-to-end smoke test against a REAL Jellyfin server.
// Usage:
//   npm run build && npm run preview          (in one terminal)
//   JF_URL=http://localhost:8096 JF_USER=me JF_PASS=secret npm run e2e
// Optional: APP_URL (default http://localhost:4173), MOVIE (title to play, default "Ember Test"),
//           TRANSCODE_MOVIE (a title the browser can't play directly, e.g. an MPEG-4 Part 2 .mkv).
import { createRequire } from 'node:module'

const { chromium } = createRequire(import.meta.url)('playwright')

const APP = process.env.APP_URL ?? 'http://localhost:4173'
const { JF_URL, JF_USER, JF_PASS = '' } = process.env
const MOVIE = process.env.MOVIE ?? 'Ember Test'
const TRANSCODE_MOVIE = process.env.TRANSCODE_MOVIE
// Jellyfin only saves a resume point after 5% of a video longer than 5 minutes (server defaults).
const PLAY_SECONDS = Number(process.env.PLAY_SECONDS ?? 35)
if (!JF_URL || !JF_USER) throw new Error('Set JF_URL and JF_USER (and JF_PASS) first.')

const results = []
const check = (name, ok, extra = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const progressCalls = []
page.on('request', (r) => {
  if (r.url().includes('/Sessions/Playing')) progressCalls.push(new URL(r.url()).pathname)
})

async function playAndWait(title, seconds) {
  await page.getByRole('searchbox').fill(title)
  await page.getByRole('searchbox').press('Enter')
  await page.getByRole('link', { name: new RegExp(title) }).first().click()
  // Always start from 0 so the run doesn't depend on what an earlier run saved.
  await page.getByRole('link', { name: /^(▶ Play|Start over)$/ }).first().click()
  await page.waitForFunction((s) => (document.querySelector('video')?.currentTime ?? 0) > s, seconds, { timeout: 30_000 + seconds * 2000 })
  return page.evaluate(() => ({ t: document.querySelector('video').currentTime, src: document.querySelector('video').currentSrc }))
}

try {
  // 1. App shell + PWA
  await page.goto(APP)
  await page.getByRole('heading', { name: 'Hearthreel' }).waitFor()
  check('app loads and shows connect screen', true)
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector('link[rel="manifest"]')?.getAttribute('href')
    return href ? (await fetch(href)).json() : null
  })
  check('manifest is valid', manifest?.name === 'Hearthreel' && manifest.icons?.length >= 2 && manifest.display === 'standalone')
  const sw = await page.evaluate(async () => {
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 10_000))])
    return Boolean(reg?.active)
  })
  check('service worker registers', sw)

  // 2. Log in
  await page.getByLabel('Server address').fill(JF_URL)
  await page.getByLabel('Username').fill(JF_USER)
  await page.getByLabel('Password').fill(JF_PASS)
  await page.getByRole('button', { name: 'Connect' }).click()
  await page.getByRole('heading', { name: 'Libraries' }).waitFor({ timeout: 15_000 })
  check('log in', true)

  // 3. Browse
  await page.locator('.lib').first().waitFor()
  const libs = await page.locator('.lib').allInnerTexts()
  check('libraries listed', libs.length > 0, libs.join(', '))
  await page.locator('.lib').first().click()
  await page.locator('.card').first().waitFor()
  check('library opens with items', (await page.locator('.card').count()) > 0)

  // 4. Search
  await page.getByRole('searchbox').fill(MOVIE)
  await page.getByRole('searchbox').press('Enter')
  await page.getByRole('heading', { name: new RegExp(`Results for`) }).waitFor()
  await page.getByRole('link', { name: new RegExp(MOVIE) }).first().waitFor()
  check('search finds the movie', true)

  // 5. Play (direct) long enough for progress reports and a resume point
  const played = await playAndWait(MOVIE, PLAY_SECONDS)
  check('video plays', played.t > PLAY_SECONDS, `${played.t.toFixed(1)}s, ${played.src.includes('/stream?static=true') ? 'direct play' : 'converted'}`)
  check('progress reported to server', progressCalls.includes('/Sessions/Playing') && progressCalls.includes('/Sessions/Playing/Progress'))
  await page.getByRole('button', { name: '← Back' }).click()
  await page.waitForTimeout(1500)
  check('stop reported to server', progressCalls.includes('/Sessions/Playing/Stopped'))

  // 6. Resume
  await page.reload()
  const resume = page.getByRole('link', { name: /Resume from/ })
  await resume.waitFor({ timeout: 10_000 })
  check('resume button shows saved position', true, await resume.innerText())
  await resume.click()
  await page.waitForFunction((s) => (document.querySelector('video')?.currentTime ?? 0) > s - 12, PLAY_SECONDS, { timeout: 30_000 })
  const resumedAt = await page.evaluate(() => document.querySelector('video').currentTime)
  check('resume starts near saved position', resumedAt > PLAY_SECONDS - 12, `${resumedAt.toFixed(1)}s`)
  await page.getByRole('button', { name: '← Back' }).click()

  // 7. Server-side check: position saved in Jellyfin itself
  const authBase = 'MediaBrowser Client="smoke", Device="cli", DeviceId="smoke-test", Version="1"'
  const login = await fetch(`${JF_URL}/Users/AuthenticateByName`, {
    method: 'POST',
    headers: { Authorization: authBase, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ Username: JF_USER, Pw: JF_PASS }),
  }).then((r) => r.json())
  const auth = { Authorization: `${authBase}, Token="${login.AccessToken}"`, Accept: 'application/json' }
  const found = await fetch(`${JF_URL}/Items?userId=${login.User.Id}&recursive=true&searchTerm=${encodeURIComponent(MOVIE)}`, {
    headers: auth,
  }).then((r) => r.json())
  const ticks = found.Items[0]?.UserData?.PlaybackPositionTicks ?? 0
  check('position saved on the server', ticks > 0, `${(ticks / 1e7).toFixed(1)}s`)

  // 8. Optional: a file the browser can't play directly -> server converts it
  if (TRANSCODE_MOVIE) {
    const t = await playAndWait(TRANSCODE_MOVIE, 4)
    check('converted (HLS) playback works', t.t > 4 && !t.src.includes('static=true'), `${t.t.toFixed(1)}s`)
    await page.getByRole('button', { name: '← Back' }).click()
  }

  // 9. Offline shell: app still opens with no network
  await page.context().setOffline(true)
  await page.goto(APP)
  check('app shell opens offline', await page.getByText('Hearthreel').first().isVisible())
  await page.context().setOffline(false)
} catch (e) {
  check('unexpected error', false, e.message)
  await page.screenshot({ path: 'e2e/failure.png' })
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} checks passed`)
process.exit(failed ? 1 : 0)
